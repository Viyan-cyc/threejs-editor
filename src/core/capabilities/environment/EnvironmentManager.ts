import * as THREE from 'three';
import type { EnvironmentDSL } from '../../dsl/types';
import { toColor } from '../lighting/LightingManager';

/**
 * 公共能力：环境贴图。
 *
 * 当前为占位实现：设置背景色 / 标记意图。
 * TODO：按 preset 或 asset key 用 PMREMGenerator 加载 HDR / RoomEnvironment，
 *       设置 scene.environment 以获得基于图像的照明（IBL）。
 */
export class EnvironmentManager {
  constructor(
    private readonly scene: THREE.Scene,
    // 预留：PMREMGenerator 需要 renderer
    private readonly _renderer: THREE.WebGLRenderer,
  ) {}

  apply(env: EnvironmentDSL): void {
    if (env.background) {
      this.scene.background = env.backgroundColor
        ? toColor(env.backgroundColor)
        : new THREE.Color('#9ec9ff');
    }
    // TODO: 根据 env.preset / env.asset 加载 HDR 并赋值 scene.environment
    //       env.environmentIntensity 在新版 three 中可设 scene.environmentIntensity
    if (!env.asset && !env.preset) {
      console.info('[Environment] 环境贴图能力（占位）：仅设置背景，HDR/IBL 待接入。', env);
    } else {
      console.info('[Environment] 环境贴图能力（占位）：HDR 加载待接入。', env);
    }
  }

  clear(): void {
    this.scene.background = null;
    this.scene.environment = null;
  }
}
