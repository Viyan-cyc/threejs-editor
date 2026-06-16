import type { SceneDSL } from '../../core/dsl/types';

/**
 * parseSceneDSL —— 从 LLM 文本输出中容错提取 SceneDSL。
 *
 * 模型偶尔会在 JSON 外加 markdown 围栏（```json ... ```）或解释文字。
 * 依次尝试：原文直解 → 剥围栏 → 截取首尾大括号；全部失败则抛错。
 *
 * 供所有 LLM 适配器复用（GlmAdapter / 未来的 ClaudeAdapter 等）。
 */
export function parseSceneDSL(content: string): SceneDSL {
  const trimmed = content.trim();

  // 1. 直接解析
  const direct = tryParse(trimmed);
  if (direct) return direct as SceneDSL;

  // 2. 剥离 markdown 代码围栏
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    const fenced = tryParse(fenceMatch[1].trim());
    if (fenced) return fenced as SceneDSL;
  }

  // 3. 截取首个 { 到末个 }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const sliced = tryParse(trimmed.slice(start, end + 1));
    if (sliced) return sliced as SceneDSL;
  }

  throw new Error('模型输出无法解析为 JSON（SceneDSL）。原文前 200 字：' + trimmed.slice(0, 200));
}

function tryParse(s: string): unknown | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
