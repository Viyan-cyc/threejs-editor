import type { DomainKind, SceneDSL, SceneGenerationResult } from '../../core/dsl/types';
import type { LLMAdapter } from '../adapter/LLMAdapter';
import type { PromptBuilder } from '../prompt/PromptBuilder';
import type { GenerateOptions } from '../types';
import { assignIds, isSceneEditDSL, normalizeEditDSL, normalizeSceneDSL } from './normalizeDSL';

/**
 * SceneGenerationOrchestrator —— 编排「自然语言 → 场景产物」。
 *
 * 1. 用 PromptBuilder 组装提示词（无 currentScene → create；有 → edit，注入当前对象清单）；
 * 2. 调 LLMAdapter 产出 SceneDSL（create/重建）或 SceneEditDSL（edit）；
 * 3. 按 mode 判别并规范化：
 *    - edit（且本次确为编辑请求）→ normalizeEditDSL；
 *    - 其余 → normalizeSceneDSL + assignIds（完整场景，所有对象带稳定 id）。
 *
 * 引擎层（EditorEngine）拿到结果后：edit 合并到上一份 DSL，create 直接全量重建。
 */
export class SceneGenerationOrchestrator {
  constructor(
    private readonly adapter: LLMAdapter,
    private readonly promptBuilder: PromptBuilder,
  ) {}

  async generate(
    naturalLanguage: string,
    domain: DomainKind,
    opts?: GenerateOptions,
  ): Promise<SceneGenerationResult> {
    const currentScene = opts?.currentScene ?? null;
    const prompt = this.promptBuilder.build(domain, naturalLanguage, { currentScene });
    const raw = await this.adapter.generateScene(prompt, opts);

    // 仅当本次是「编辑请求」（已有 currentScene）且模型确实输出 edit 时，才走 edit 分支；
    // 否则一律按完整场景处理（含「重新生成」时模型返回完整 DSL 的兜底）。
    if (currentScene && isSceneEditDSL(raw)) {
      return normalizeEditDSL(raw as unknown as Parameters<typeof normalizeEditDSL>[0], domain);
    }
    return assignIds(normalizeSceneDSL(raw as Partial<SceneDSL>, domain));
  }
}
