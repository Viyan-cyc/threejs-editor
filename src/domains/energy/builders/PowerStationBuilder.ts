import type { SceneObjectDSL } from '../../../core/dsl/types';
import type { EditorContext } from '../../../core/registry/EditorContext';
import type { ObjectBuilder } from '../../../core/registry/types';

/**
 * PowerStationBuilder —— 升压站 builder。
 * 简单委托给 ModelFactory 加载资产（缺资产时为占位盒体）。
 */
export class PowerStationBuilder implements ObjectBuilder {
  readonly type = 'power-station';

  async build(_node: SceneObjectDSL, ctx: EditorContext) {
    return ctx.modelFactory.load('energy/power-station');
  }
}
