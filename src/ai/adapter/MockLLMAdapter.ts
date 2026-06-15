import type { SceneDSL } from '../../core/dsl/types';
import type { GenerateOptions, GenerationPrompt } from '../types';
import type { LLMAdapter } from './LLMAdapter';
import { mockSceneFor } from './mockScenes';

/**
 * MockLLMAdapter —— 不调用任何真实模型的规则化实现。
 *
 * 用途：在接入真实 LLM 前跑通「自然语言 → DSL → 场景」全流程。
 * 它按当前领域返回一个示例 SceneDSL，并把用户原文放进 notes。
 */
export class MockLLMAdapter implements LLMAdapter {
  readonly id = 'mock';

  async generateScene(prompt: GenerationPrompt, _opts?: GenerateOptions): Promise<SceneDSL> {
    // 模拟网络/推理延迟
    await delay(300);
    const dsl = mockSceneFor(prompt.domain);
    dsl.notes = [
      `（Mock 适配器）已根据领域「${prompt.domain}」生成示例场景。`,
      `用户意图：${prompt.user}`,
      '接入真实 LLM 后将按描述细化对象与参数。',
    ];
    return dsl;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
