import * as THREE from 'three';
import type { CameraAnimationDSL, CameraDSL } from '../../dsl/types';

/**
 * CameraRig 端口：core 层不直接依赖 three/ 层的 CameraRig 类，
 * 只依赖这个最小接口。three 层的 CameraRig 结构化实现它即可。
 */
export interface CameraRigPort {
  readonly camera: THREE.PerspectiveCamera;
  setTarget(x: number, y: number, z: number): void;
  updateControls(): void;
}

/**
 * 公共能力：摄像头动画。
 * - setView：根据 CameraDSL 设置初始相机位姿；
 * - play / update：驱动 orbit / spin 等动画，每帧由 EditorEngine 推进。
 *
 * 注意：动画进行中会逐帧覆盖相机位置；TODO 可在播放期间禁用用户 OrbitControls。
 */
export class CameraAnimator {
  private anim?: CameraAnimationDSL;
  private angle = 0;

  constructor(private readonly rig: CameraRigPort) {}

  setView(view: CameraDSL): void {
    const cam = this.rig.camera;
    if (view.position) cam.position.set(...view.position);
    if (view.fov !== undefined) {
      cam.fov = view.fov;
      cam.updateProjectionMatrix();
    }
    if (view.target) {
      this.rig.setTarget(...view.target);
    } else if (view.preset) {
      this.applyPreset(view.preset);
    }
    this.rig.updateControls();
  }

  play(anim: CameraAnimationDSL): void {
    this.anim = anim;
    this.angle = 0;
  }

  stop(): void {
    this.anim = undefined;
  }

  update(dt: number): void {
    const a = this.anim;
    if (!a) return;
    if (a.type === 'orbit' || a.type === 'spin') {
      const radius = a.radius ?? 30;
      const height = a.height ?? 15;
      const speed = a.type === 'spin' ? 0.5 : 0.2;
      this.angle += dt * speed;
      const t = a.target ?? [0, 0, 0];
      this.rig.camera.position.set(
        t[0] + Math.cos(this.angle) * radius,
        t[1] + height,
        t[2] + Math.sin(this.angle) * radius,
      );
      this.rig.setTarget(t[0], t[1], t[2]);
      this.rig.updateControls();
    }
    // TODO: 'fly' / 'dolly' 的关键帧/插值实现
  }

  private applyPreset(preset: NonNullable<CameraDSL['preset']>): void {
    const cam = this.rig.camera;
    const d = 30;
    switch (preset) {
      case 'top':
        cam.position.set(0, d, 0.01);
        break;
      case 'front':
        cam.position.set(0, 0, d);
        break;
      case 'side':
        cam.position.set(d, 0, 0);
        break;
      case 'iso':
      case 'overview':
      default:
        cam.position.set(d * 0.7, d * 0.6, d * 0.7);
        break;
    }
  }
}
