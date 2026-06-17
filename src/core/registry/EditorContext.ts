import type * as THREE from 'three';
import type { ModelFactory } from '../capabilities/models/ModelFactory';
import type { HunyuanModelGenerator } from '../capabilities/hunyuan/HunyuanModelGenerator';
import type { LightingManager } from '../capabilities/lighting/LightingManager';
import type { EnvironmentManager } from '../capabilities/environment/EnvironmentManager';
import type { CameraAnimator } from '../capabilities/camera/CameraAnimator';

/**
 * EditorContext —— 在构建场景时下发给每个 ObjectBuilder 的共享上下文。
 *
 * 所有公共能力（capabilities）都以单例形式挂在这里，由 EditorEngine 统一注入。
 * 领域 builder 通过 ctx 复用它们，**不要在领域里自建这些 manager**。
 */
export interface EditorContext {
  /** 目标场景 */
  scene: THREE.Scene;
  /** 模型生成（资产库加载） */
  modelFactory: ModelFactory;
  /** 混元3D 运行时高精度生成（清单外对象） */
  hunyuan: HunyuanModelGenerator;
  /** 灯光 */
  lighting: LightingManager;
  /** 环境贴图 */
  environment: EnvironmentManager;
  /** 摄像头动画 */
  camera: CameraAnimator;
  /** 进度回调：SceneBuilder 生成对象（尤其耗时的混元生成）时调用，UI 层接线显示文案 */
  onProgress?: (text: string) => void;
  /** 警告回调：对象级非致命失败（如混元生成失败被跳过）时调用，UI 层接线为对话框系统消息 */
  onWarning?: (text: string) => void;
}
