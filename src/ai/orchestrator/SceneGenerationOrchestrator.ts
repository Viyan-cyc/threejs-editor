import type { DomainKind, SceneDSL } from '../../core/dsl/types';
import type { LLMAdapter } from '../adapter/LLMAdapter';
import type { PromptBuilder } from '../prompt/PromptBuilder';
import type { GenerateOptions } from '../types';

/**
 * SceneGenerationOrchestrator —— 编排「自然语言 → SceneDSL」。
 *
 * 1. 用 PromptBuilder 组装提示词（注入领域知识）；
 * 2. 调 LLMAdapter 产出 SceneDSL；
 * 3. （TODO）对 DSL 做 schema 校验 / 修复，再返回。
 *
 * 引擎层（EditorEngine）拿到 DSL 后再交给 SceneBuilder 解释为 Three.js。
 */
export class SceneGenerationOrchestrator {
  constructor(
    private readonly adapter: LLMAdapter,
    private readonly promptBuilder: PromptBuilder,
  ) {}

  async generate(naturalLanguage: string, domain: DomainKind, opts?: GenerateOptions): Promise<SceneDSL> {
    const prompt = this.promptBuilder.build(domain, naturalLanguage);
    const dsl = await this.adapter.generateScene(prompt, opts);
    // TODO: validate(dsl) —— 校验/补全字段，失败抛错或降级
    return dsl;
  }
}
