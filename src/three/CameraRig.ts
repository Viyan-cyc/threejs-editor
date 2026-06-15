import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CameraRigPort } from '../core/capabilities/camera/CameraAnimator';

/**
 * CameraRig —— 透视相机 + OrbitControls。
 * 实现 CameraRigPort，供 core 层 CameraAnimator 驱动（不产生反向依赖）。
 */
export class CameraRig implements CameraRigPort {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;

  constructor(domElement: HTMLElement, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 5000);
    this.camera.position.set(30, 22, 30);

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.update();
  }

  /** CameraRigPort：设置轨道中心。 */
  setTarget(x: number, y: number, z: number): void {
    this.controls.target.set(x, y, z);
  }

  /** CameraRigPort：应用阻尼更新。 */
  updateControls(): void {
    this.controls.update();
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.controls.dispose();
  }
}
