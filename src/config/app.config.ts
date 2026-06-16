import type { GlmConfig } from '../ai/adapter/GlmAdapter';

/** 应用级运行时配置。 */
export const appConfig = {
  /** 默认领域 */
  defaultDomain: 'energy' as const,
  /** AI / LLM 配置 */
  llm: {
    /** 适配器选择：'glm'（智谱 GLM，走 vite proxy）| 'mock'（规则化示例，离线可用） */
    adapter: 'glm' as 'mock' | 'glm',
    /** 智谱 GLM（OpenAI 兼容协议）。API key 经 .env.local 的 VITE_GLM_API_KEY 注入。 */
    glm: {
      // vite proxy 同源路径，见 vite.config.ts 的 server.proxy['/llm']
      endpoint: '/llm/api/coding/paas/v4/chat/completions',
      model: import.meta.env.VITE_GLM_MODEL ?? 'glm-4.6',
      apiKey: import.meta.env.VITE_GLM_API_KEY ?? '',
      temperature: 0.6,
    } satisfies GlmConfig,
  },
  /** 渲染相关默认值 */
  render: {
    toneMappingExposure: 1.0,
    shadowMapEnabled: true,
  },
};
