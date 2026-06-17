import * as THREE from 'three';
import { disposeObject3D } from './utils/dispose';

/**
 * SceneManager —— 持有 THREE.Scene，负责场景内容的增删与释放。
 *
 * - clearContent() / clearExcept()：清空子物体（含灯光/环境组）并逐个 dispose，
 *   同时重置 background/environment；clearExcept 可保留指定对象（如常驻 objectRoot）。
 * - disposeAndRemove()：从父节点移除并释放单个对象，供引擎增量删除复用。
 */
export class SceneManager {
  readonly scene = new THREE.Scene();

  constructor() {
    this.scene.name = 'root-scene';
  }

  add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /** 从其父节点移除并释放几何/材质。clearExcept 与引擎 diff-remove 共用，保证 dispose 一致。 */
  disposeAndRemove(object: THREE.Object3D): void {
    if (object.parent) object.parent.remove(object);
    disposeObject3D(object);
  }

  /** 兼容旧接口：从 scene 移除并释放。 */
  remove(object: THREE.Object3D): void {
    this.scene.remove(object);
    disposeObject3D(object);
  }

  /** 清空场景内容，但保留 keep 中的对象（如常驻 objectRoot）。 */
  clearExcept(keep: THREE.Object3D[] = []): void {
    const keepSet = new Set(keep);
    const children = [...this.scene.children];
    for (const child of children) {
      if (keepSet.has(child)) continue;
      this.scene.remove(child);
      disposeObject3D(child);
    }
    this.scene.background = null;
    this.scene.environment = null;
  }

  /** 清空所有内容（= clearExcept([])）。 */
  clearContent(): void {
    this.clearExcept([]);
  }
}
