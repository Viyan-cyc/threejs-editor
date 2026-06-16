import type { ObjectBuilder } from '../../core/registry/types';

/**
 * makeAssetBuilder —— 快速构造一个「纯资产加载」型 builder。
 *
 * 适用于那些不需要复杂程序化逻辑、只需从资产库取模型的对象类型。
 * 复杂对象（如光伏阵列需要阵列化排布）请写成独立 builder 类（参考 SolarPanelFieldBuilder）。
 */
export function makeAssetBuilder(
  type: string,
  assetKey: string,
  opts: { scale?: number } = {},
): ObjectBuilder {
  return {
    type,
    async build(_node, ctx) {
      const obj = await ctx.modelFactory.load(assetKey);
      obj.name = `asset:${assetKey}`;
      if (opts.scale) obj.scale.setScalar(opts.scale);
      return obj;
    },
  };
}
