import * as THREE from 'three';
import type { SceneObjectDSL } from '../../../core/dsl/types';
import type { EditorContext } from '../../../core/registry/EditorContext';
import type { ObjectBuilder } from '../../../core/registry/types';
import { box, cylinder, cone } from '../../../three/utils/lowPoly';

/**
 * PowerStationBuilder —— 升压站 builder。
 * 程序化拼装：混凝土底座 + 双变压器(含瓷绝缘子) + 控制柜 + 避雷针。
 */
export class PowerStationBuilder implements ObjectBuilder {
  readonly type = 'power-station';

  async build(_node: SceneObjectDSL, _ctx: EditorContext): Promise<THREE.Object3D> {
    const group = new THREE.Group();
    group.name = 'power-station';

    const baseTop = 0.15; // 底座顶面 y（底座高 0.3，中心 y=0）

    // 混凝土底座
    const base = box({ w: 4, h: 0.3, d: 3, color: 0xb8b2a4, roughness: 0.9, metalness: 0 });
    group.add(base);

    // 变压器 + 瓷绝缘子 ×2（左右各一组）
    for (const x of [-1.1, 1.1]) {
      const tank = cylinder({
        radiusTop: 0.5,
        radiusBottom: 0.5,
        height: 1.2,
        color: 0x6a737d,
        segments: 8,
        roughness: 0.5,
        metalness: 0.5,
      });
      tank.position.set(x, baseTop + 0.6, -0.4);
      group.add(tank);

      const insulator = cylinder({
        radiusTop: 0.08,
        radiusBottom: 0.12,
        height: 0.5,
        color: 0xe8e4dc,
        segments: 8,
        roughness: 0.4,
      });
      insulator.position.set(x, baseTop + 1.2 + 0.25, -0.4);
      group.add(insulator);
    }

    // 控制柜（前方）
    const cabinet = box({ w: 1.2, h: 1.8, d: 0.8, color: 0x4a5560, roughness: 0.5, metalness: 0.4 });
    cabinet.position.set(0, baseTop + 0.9, 0.9);
    group.add(cabinet);

    // 避雷针（后排中央）：细长杆 + 顶端锥
    const pole = cylinder({
      radiusTop: 0.03,
      radiusBottom: 0.05,
      height: 2.4,
      color: 0x2a3038,
      segments: 6,
      roughness: 0.5,
      metalness: 0.6,
    });
    pole.position.set(0, baseTop + 1.2, -1.2);
    group.add(pole);

    const tip = cone({ radius: 0.08, height: 0.25, color: 0x2a3038, segments: 6, metalness: 0.6 });
    tip.position.set(0, baseTop + 2.4 + 0.125, -1.2);
    group.add(tip);

    return group;
  }
}
