import type {
  DomainKind,
  SceneDSL,
  SceneObjectDSL,
  SceneEditDSL,
  SceneEditOp,
  EnvironmentDSL,
  LightDSL,
  CameraDSL,
  CameraAnimationDSL,
} from '../../core/dsl/types';
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

/**
 * assignIds —— 给 DSL 树中所有缺 id 的对象补稳定唯一 id（深度遍历 objects + children）。
 *
 * 每份成为 currentScene 的 DSL 都先过它，保证 LLM 在编辑模式下能引用到 id。
 * 原地修改并返回同一对象。
 */
export function assignIds(dsl: SceneDSL): SceneDSL {
  const used = new Set<string>();
  const all = walkAll(dsl.objects ?? []);
  for (const n of all) if (n.id) used.add(n.id);
  for (const n of all) {
    if (!n.id) {
      n.id = mintId(n.type ?? 'obj', used);
      used.add(n.id);
    }
  }
  return dsl;
}

/** 类型守卫：判断 AI 产物是否为编辑模式（SceneEditDSL）。 */
export function isSceneEditDSL(x: unknown): x is SceneEditDSL {
  return !!x && typeof x === 'object' && (x as { mode?: unknown }).mode === 'edit';
}

/**
 * normalizeEditDSL —— 把 LLM 的编辑模式输出容错为合法 SceneEditDSL。
 *
 * 兜底：ops 强制数组；丢弃缺关键字段的 op（update/remove 缺 id、add 缺 object）；
 * 宽松归一 op 取值（modify/change→update、delete→remove、create→add）；
 * 场景级字段按「有则保留，无则 undefined（= 不覆盖）」。
 */
export function normalizeEditDSL(
  raw: Partial<SceneEditDSL> & Record<string, unknown>,
  fallbackDomain: DomainKind,
): SceneEditDSL {
  const opsRaw = Array.isArray(raw.ops) ? raw.ops : [];
  const ops: SceneEditOp[] = [];

  for (const o of opsRaw) {
    if (!o || typeof o !== 'object') continue;
    const r = o as Record<string, unknown>;
    const action = normalizeAction(r.op ?? r.action);
    if (action === 'add') {
      const object = (r.object ?? r.node) as unknown;
      if (object && typeof object === 'object') {
        const parentId = typeof r.parentId === 'string' ? r.parentId : undefined;
        ops.push({ op: 'add', parentId, object: object as SceneObjectDSL });
      }
    } else if (action === 'update') {
      const id = r.id;
      const changes = (r.changes ?? r.object ?? {}) as Record<string, unknown>;
      if (typeof id === 'string' && changes && typeof changes === 'object') {
        ops.push({ op: 'update', id, changes: changes as Partial<SceneObjectDSL> });
      }
    } else if (action === 'remove') {
      const id = r.id;
      if (typeof id === 'string') ops.push({ op: 'remove', id });
    }
  }

  return {
    mode: 'edit',
    domain: (raw.domain as DomainKind) ?? fallbackDomain,
    ops,
    environment: raw.environment as EnvironmentDSL | undefined,
    lights: Array.isArray(raw.lights) ? (raw.lights as LightDSL[]) : undefined,
    camera: raw.camera as CameraDSL | undefined,
    cameraAnimation: raw.cameraAnimation as CameraAnimationDSL | undefined,
    notes: toStringArray(raw.notes),
  };
}

/**
 * applyEditOps —— 把增量 ops 合并到上一份完整 SceneDSL，返回新完整 SceneDSL。
 *
 * 纯函数（基于 prev 深拷贝）。ops 不直接进引擎，合并结果再由引擎按 id diff。
 * 单个坏 op（引用不存在的 id / parentId）只记 warning 不中断其余。
 * 场景级字段（environment/lights/camera/cameraAnimation）「出现才覆盖」。
 */
