import * as THREE from 'three';
import type { ColorDSL, LightDSL } from '../../dsl/types';

/** 公共能力：灯光。把 LightDSL[] 解释成 THREE.Light 并加入场景。 */
export class LightingManager {
  private readonly created: THREE.Light[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  /** 批量应用，返回已创建灯光。 */
  apply(lights: LightDSL[] = []): THREE.Light[] {
    return lights.map((l) => this.add(l));
  }

  add(def: LightDSL): THREE.Light {
    const color = toColor(def.color);
    let light: THREE.Light;

    switch (def.type) {
      case 'ambient':
        light = new THREE.AmbientLight(color, def.intensity ?? 1);
        break;
      case 'hemisphere':
        light = new THREE.HemisphereLight(color, 0xffffff, def.intensity ?? 1);
        break;
      case 'directional': {
        const d = new THREE.DirectionalLight(color, def.intensity ?? 1);
        if (def.target) d.target.position.set(...def.target);
        d.castShadow = def.castShadow ?? false;
        light = d;
        break;
      }
      case 'point':
        light = new THREE.PointLight(color, def.intensity ?? 1, def.distance ?? 0);
        break;
      case 'spot':
        light = new THREE.SpotLight(
          color,
          def.intensity ?? 1,
          def.distance ?? 0,
          def.angle ?? Math.PI / 4,
          def.penumbra ?? 0,
        );
        break;
      default:
        light = new THREE.AmbientLight(color, def.intensity ?? 1);
    }

    if (def.position) light.position.set(...def.position);
    if (def.name) light.name = def.name;
    if (def.castShadow && 'castShadow' in light) light.castShadow = true;

    this.scene.add(light);
    if (light instanceof THREE.DirectionalLight) this.scene.add(light.target);

    this.created.push(light);
    return light;
  }

  /** 移除并释放本管理器创建的所有灯光。 */
  clear(): void {
    for (const light of this.created) {
      this.scene.remove(light);
      if (light instanceof THREE.DirectionalLight) this.scene.remove(light.target);
    }
    this.created.length = 0;
  }
}

/** ColorDSL → THREE.Color。 */
export function toColor(color: ColorDSL = '#ffffff'): THREE.Color {
  if (typeof color === 'string') return new THREE.Color(color);
  return new THREE.Color(color[0], color[1], color[2]);
}
