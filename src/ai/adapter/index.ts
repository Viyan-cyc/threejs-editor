import type { LLMAdapter } from './LLMAdapter';
import { MockLLMAdapter } from './MockLLMAdapter';
import { GlmAdapter } from './GlmAdapter';
import type { GlmConfig } from './GlmAdapter';

export * from './LLMAdapter';
export * from './MockLLMAdapter';
export * from './ClaudeAdapter';
export * from './GlmAdapter';
export * from './extractJson';

/**
 * 按 appConfig.llm 选择适配器。
 * - 'glm'：真实智谱 GLM（需 vite proxy + VITE_GLM_API_KEY）。
 * - 'mock'：规则化离线示例，无需任何外部依赖。
 */
export function createLLMAdapter(cfg: { adapter: 'mock' | 'glm'; glm: GlmConfig }): LLMAdapter {
  return cfg.adapter === 'glm' ? new GlmAdapter(cfg.glm) : new MockLLMAdapter();
}
