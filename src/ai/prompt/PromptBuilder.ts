import type { DomainKind, SceneDSL } from '../../core/dsl/types';
import type { DomainRegistry } from '../../core/registry/DomainRegistry';
import type { GenerationPrompt } from '../types';
import {
  BASE_SYSTEM_PROMPT,
  EDIT_SYSTEM_PROMPT,
  buildUserMessage,
  buildEditUserMessage,
  formatDomainPrompt,
} from './templates';

/** build 的可选上下文：传入 currentScene 即进入「编辑现有场景」模式。 */
export interface BuildContext {
  currentScene: SceneDSL | null;
}

/**
 * PromptBuilder —— 组装发给 LLM 的提示词。
 *
 * - 无 currentScene（首次）：create 模式，system = BASE_SYSTEM_PROMPT + 领域知识。
 * - 有 currentScene（后续轮次）：edit 模式，system = EDIT_SYSTEM_PROMPT + 领域知识，
 *   user 注入当前对象清单 + 用户新指令。
 */
export class PromptBuilder {
  constructor(private readonly registry: DomainRegistry) {}

  build(domain: DomainKind, naturalLanguage: string, ctx?: BuildContext): GenerationPrompt {
    const d = this.registry.get(domain);
    const domainPromptText = d.prompt ? formatDomainPrompt(d.id, d.prompt) : '';

    if (ctx?.currentScene) {
      const systemParts = [EDIT_SYSTEM_PROMPT];
      if (domainPromptText) systemParts.push(domainPromptText);
      return {
        domain,
        system: systemParts.join('\n\n'),
        user: buildEditUserMessage(naturalLanguage, ctx.currentScene),
      };
    }

    const systemParts = [BASE_SYSTEM_PROMPT];
    if (domainPromptText) systemParts.push(domainPromptText);
    return {
      domain,
      system: systemParts.join('\n\n'),
      user: buildUserMessage(naturalLanguage),
    };
  }
}
