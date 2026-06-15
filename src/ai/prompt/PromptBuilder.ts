import type { DomainKind } from '../../core/dsl/types';
import type { DomainRegistry } from '../../core/registry/DomainRegistry';
import type { GenerationPrompt } from '../types';
import { BASE_SYSTEM_PROMPT, buildUserMessage, formatDomainPrompt } from './templates';

/**
 * PromptBuilder —— 组装发给 LLM 的提示词。
 *
 * system = BASE_SYSTEM_PROMPT + 当前领域的 DomainPrompt（对象类型/规则/示例）。
 * user   = 用户自然语言描述。
 */
export class PromptBuilder {
  constructor(private readonly registry: DomainRegistry) {}

  build(domain: DomainKind, naturalLanguage: string): GenerationPrompt {
    const d = this.registry.get(domain);
    const systemParts = [BASE_SYSTEM_PROMPT];
    if (d.prompt) systemParts.push(formatDomainPrompt(d.id, d.prompt));

    return {
      domain,
      system: systemParts.join('\n\n'),
      user: buildUserMessage(naturalLanguage),
    };
  }
}
