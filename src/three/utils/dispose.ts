import * as THREE from 'three';

/** 递归释放 Object3D 的几何体与材质（含数组材质）。 */
export function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();

    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) {
      material.forEach((m) => disposeMaterial(m));
    } else if (material) {
      disposeMaterial(material);
    }
  });
}

function disposeMaterial(material: THREE.Material): void {
  // 释放贴图（按引用计数粗放处理：骨架阶段足够）
  for (const key of Object.keys(material)) {
    const value = (material as unknown as Record<string, unknown>)[key];
    if (value instanceof THREE.Texture) value.dispose();
  }
  material.dispose();
}
