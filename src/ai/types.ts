import type { DomainKind, SceneDSL } from '../core/dsl/types';

/** 组装好的提示词：system（基础 + 领域知识）+ user（用户自然语言）。 */
export interface GenerationPrompt {
  domain: DomainKind;
  system: string;
  user: string;
}

/** 生成调用的可选参数。 */
export interface GenerateOptions {
  /** 模型 ID（适配器自行解释） */
  model?: string;
  /** 中止信号 */
  signal?: AbortSignal;
}
