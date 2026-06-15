import type * as THREE from 'three';
import type { DomainKind, SceneObjectDSL, SceneDSL } from '../dsl/types';
import type { EditorContext } from './EditorContext';

/**
 * ObjectBuilder —— 把一种对象类型的 DSL 节点解释成 THREE.Object3D。
 * 每个领域持有一组 builder，SceneBuilder 按 node.type 查表调用。
 */
export interface ObjectBuilder<T extends SceneObjectDSL = SceneObjectDSL> {
  /** 该 builder 能处理的对象类型，对应 SceneObjectDSL.type */
  readonly type: string;
  /** 构建实现，可异步（如加载资产） */
  build(node: T, ctx: EditorContext): Promise<THREE.Object3D> | THREE.Object3D;
}

/**
 * DomainPrompt —— 喂给 LLM 的领域知识。
 * PromptBuilder 把它拼进 system prompt，让 LLM 知道本领域有哪些 type 可用、如何生成。
 */
export interface DomainPrompt {
  /** 本领域可生成的对象类型清单 + 参数说明 */
  objectTypes: Array<{
    type: string;
    description: string;
    params?: Record<string, string>;
  }>;
  /** 领域专属生成规则 / 约束 */
  rules?: string[];
  /** few-shot 示例（DSL JSON 片段或字符串） */
  examples?: Array<Partial<SceneDSL> | string>;
}

/**
 * Domain —— 一个业务领域的统一描述。
 * 一个领域 = 一组 ObjectBuilder + 资产清单 + 领域知识。
 */
export interface Domain {
  readonly id: DomainKind;
  readonly name: string;
  readonly description: string;
  /** 该领域注册的对象构建器 */
  readonly builders: ObjectBuilder[];
  /** 该领域引用的资产 key 清单 */
  readonly assets?: string[];
  /** 喂给 LLM 的领域知识 */
  readonly prompt?: DomainPrompt;
}
