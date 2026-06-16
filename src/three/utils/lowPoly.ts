import * as THREE from 'three';

/**
 * lowPoly —— low-poly（低面数）程序化几何构建工具。
 *
 * 写实 PBR 风格：flatShading 硬边 + MeshStandardMaterial（PBR）+ 低段数圆柱/圆锥/球
 * （圆的东西显示为多边形，是 low-poly 的标志）。
 *
 * 属 three 层工具，不依赖任何领域逻辑；供领域 ObjectBuilder 与通用几何兜底
 * （GenericShapeBuilder）共用。
 */

export interface LowPolyMaterialOpts {
  /** 粗糙度，默认 0.7 */
  roughness?: number;
  /** 金属度，默认 0.1 */
  metalness?: number;
}

/** flatShading PBR 材质。 */
export function lowPolyMaterial(
  color: THREE.ColorRepresentation,
  opts: LowPolyMaterialOpts = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: opts.roughness ?? 0.7,
    metalness: opts.metalness ?? 0.1,
  });
}

/** 给 mesh 打开双面投影阴影（复用渲染管线的 PCFSoftShadowMap）。返回传入的 mesh（链式）。 */
export function lowPolyMesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 低模盒子快捷构造（中心在原点）。 */
export function box(
  size: { w: number; h: number; d: number; color: THREE.ColorRepresentation } & LowPolyMaterialOpts,
): THREE.Mesh {
  return lowPolyMesh(
    new THREE.BoxGeometry(size.w, size.h, size.d),
    lowPolyMaterial(size.color, { roughness: size.roughness, metalness: size.metalness }),
  );
}

/** 低模圆柱快捷构造（低段数体现多边形圆，默认 8 段）。中心在原点，轴沿 Y。 */
export function cylinder(
  p: {
    radiusTop: number;
    radiusBottom: number;
    height: number;
    color: THREE.ColorRepresentation;
    segments?: number;
  } & LowPolyMaterialOpts,
): THREE.Mesh {
  return lowPolyMesh(
    new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, p.segments ?? 8),
    lowPolyMaterial(p.color, { roughness: p.roughness, metalness: p.metalness }),
  );
}

/** 低模圆锥快捷构造（低段数，默认 8）。中心在原点，轴沿 Y，尖端朝 +Y。 */
export function cone(
  p: {
    radius: number;
    height: number;
    color: THREE.ColorRepresentation;
    segments?: number;
  } & LowPolyMaterialOpts,
): THREE.Mesh {
  return lowPolyMesh(
    new THREE.ConeGeometry(p.radius, p.height, p.segments ?? 8),
    lowPolyMaterial(p.color, { roughness: p.roughness, metalness: p.metalness }),
  );
}

/** 低模球体快捷构造（低段数体现多边形球，默认宽 8 / 高 4 段）。中心在原点。 */
export function sphere(
  p: { radius: number; color: THREE.ColorRepresentation; segments?: number } & LowPolyMaterialOpts,
): THREE.Mesh {
  const seg = p.segments ?? 8;
  return lowPolyMesh(
    new THREE.SphereGeometry(p.radius, seg, Math.max(3, Math.round(seg / 2))),
    lowPolyMaterial(p.color, { roughness: p.roughness, metalness: p.metalness }),
  );
}
