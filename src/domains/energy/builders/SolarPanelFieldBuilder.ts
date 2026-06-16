import * as THREE from 'three';
import type { SceneObjectDSL } from '../../../core/dsl/types';
import type { EditorContext } from '../../../core/registry/EditorContext';
import type { ObjectBuilder } from '../../../core/registry/types';
import { box, cylinder } from '../../../three/utils/lowPoly';

/** 光伏阵列 builder 参数。 */
interface SolarPanelArrayParams {
  rows?: number;
  cols?: number;
  tilt?: number;
  spacing?: number;
}

/** 构建单块光伏组件（板面 + 边框 + 支架），返回一个 Group 模板供阵列克隆。 */
function createSolarPanel(): THREE.Group {
  const panel = new THREE.Group();

  // 板面：深蓝玻璃，微反光
  const surface = box({ w: 1.6, h: 0.06, d: 1.0, color: 0x14233f, roughness: 0.25, metalness: 0.55 });
  surface.position.y = 0.9;
  panel.add(surface);

  // 边框：略大的薄扁盒子，贴在板面下方
  const frame = box({ w: 1.66, h: 0.05, d: 1.06, color: 0x3a4a5a, roughness: 0.6, metalness: 0.3 });
  frame.position.y = 0.86;
  panel.add(frame);

  // 支架杆：从底座斜撑到板面前缘
  const leg = cylinder({
    radiusTop: 0.04,
    radiusBottom: 0.05,
    height: 0.9,
    color: 0x8a94a0,
    segments: 6,
    roughness: 0.6,
    metalness: 0.3,
  });
  leg.position.set(0, 0.45, 0.3);
  leg.rotation.x = THREE.MathUtils.degToRad(15);
  panel.add(leg);

  // 底座小盒
  const base = box({ w: 0.3, h: 0.08, d: 0.5, color: 0x6a737d, roughness: 0.7 });
  base.position.set(0, 0.04, 0.35);
  panel.add(base);

  return panel;
}

/**
 * SolarPanelFieldBuilder —— 参考实现。
 *
 * 程序化构建单块光伏组件（低模），再按 rows×cols 网格化克隆排布并施加倾角。
 * 演示「公共能力 + 领域专属逻辑（阵列排布）」的组合方式。
 */
export class SolarPanelFieldBuilder implements ObjectBuilder {
  readonly type = 'solar-panel-array';

  async build(node: SceneObjectDSL, _ctx: EditorContext): Promise<THREE.Object3D> {
    const params = (node.params ?? {}) as SolarPanelArrayParams;
    const rows = params.rows ?? 5;
    const cols = params.cols ?? 5;
    const spacing = params.spacing ?? 2.4;
    const tilt = THREE.MathUtils.degToRad(-(params.tilt ?? 30));

    const template = createSolarPanel();
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
