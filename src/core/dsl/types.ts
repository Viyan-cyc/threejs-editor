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
  /** 稳定唯一标识，用于跨轮增删改匹配。缺省由 normalize 层补全 */
  id?: string;
  /** 对象类型，对应领域内 ObjectBuilder.type，如 'solar-panel-array' */
  type: string;
  /** 所属领域；缺省取 SceneDSL.domain。用于跨领域混排 */
  domain?: DomainKind;
  name?: string;
  transform?: TransformDSL;
  /** 领域专属参数，原样透传给 builder */
  params?: Record<string, unknown>;
  /**
   * 清单外对象触发混元3D高精度生成；无此字段则走通用几何 lowPoly 兜底。
   * 仅当 type 不在任何领域的 builder 清单里时生效。
   */
  generate?: GenerateDSL;
  /** 引擎回写：true 表示此对象已由混元3D 生成高精度模型（运行时填，AI 不产出）。 */
  model?: boolean;
  /** 引擎回写：混元生成模型的下载路径（model=true 时填，如 /assets/generated/<hash>.glb）。 */
  url?: string;
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

/**
 * 增量编辑操作 —— AI 在「编辑现有场景」模式下产出的 ops。
 * op 只描述「改了什么」，由 applyEditOps 合并到上一份完整 SceneDSL，
 * 引擎再按 id diff，不直接消费 op。
 */
export type SceneEditOp =
  | { op: 'add'; parentId?: string; object: SceneObjectDSL } // 缺 parentId → 加到根
  | { op: 'update'; id: string; changes: Partial<SceneObjectDSL> } // 按 id 局部修改
  | { op: 'remove'; id: string }; // 按 id 删除

/**
 * 编辑模式产物。与完整 SceneDSL 二选一，由顶层 `mode` 判别。
 * environment/lights/camera/cameraAnimation「出现才覆盖上一份对应字段」，缺省 = 不变。
 */
export interface SceneEditDSL {
  mode: 'edit';
  domain: DomainKind;
  ops: SceneEditOp[];
  environment?: EnvironmentDSL;
  lights?: LightDSL[];
  camera?: CameraDSL;
  cameraAnimation?: CameraAnimationDSL;
  notes?: string[];
}

/** AI 一次产出的可能结果：完整场景（create/重建）或增量编辑（edit）。 */
export type SceneGenerationResult = SceneDSL | SceneEditDSL;

/** 通用几何基本形状（清单外对象的兜底渲染用）。 */
export type ShapeKind = 'box' | 'cylinder' | 'sphere' | 'cone';

/** 通用几何的一个部件（组合体的组成部分）。 */
export interface GenericShapePart {
  shape: ShapeKind;
  /** box 的 [宽, 高, 深] */
  size?: [number, number, number];
  /** cylinder/sphere/cone 半径 */
  radius?: number;
  /** cylinder/cone 高度 */
  height?: number;
  color?: ColorDSL;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

/**
 * 通用几何参数 —— 当 SceneObjectDSL.type 不在任何领域的 builder 清单里时，
 * 由通用几何 builder（GenericShapeBuilder）按此参数渲染简化 low-poly。
 * 有 parts 时按组合体渲染（忽略顶层单 shape）。
 */
export interface GenericShapeParams {
  shape?: ShapeKind;
  size?: [number, number, number];
  radius?: number;
  height?: number;
  color?: ColorDSL;
  parts?: GenericShapePart[];
}

/**
 * 清单外对象触发高精度 3D 模型生成（腾讯混元3D）。
 * 有 generate 字段时，SceneBuilder 走混元生成而非通用几何兜底；生成失败再降级 lowPoly。
 */
export interface GenerateDSL {
  /** 中文生成描述，越具体越好（物体类型/材质/颜色/关键细节）。最多 1024 字符。 */
  prompt: string;
  /** 混元模型版本，默认 3.0。3.1 不支持 LowPoly。 */
  model?: '3.0' | '3.1';
  /** 开启 PBR 材质，默认 true。 */
  enablePbr?: boolean;
  /** 面数，默认 500000，范围 10000~1500000。 */
  faceCount?: number;
  /** 生成类型：Normal / LowPoly / Geometry / Sketch，默认 Normal。 */
  generateType?: 'Normal' | 'LowPoly' | 'Geometry' | 'Sketch';
}

/** 当前 DSL 版本，供演进与校验使用。 */
export const SCENE_DSL_VERSION = '1';
