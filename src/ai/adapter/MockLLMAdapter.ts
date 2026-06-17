import type { SceneDSL, SceneEditDSL } from '../../core/dsl/types';
import type { GenerateOptions, GenerationPrompt } from '../types';
import type { LLMAdapter } from './LLMAdapter';
import { mockSceneFor, mockEditFor } from './mockScenes';

/**
 * MockLLMAdapter —— 不调用任何真实模型的规则化实现。
 *
 * 用途：在接入真实 LLM 前跑通「自然语言 → DSL → 场景」全流程（含多轮增删改）。
 *
 * 分流：
 *  - 首次 / 空场景（无 opts.currentScene）：按领域返回示例完整 SceneDSL。
 *  - 已有场景：按用户输入关键词演示 edit 的三种行为——
 *      · 「删 / 移除」→ remove 最后一个对象；
 *      · 「重新生成 / 换个 / 清空」→ 返回完整 SceneDSL（触发全量重建）；
 *      · 其余 → add 一个蓝色集装箱（mockEditFor）。
 */
export class MockLLMAdapter implements LLMAdapter {
  readonly id = 'mock';

  async generateScene(
    prompt: GenerationPrompt,
    opts?: GenerateOptions,
  ): Promise<SceneDSL | SceneEditDSL> {
    // 模拟网络/推理延迟
    await delay(300);
    const domain = prompt.domain;
    const user = prompt.user ?? '';
    const objects = opts?.currentScene?.objects ?? [];

    // 编辑模式（已有场景且有对象）
    if (opts?.currentScene && objects.length > 0) {
      if (/删|移除|去掉|remove|delete/i.test(user)) {
        const last = objects[objects.length - 1];
        const edit: SceneEditDSL = {
          mode: 'edit',
          domain,
          ops: [{ op: 'remove', id: last.id ?? '' }],
          notes: [`（Mock）演示「删除」：移除对象 ${last.id ?? ''}（${last.type}）。`],
        };
        return edit;
      }
      if (/重新生成|重新|换个|重来|清空|regenerate/i.test(user)) {
        const dsl = mockSceneFor(domain);
        dsl.notes = ['（Mock）演示「重新生成」：全量重建为领域示例场景。'];
        return dsl; // 无 mode → 视为 create
      }
      return mockEditFor(domain, objects.length);
    }

    // create：首次 / 空场景
    const dsl = mockSceneFor(domain);
    dsl.notes = [
      `（Mock 适配器）已根据领域「${domain}」生成示例场景。`,
      `用户意图：${user}`,
      '接入真实 LLM 后将按描述细化对象与参数。',
    ];
    return dsl;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
