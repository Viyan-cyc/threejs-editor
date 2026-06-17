import type { SceneDSL, SceneEditDSL } from '../../core/dsl/types';
import type { GenerateOptions, GenerationPrompt } from '../types';

/**
 * LLMAdapter —— 自然语言 → 场景产物的适配器抽象。
 *
 * 实现方负责把 GenerationPrompt 交给具体模型，并解析返回：
 *  - create / 重建模式：完整 SceneDSL；
 *  - edit 模式（opts.currentScene 非空）：SceneEditDSL（增量 ops）或完整 SceneDSL（重新生成）。
 *
 * 内置实现：MockLLMAdapter（默认，规则化示例）；占位：ClaudeAdapter。
 * 接入真实 LLM 时新增一个实现，并在 EditorEngine 构造中替换 MockLLMAdapter。
 */
export interface LLMAdapter {
  /** 适配器标识，用于日志 / 切换 */
  readonly id: string;
  /** 生成场景产物：完整 SceneDSL 或增量 SceneEditDSL */
  generateScene(prompt: GenerationPrompt, opts?: GenerateOptions): Promise<SceneDSL | SceneEditDSL>;
}
