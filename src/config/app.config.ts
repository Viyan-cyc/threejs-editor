/** 应用级运行时配置。 */
export const appConfig = {
  /** 默认 AI 适配器 id（对应 ai/adapter 下的实现） */
  defaultAdapter: 'mock',
  /** 默认领域 */
  defaultDomain: 'energy' as const,
  /** 渲染相关默认值 */
  render: {
    toneMappingExposure: 1.0,
    shadowMapEnabled: true,
  },
};
