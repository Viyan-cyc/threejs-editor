import * as THREE from 'three';
import type { SceneObjectDSL } from '../../../core/dsl/types';
import type { EditorContext } from '../../../core/registry/EditorContext';
import type { ObjectBuilder } from '../../../core/registry/types';
import { box } from '../../../three/utils/lowPoly';

/**
 * EnergyReservoirBuilder —— 储能箱（储能柜）builder。
 * 程序化拼装：混凝土底座 + 主柜体 + 双开门中缝 + 顶盖 + 指示灯。
 * 原点在底座中心（与 PowerStationBuilder 一致），上层用 transform.position 落位。
 */
export class EnergyReservoirBuilder implements ObjectBuilder {
  readonly type = 'energy-reservoir';

  async build(node: SceneObjectDSL, _ctx: EditorContext): Promise<THREE.Object3D> {
    const group = new THREE.Group();
    group.name = 'energy-reservoir';

    const colorParam = node.params?.color;
    const bodyColor =
      typeof colorParam === 'string' || typeof colorParam === 'number' ? colorParam : 0x4a5560;

    const baseH = 0.2;
    const bodyH = 2.0;
    const baseTop = baseH / 2; // 底座顶面 y（底座中心在原点）
    const frontZ = 0.4 + 0.01; // 柜体前面 z=0.4，细节略外凸

    // 混凝土底座
    const base = box({ w: 1.6, h: baseH, d: 1.0, color: 0xb8b2a4, roughness: 0.9, metalness: 0, name: 'base' });
    group.add(base);

    // 主柜体
    const body = box({ w: 1.4, h: bodyH, d: 0.8, color: bodyColor, roughness: 0.5, metalness: 0.4, name: 'body' });
    body.position.y = baseTop + bodyH / 2;
    group.add(body);

    // 前柜门双开门中缝
    const seam = box({ w: 0.05, h: bodyH * 0.86, d: 0.02, color: 0x2a3038, name: 'seam' });
    seam.position.set(0, baseTop + bodyH / 2, frontZ);
    group.add(seam);

    // 顶盖
    const top = box({ w: 1.5, h: 0.1, d: 0.9, color: 0x3a424c, roughness: 0.5, metalness: 0.5, name: 'top' });
    top.position.y = baseTop + bodyH + 0.05;
    group.add(top);

    // 指示灯（前面板上方：绿 / 红）
    const ledGreen = box({ w: 0.07, h: 0.07, d: 0.04, color: 0x33dd55, name: 'led.green' });
    ledGreen.position.set(-0.22, baseTop + bodyH - 0.25, frontZ + 0.01);
    group.add(ledGreen);
    const ledRed = box({ w: 0.07, h: 0.07, d: 0.04, color: 0xdd3344, name: 'led.red' });
    ledRed.position.set(0.22, baseTop + bodyH - 0.25, frontZ + 0.01);
    group.add(ledRed);

    return group;
  }
}
