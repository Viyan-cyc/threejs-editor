import type { SceneDSL } from '../../core/dsl/types';

/**
 * parseJSONObject —— 从 LLM 文本输出中容错提取任意 JSON 对象。
 *
 * 模型偶尔会在 JSON 外加 markdown 围栏（```json ... ```）或解释文字。
 * 依次尝试：原文直解 → 剥围栏 → 截取首尾大括号；全部失败则抛错。
 *
 * 供所有 LLM 适配器复用（create 模式的完整 SceneDSL、edit 模式的 SceneEditDSL）。
 */
export function parseJSONObject<T = unknown>(content: string): T {
  const trimmed = content.trim();

  // 1. 直接解析
  const direct = tryParse(trimmed);
  if (direct) return direct as T;

  // 2. 剥离 markdown 代码围栏
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    const fenced = tryParse(fenceMatch[1].trim());
    if (fenced) return fenced as T;
  }

  // 3. 截取首个 { 到末个 }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const sliced = tryParse(trimmed.slice(start, end + 1));
    if (sliced) return sliced as T;
  }

  throw new Error('模型输出无法解析为 JSON。原文前 200 字：' + trimmed.slice(0, 200));
}

/** parseSceneDSL —— parseJSONObject 的 SceneDSL 类型包装（向后兼容）。 */
export function parseSceneDSL(content: string): SceneDSL {
  return parseJSONObject<SceneDSL>(content);
}

function tryParse(s: string): unknown | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
