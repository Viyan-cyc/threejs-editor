import type { SceneDSL } from '../../core/dsl/types';
import type { GenerateOptions, GenerationPrompt } from '../types';

/**
 * LLMAdapter —— 自然语言 → SceneDSL 的适配器抽象。
 *
 * 实现方负责把 GenerationPrompt 交给具体模型，并解析/校验返回为合法 SceneDSL。
 * 内置实现：MockLLMAdapter（默认，规则化示例）；占位：ClaudeAdapter / OpenAIAdapter。
 *
 * 接入真实 LLM 时新增一个实现，并在 EditorEngine 构造中替换 MockLLMAdapter。
 */
export interface LLMAdapter {
  /** 适配器标识，用于日志 / 切换 */
  readonly id: string;
  /** 生成场景 DSL */
  generateScene(prompt: GenerationPrompt, opts?: GenerateOptions): Promise<SceneDSL>;
}
