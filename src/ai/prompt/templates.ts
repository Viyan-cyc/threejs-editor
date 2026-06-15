import type { DomainPrompt } from '../../core/registry/types';
import type { DomainKind, SceneDSL } from '../../core/dsl/types';

/** 基础 system prompt：所有领域共享，定义 DSL 契约与输出格式。 */
export const BASE_SYSTEM_PROMPT = `你是一个 3D 场景生成助手。根据用户的自然语言描述，输出一个 Three.js 场景描述（SceneDSL）的 JSON 对象。

契约要求：
- 输出必须是合法 JSON，且仅包含 JSON，不要多余解释文本。
- 顶层字段：version, domain, title?, environment?, lights?, objects?, camera?, cameraAnimation?, notes?。
- objects[].type 必须来自当前领域「可生成的对象类型」清单（见下方领域说明）。
- 不确定具体参数时给出合理默认值；把对用户有价值的说明放进 notes。

灯光类型可用：ambient | hemisphere | directional | point | spot。
相机动画类型可用：static | orbit | spin | fly | dolly。`;

/** 把领域知识（DomainPrompt）格式化为可拼进 system prompt 的片段。 */
export function formatDomainPrompt(domain: DomainKind, prompt: DomainPrompt): string {
  const lines: string[] = [];
  lines.push(`【当前领域】${domain}`);
  lines.push('');
  lines.push('可生成的对象类型：');
  for (const t of prompt.objectTypes) {
    const params = t.params
      ? `；参数：{ ${Object.entries(t.params)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')} }`
      : '';
    lines.push(`- ${t.type}：${t.description}${params}`);
  }
  if (prompt.rules?.length) {
    lines.push('');
    lines.push('生成规则：');
    prompt.rules.forEach((r) => lines.push(`- ${r}`));
  }
  if (prompt.examples?.length) {
    lines.push('');
    lines.push('示例（参考结构）：');
    prompt.examples.forEach((ex, i) => {
      const json = typeof ex === 'string' ? ex : JSON.stringify(ex, null, 2);
      lines.push(`示例 ${i + 1}：\n\`\`\`json\n${json}\n\`\`\``);
    });
  }
  return lines.join('\n');
}

/** 由领域 + 用户输入组装最终的 user 消息。 */
export function buildUserMessage(userText: string): string {
  return `请生成场景，描述如下：\n${userText}`;
}

/** 供类型推导复用。 */
export type { SceneDSL };
