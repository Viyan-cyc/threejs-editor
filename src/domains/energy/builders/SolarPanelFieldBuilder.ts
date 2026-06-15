import * as THREE from 'three';
import type { SceneObjectDSL } from '../../../core/dsl/types';
import type { EditorContext } from '../../../core/registry/EditorContext';
import type { ObjectBuilder } from '../../../core/registry/types';

/** 光伏阵列 builder 参数。 */
interface SolarPanelArrayParams {
  rows?: number;
  cols?: number;
  tilt?: number;
  spacing?: number;
}

/**
 * SolarPanelFieldBuilder —— 参考实现。
 *
 * 通过 ModelFactory 加载单个光伏组件资产（缺资产时为占位盒体），
 * 再按 rows×cols 网格化克隆排布并施加倾角。
 * 演示「公共能力（资产加载）+ 领域专属逻辑（阵列排布）」的组合方式。
 */
export class SolarPanelFieldBuilder implements ObjectBuilder {
  readonly type = 'solar-panel-array';

  async build(node: SceneObjectDSL, ctx: EditorContext): Promise<THREE.Object3D> {
    const params = (node.params ?? {}) as SolarPanelArrayParams;
    const rows = params.rows ?? 5;
    const cols = params.cols ?? 5;
    const spacing = params.spacing ?? 2.4;
    const tilt = THREE.MathUtils.degToRad(-(params.tilt ?? 30));

    const template = await ctx.modelFactory.load('energy/solar-panel');
    const group = new THREE.Group();
    group.name = 'solar-panel-array';

    const offsetX = ((cols - 1) * spacing) / 2;
    const offsetZ = ((rows - 1) * spacing) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const panel = template.clone(true);
        panel.position.set(c * spacing - offsetX, 0, r * spacing - offsetZ);
        panel.rotation.x = tilt;
        group.add(panel);
      }
    }
    return group;
  }
}
