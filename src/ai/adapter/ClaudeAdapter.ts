import type { SceneDSL } from '../../core/dsl/types';
import type { GenerateOptions, GenerationPrompt } from '../types';
import type { LLMAdapter } from './LLMAdapter';

/**
 * ClaudeAdapter —— 接入 Claude（Anthropic）API 的占位实现。
 *
 * TODO（接入时）：
 *  1. 用 @anthropic-ai/sdk 或 fetch 调 messages 接口；
 *  2. 通过 tool-use / 强约束 JSON，要求模型产出 SceneDSL；
 *  3. 解析后做 schema 校验（dsl/schema.ts，待补），失败则重试或降级到 Mock。
 *  4. 鉴权信息放 app.config.ts / 环境变量，勿硬编码。
 *
 * 当前直接抛错，避免被误用为「可用」实现。
 */
export class ClaudeAdapter implements LLMAdapter {
  readonly id = 'claude';

  constructor(private readonly _config: { apiKey?: string; model?: string } = {}) {}

  async generateScene(_prompt: GenerationPrompt, _opts?: GenerateOptions): Promise<SceneDSL> {
    throw new Error(
      'ClaudeAdapter 尚未实现：请补全 Claude API 调用与 SceneDSL 解析逻辑后启用。' +
        '在此之前，EditorEngine 默认使用 MockLLMAdapter。',
    );
  }
}
