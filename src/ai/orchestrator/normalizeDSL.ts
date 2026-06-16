import type { DomainKind, SceneDSL } from '../../core/dsl/types';
import { SCENE_DSL_VERSION } from '../../core/dsl/types';

/**
 * normalizeSceneDSL —— 把 LLM 产出的 DSL 规范化为引擎可消费的合法形态。
 *
 * LLM 输出不可完全控（字段缺失、类型偏差），这里做轻量兜底：
 *  - version / domain 缺失则补默认；
 *  - notes 规范化为 string[]（模型常返回单个字符串，会导致 notes.join 报错）；
 *  - objects / lights 若非数组则置空数组。
 *
 * 更严格的 schema 校验 / 对象 type 白名单为后续 TODO。
 */
export function normalizeSceneDSL(dsl: Partial<SceneDSL>, fallbackDomain: DomainKind): SceneDSL {
  return {
    version: dsl.version ?? SCENE_DSL_VERSION,
    domain: dsl.domain ?? fallbackDomain,
    title: dsl.title,
    environment: dsl.environment,
    lights: Array.isArray(dsl.lights) ? dsl.lights : [],
    objects: Array.isArray(dsl.objects) ? dsl.objects : [],
    camera: dsl.camera,
    cameraAnimation: dsl.cameraAnimation,
    notes: toStringArray(dsl.notes),
  };
}

/** 把任意值规范为 string[]：数组 → 逐项 String；字符串 → 包一层；空 → []。 */
function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === 'string') return v.trim() ? [v] : [];
  if (v == null) return [];
  return [String(v)];
}
