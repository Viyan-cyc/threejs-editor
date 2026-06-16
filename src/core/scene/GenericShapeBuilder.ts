import * as THREE from 'three';
import type {
  ColorDSL,
  GenericShapeParams,
  GenericShapePart,
  SceneObjectDSL,
  ShapeKind,
} from '../dsl/types';
import type { EditorContext } from '../registry/EditorContext';
import { box, cone, cylinder, sphere } from '../../three/utils/lowPoly';

/** 默认颜色（参数缺失/非法时）。 */
const DEFAULT_COLOR = 0x888888;
/** 默认盒子尺寸。 */
const DEFAULT_BOX: [number, number, number] = [1, 1, 1];

/**
 * GenericShapeBuilder —— 清单外任意 type 的通用几何兜底。
 *
 * 当 SceneBuilder 在领域 builders 中找不到 node.type 时调用：
 * 按 params（GenericShapeParams）用 lowPoly 基本形状拼装简化 low-poly。
 * 支持单体（shape）或组合体（parts）；全程容错（缺省/非法值兜底），保证不崩。
 */
export class GenericShapeBuilder {
  build(node: SceneObjectDSL, _ctx: EditorContext): THREE.Object3D {
    const p = (node.params ?? {}) as GenericShapeParams;
    const group = new THREE.Group();
    group.name = `generic:${node.type}`;

    if (Array.isArray(p.parts) && p.parts.length > 0) {
      for (const part of p.parts) group.add(this.buildPart(part));
    } else {
      group.add(this.buildPart(p));
    }
    return group;
  }

  private buildPart(part: Partial<GenericShapePart>): THREE.Object3D {
    const mesh = this.buildShape(part.shape, part);
    if (part.position) mesh.position.set(part.position[0], part.position[1], part.position[2]);
    if (part.rotation) mesh.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2]);
    return mesh;
  }

  private buildShape(shape: ShapeKind | undefined, part: Partial<GenericShapePart>): THREE.Mesh {
    const color = resolveColor(part.color);
    switch (shape) {
      case 'cylinder':
        return cylinder({
          radiusTop: numOr(part.radius, 0.5),
          radiusBottom: numOr(part.radius, 0.5),
          height: numOr(part.height, 1),
          color,
        });
      case 'sphere':
        return sphere({ radius: numOr(part.radius, 0.5), color });
      case 'cone':
        return cone({ radius: numOr(part.radius, 0.5), height: numOr(part.height, 1), color });
      case 'box':
      default: {
        const [w, h, d] = part.size ?? DEFAULT_BOX;
        return box({ w, h, d, color });
      }
    }
  }
}

/** 取有限数，否则默认值。 */
function numOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** ColorDSL（hex / CSS 颜色名 / [r,g,b]）→ THREE.ColorRepresentation；非法则兜底灰。 */
function resolveColor(color: ColorDSL | undefined): THREE.ColorRepresentation {
  if (color == null) return DEFAULT_COLOR;
  if (Array.isArray(color)) {
    const [r, g, b] = color;
    return [r, g, b].every((n) => typeof n === 'number' && Number.isFinite(n))
      ? new THREE.Color(r, g, b)
      : DEFAULT_COLOR;
  }
  if (typeof color === 'string') {
    try {
      // three 的 Color 能解析 hex 与 CSS 颜色名（如 'yellow'）；无法解析会抛错
      new THREE.Color(color);
      return color;
    } catch {
      return DEFAULT_COLOR;
    }
  }
  return DEFAULT_COLOR;
}
