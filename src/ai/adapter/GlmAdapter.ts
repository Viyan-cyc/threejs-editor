import type { SceneDSL, SceneEditDSL } from '../../core/dsl/types';
import type { GenerateOptions, GenerationPrompt } from '../types';
import type { LLMAdapter } from './LLMAdapter';
import { parseJSONObject } from './extractJson';

/** 智谱 GLM 适配器配置。endpoint 应指向 vite proxy 同源路径以绕过 CORS。 */
export interface GlmConfig {
  /** chat/completions 端点；dev 下走 vite proxy（如 '/llm/api/paas/v4/chat/completions'） */
  endpoint: string;
  /** API Key（经 VITE_GLM_API_KEY 注入）。未配置时构造即抛错。 */
  apiKey: string;
  /** 模型 ID，默认 glm-5.1；可经 VITE_GLM_MODEL 覆盖 */
  model: string;
  /** 采样温度，默认 0.6 */
  temperature?: number;
}

/** GLM 流式响应中单个 SSE 帧的子集。reasoning 双字段容错（reasoning_content / reasoning，部分版本字段名不同）。 */
interface GlmStreamChunk {
  choices?: Array<{ delta?: { content?: string; reasoning_content?: string; reasoning?: string } }>;
}

/**
 * GlmAdapter —— 接入智谱 GLM（BigModel）OpenAI 兼容协议。
 *
 * - 通过 fetch 调 chat/completions（endpoint 须走 vite proxy 同源转发，否则浏览器 CORS 拦截）；
 * - **流式（stream:true）**：消费 SSE，把 delta.reasoning_content 实时经 opts.onReasoning 回调（供 UI 显示「思考过程」），
 *   累积 delta.content 后用 parseJSONObject 容错解析为 SceneDSL；
 * - 鉴权信息由 app.config.ts 经环境变量注入，不硬编码。
 *
 * 失败直接抛错（由 UI 层上报）；需要离线/降级时把 appConfig.llm.adapter 改为 'mock'。
 */
export class GlmAdapter implements LLMAdapter {
  readonly id = 'glm';

  constructor(private readonly cfg: GlmConfig) {
    if (!cfg.apiKey) {
      throw new Error(
        'GLM API Key 未配置：请在 .env.local 设置 VITE_GLM_API_KEY（参考 .env.local.example）。',
      );
    }
  }

  async generateScene(prompt: GenerationPrompt, opts?: GenerateOptions): Promise<SceneDSL | SceneEditDSL> {
    const res = await fetch(this.cfg.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: opts?.model ?? this.cfg.model,
        temperature: this.cfg.temperature ?? 0.6,
        stream: true,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
      }),
      signal: opts?.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`GLM 请求失败 ${res.status}：${detail.slice(0, 200)}`);
    }
    if (!res.body) throw new Error('GLM 流式响应无 body');

    // 消费 SSE 流：reasoning 增量经 onReasoning 实时回调，content 增量累积
    const content = await this.consumeStream(res.body, opts?.onReasoning);
    if (!content.trim()) {
      throw new Error('GLM 流式返回为空（未收到 content）。');
    }
    // create 模式返回完整 SceneDSL；edit 模式可能返回 SceneEditDSL（mode:"edit"）或完整 SceneDSL（重新生成）。
    // 统一用 parseJSONObject 容错解析，由 orchestrator 按 mode 判别。
    return parseJSONObject<SceneDSL | SceneEditDSL>(content);
  }

  /**
   * 消费 GLM SSE 流，按空行（\n\n）分帧：
   * - delta.reasoning_content（容错 reasoning）→ onReasoning 实时回调（UI 思考过程）；
   * - delta.content → 累积，最终返回完整正文供解析为 DSL。
   * 收到 `data: [DONE]` 或流自然结束即停。
   */
  private async consumeStream(
    body: ReadableStream<Uint8Array>,
    onReasoning?: (delta: string) => void,
  ): Promise<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buf = ''; // 跨 chunk 的不完整帧缓冲
    let content = '';

    const drainFrame = (frame: string): boolean => {
      const payload = this.parseSseFrame(frame);
      if (payload == null) return true; // 非 data 帧（注释/心跳），继续
      if (payload === '[DONE]') return false; // 结束
      content += this.extractDelta(payload, onReasoning);
      return true;
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buf.indexOf('\n\n')) !== -1) {
        const frame = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        if (!drainFrame(frame)) return content;
      }
    }
    // flush 解码器残余 + 残余缓冲（部分实现不以 \n\n 收尾）
    buf += decoder.decode();
    if (buf.trim()) drainFrame(buf);
    return content;
  }

  /** 从一帧 SSE 文本里取首个 `data:` 行的负载；无 data 行返回 null，`[DONE]` 原样返回。 */
  private parseSseFrame(frame: string): string | null {
    const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
    if (!dataLine) return null;
    const payload = dataLine.slice(5).trim();
    return payload || null;
  }

  /** 解析单帧 JSON：reasoning 增量回调，content 增量返回；非 JSON 帧（心跳）返回空串。 */
  private extractDelta(payload: string, onReasoning?: (delta: string) => void): string {
    let chunk: GlmStreamChunk;
    try {
      chunk = JSON.parse(payload) as GlmStreamChunk;
    } catch {
      return '';
    }
    const delta = chunk?.choices?.[0]?.delta;
    if (!delta) return '';
    const reasoning = delta.reasoning_content ?? delta.reasoning;
    if (reasoning) onReasoning?.(reasoning);
    return delta.content ?? '';
  }
}
