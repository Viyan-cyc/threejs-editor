import * as THREE from 'three';

/**
 * 公共能力：对象动画（AnimationMixer 聚合管理）。
 * 用于驱动从 GLTF 资产带出的骨骼 / 关键帧动画。
 * 由 EditorEngine 每帧调用 update(dt)。
 */
export class AnimationManager {
  private readonly mixers = new Map<THREE.Object3D, THREE.AnimationMixer>();

  /** 为某对象创建 mixer；可随后用 mixer.clipAction 播放 clip。 */
  register(object: THREE.Object3D): THREE.AnimationMixer {
    let mixer = this.mixers.get(object);
    if (!mixer) {
      mixer = new THREE.AnimationMixer(object);
      this.mixers.set(object, mixer);
    }
    return mixer;
  }

  update(dt: number): void {
    for (const mixer of this.mixers.values()) mixer.update(dt);
  }

  dispose(object: THREE.Object3D): void {
    const mixer = this.mixers.get(object);
    if (mixer) {
      mixer.stopAllAction();
      this.mixers.delete(object);
    }
  }

  clear(): void {
    for (const mixer of this.mixers.values()) mixer.stopAllAction();
    this.mixers.clear();
  }
}