export function applyEditOps(prev: SceneDSL, edit: SceneEditDSL): SceneDSL {
  const next = clone(prev);
  next.objects = Array.isArray(next.objects) ? next.objects : [];

  if (edit.environment !== undefined) next.environment = edit.environment;
  if (edit.lights !== undefined) next.lights = edit.lights;
  if (edit.camera !== undefined) next.camera = edit.camera;
  if (edit.cameraAnimation !== undefined) next.cameraAnimation = edit.cameraAnimation;

  const used = new Set<string>();
  for (const n of walkAll(next.objects)) if (n.id) used.add(n.id);

  const warnings: string[] = [];

  for (const op of edit.ops) {
    if (op.op === 'add') {
      const obj = clone(op.object);
      if (!obj.id || used.has(obj.id)) obj.id = mintId(obj.type ?? 'obj', used);
      used.add(obj.id);

      if (op.parentId) {
        const parent = findById(next.objects, op.parentId);
        if (parent) {
          parent.children ??= [];
          parent.children.push(obj);
        } else {
          warnings.push(`add: parentId "${op.parentId}" 未找到，已跳过该新增。`);
        }
      } else {
        next.objects.push(obj);
      }
    } else if (op.op === 'update') {
      const node = findById(next.objects, op.id);
      if (!node) {
        warnings.push(`update: id "${op.id}" 未找到，已跳过。`);
        continue;
      }
      mergeObject(node, op.changes);
    } else {
      // remove
      const removed = removeById(next.objects, op.id);
      if (!removed) warnings.push(`remove: id "${op.id}" 未找到，已跳过。`);
    }
  }

  // 兜底：补全任何仍缺 id 的节点（例如 update 替换 children 带来的新节点）
  assignIds(next);

  const notes: string[] = [];
  if (next.notes?.length) notes.push(...next.notes);
  if (warnings.length) notes.push(...warnings);
  if (edit.notes?.length) notes.push(...edit.notes);
  next.notes = notes.length ? notes : undefined;

  return next;
}

// ---------------------------------------------------------------------------
// 内部工具
// ---------------------------------------------------------------------------

/** 把任意值规范为 string[]：数组 → 逐项 String；字符串 → 包一层；空 → []。 */
function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === 'string') return v.trim() ? [v] : [];
  if (v == null) return [];
  return [String(v)];
}

/** 深度遍历对象树，返回所有节点（含 children，扁平列表）。 */
function walkAll(nodes: SceneObjectDSL[]): SceneObjectDSL[] {
  const out: SceneObjectDSL[] = [];
  const stack = [...nodes];
  while (stack.length) {
    const n = stack.pop()!;
    out.push(n);
    if (n.children?.length) stack.push(...n.children);
  }
  return out;
}

/** 递归按 id 查找节点（返回树内可变引用）。 */
function findById(nodes: SceneObjectDSL[], id: string): SceneObjectDSL | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const hit = findById(n.children, id);
      if (hit) return hit;
    }
  }
  return undefined;
}

/** 递归按 id 删除节点，返回是否删除成功。 */
function removeById(nodes: SceneObjectDSL[], id: string): boolean {
  const idx = nodes.findIndex((n) => n.id === id);
  if (idx !== -1) {
    nodes.splice(idx, 1);
    return true;
  }
  for (const n of nodes) {
    if (n.children?.length && removeById(n.children, id)) return true;
  }
  return false;
}

/** 浅合并顶层标量；transform/params 做子对象浅合并；children 仅在显式给出时整体替换。 */
function mergeObject(node: SceneObjectDSL, changes: Partial<SceneObjectDSL>): void {
  if (changes.name !== undefined) node.name = changes.name;
  if (changes.type !== undefined) node.type = changes.type;
  if (changes.domain !== undefined) node.domain = changes.domain;
  if (changes.transform !== undefined) {
    node.transform = { ...(node.transform ?? {}), ...changes.transform };
  }
  if (changes.params !== undefined) {
    node.params = { ...(node.params ?? {}), ...changes.params };
  }
  if (changes.children !== undefined) {
    node.children = changes.children;
  }
  // 注：id 不通过 update 修改（会破坏引擎实例映射），故忽略 changes.id。
}

/** 在已用 id 集合中生成一个不冲突的 `obj-<type>-<n>`。 */
function mintId(type: string, used: Set<string>): string {
  const base = `obj-${type}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 24);
  let i = 1;
  let candidate = `${base}-${i}`;
  while (used.has(candidate)) {
    i += 1;
    candidate = `${base}-${i}`;
  }
  return candidate;
}

/** 宽松归一 op 取值。 */
function normalizeAction(v: unknown): SceneEditOp['op'] | null {
  if (typeof v !== 'string') return null;
  const s = v.toLowerCase();
  if (['add', 'create', 'insert', 'new'].includes(s)) return 'add';
  if (['update', 'modify', 'change', 'set', 'edit'].includes(s)) return 'update';
  if (['remove', 'delete', 'del', 'drop'].includes(s)) return 'remove';
  return null;
}

/** DSL 是纯 JSON 可序列化结构，用 JSON 深拷贝即可。 */
function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}
