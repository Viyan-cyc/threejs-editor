/**
 * 场景 DSL（Domain-Specific Language）
 *
 * 这是 AI 与引擎之间**唯一的契约**：
 *  - AI（LLMAdapter）只产出 SceneDSL；
 *  - 引擎（SceneBuilder）只消费 SceneDSL。
 *
 * 任何「让 AI 直接操作 Three」的需求，都应先转化为这里的字段。
 */

/** 业务领域枚举。新增领域时在此追加。 */
export type DomainKind = 'energy' | 'industrial' | 'ict' | 'smart-home';

/** 颜色：hex 字符串或归一化 RGB。 */
export type ColorDSL = string | [number, number, number];

/** 空间变换。 */
export interface TransformDSL {
  /** [x, y, z] */
  position?: [number, number, number];
  /** 欧拉角，弧度 [x, y, z] */
  rotation?: [number, number, number];
  /** 等比缩放数值，或三轴独立缩放 */
  scale?: number | [number, number, number];
}

/** 灯光 → LightingManager。 */
export interface LightDSL {
  type: 'ambient' | 'hemisphere' | 'directional' | 'point' | 'spot';
  name?: string;
  color?: ColorDSL;
  intensity?: number;
  position?: [number, number, number];
  /** directional / spot 的目标点 */
  target?: [number, number, number];
  /** point / spot 衰减距离 */
  distance?: number;
  /** spot 半角（弧度） */
  angle?: number;
  /** spot 软边 */
  penumbra?: number;
  castShadow?: boolean;
}

/** 环境贴图 → EnvironmentManager。 */
export interface EnvironmentDSL {
  /** 预设名，如 'studio' | 'sunny' | 'city' | 'sunset' */
  preset?: string;
  /** 资产库中的 HDR key */
  asset?: string;
  /** 是否作为可见背景 */
  background?: boolean;
  /** 背景色（background=true 且未提供 asset/preset 时使用） */
  backgroundColor?: ColorDSL;
  /** 环境光强度 */
  environmentIntensity?: number;
}

/** 初始相机 → CameraAnimator.setView。 */
export interface CameraDSL {
  position?: [number, number, number];
  target?: [number, number, number];
  fov?: number;
  /** 预设视角（未给 position 时使用） */
  preset?: 'overview' | 'top' | 'front' | 'side' | 'iso';
}

/** 相机动画 → CameraAnimator.play。 */
export interface CameraAnimationDSL {
  type: 'static' | 'orbit' | 'spin' | 'fly' | 'dolly';
  /** 时长（秒），fly/dolly 用 */
  duration?: number;
  loop?: boolean;
  target?: [number, number, number];
  /** orbit/spin 半径 */
  radius?: number;
  /** orbit/spin 高度 */
  height?: number;
}

/** 单个场景对象 → 对应领域的 ObjectBuilder。 */
export interface SceneObjectDSL {
  /** 对象类型，对应领域内 ObjectBuilder.type，如 'solar-panel-array' */
  type: string;
  /** 所属领域；缺省取 SceneDSL.domain。用于跨领域混排 */
  domain?: DomainKind;
  name?: string;
  transform?: TransformDSL;
  /** 领域专属参数，原样透传给 builder */
  params?: Record<string, unknown>;
  children?: SceneObjectDSL[];
}

/** 完整场景 —— AI 的输出产物。 */
export interface SceneDSL {
  version: string;
  domain: DomainKind;
  title?: string;
  environment?: EnvironmentDSL;
  lights?: LightDSL[];
  objects?: SceneObjectDSL[];
  camera?: CameraDSL;
  cameraAnimation?: CameraAnimationDSL;
  /** AI 给用户的说明，展示在聊天区 */
  notes?: string[];
}

/** 当前 DSL 版本，供演进与校验使用。 */
export const SCENE_DSL_VERSION = '1';
