import * as THREE from 'three';
import { disposeObject3D } from './utils/dispose';

/**
 * SceneManager —— 持有 THREE.Scene，负责场景内容的增删与释放。
 *
 * clearContent()：清空所有子物体（含灯光/环境组）并逐个 dispose，
 * 同时重置 background/environment —— 与 SceneBuilder 重新解释 DSL 配合使用。
 */
export class SceneManager {
  readonly scene = new THREE.Scene();

  constructor() {
    this.scene.name = 'root-scene';
  }

  add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  remove(object: THREE.Object3D): void {
    this.scene.remove(object);
    disposeObject3D(object);
  }

  clearContent(): void {
    const children = [...this.scene.children];
    children.forEach((child) => {
      this.scene.remove(child);
      disposeObject3D(child);
    });
    this.scene.background = null;
    this.scene.environment = null;
  }
}
