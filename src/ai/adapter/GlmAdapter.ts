import type { SceneDSL } from '../../core/dsl/types';
import type { GenerateOptions, GenerationPrompt } from '../types';
import type { LLMAdapter } from './LLMAdapter';
import { parseSceneDSL } from './extractJson';

/** 智谱 GLM 适配器配置。endpoint 应指向 vite proxy 同源路径以绕过 CORS。 */
export interface GlmConfig {
  /** chat/completions 端点；dev 下走 vite proxy（如 '/llm/api/paas/v4/chat/completions'） */
  endpoint: string;
  /** API Key（经 VITE_GLM_API_KEY 注入）。未配置时构造即抛错。 */
  apiKey: string;
  /** 模型 ID，默认 glm-4.6；可经 VITE_GLM_MODEL 覆盖 */
  model: string;
  /** 采样温度，默认 0.6 */
  temperature?: number;
}

/** GLM 响应中我们关心的子集。 */
interface GlmChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * GlmAdapter —— 接入智谱 GLM（BigModel）OpenAI 兼容协议。
 *
 * - 通过 fetch 调 chat/completions（endpoint 须走 vite proxy 同源转发，否则浏览器 CORS 拦截）；
 * - 取 choices[0].message.content，用 parseSceneDSL 容错解析为 SceneDSL；
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

  async generateScene(prompt: GenerationPrompt, opts?: GenerateOptions): Promise<SceneDSL> {
    const res = await fetch(this.cfg.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: opts?.model ?? this.cfg.model,
        temperature: this.cfg.temperature ?? 0.6,
        stream: false,
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

    const data = (await res.json()) as GlmChatResponse;
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('GLM 返回为空（无 choices[0].message.content）。');
    }
    return parseSceneDSL(content);
  }
}
