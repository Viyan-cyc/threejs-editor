import type { DomainPrompt } from '../../core/registry/types';
import type { DomainKind, SceneDSL, SceneObjectDSL } from '../../core/dsl/types';

/** 基础 system prompt：所有领域共享，定义 DSL 契约与输出格式。 */
export const BASE_SYSTEM_PROMPT = `你是一个 3D 场景生成助手。根据用户的自然语言描述，输出一个 Three.js 场景描述（SceneDSL）的 JSON 对象。

契约要求：
- 输出必须是合法 JSON，且仅包含 JSON，不要多余解释文本。
- 顶层字段：version, domain, title?, environment?, lights?, objects?, camera?, cameraAnimation?, notes?。
- objects[].type 优先使用当前领域「可生成的对象类型」清单中的类型（会得到精细模型）。
- 如需生成清单外的对象（任意物体，如货架、集装箱、桌椅、设备等），用任意 type 字符串，并在顶层加 generate 字段触发「腾讯混元3D」高精度模型生成（耗时约 1~5 分钟，生成期间会显示进度文案）：
  - generate.prompt：给 3D 生成模型的中文描述，越具体越好，包含物体类型、材质、颜色、关键细节（最多 1024 字符）。
  - 生成模型会被归一化到单位包围盒（最长边 = 1），因此用 transform.scale 指定「目标米数」（如 scale: 6 表示约 6 米长）。
  - 不要再为清单外对象提供 shape/size/parts 等通用几何参数（那是低精度的旧兜底，仅在混元生成失败时自动降级使用）。
  示例——黄色集装箱：{ "type": "container", "name": "集装箱", "generate": { "prompt": "标准的 20 英尺海运集装箱，黄色波纹钢板箱体，带端门和角件" }, "transform": { "scale": 6 } }
- 不确定具体参数时给出合理默认值。
- notes 是给用户看的「场景说明」，只描述场景里有什么、怎么布置（如「南侧布置光伏阵列，旁设升压站；草地中央放一只橘猫，用混元高精度模型」）。**严禁在 notes 里断言生成结果**——不要写「已通过混元3D生成」「已生成高精度模型」「模型已归一化到 X 米」之类。原因：清单外对象的混元模型是在引擎构建场景时才生成的，可能失败或被跳过；你产出 DSL 时无法预知结果，断言「已生成」会与实际不符、误导用户。

灯光类型可用：ambient | hemisphere | directional | point | spot。
相机动画：**默认用 static（静止）或省略 cameraAnimation，不要自动旋转镜头**；仅当用户明确要求「环绕展示/旋转」时才用 orbit/spin。`;

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

/**
 * 编辑模式 system prompt：当前场景已存在，用户要在其上增 / 删 / 改。
 * 声明两种输出模式（edit / create）与 op 契约 + few-shot。
 * 当前对象清单在 user 消息中按轮注入（见 buildEditUserMessage）。
 */
export const EDIT_SYSTEM_PROMPT = `你是一个 3D 场景编辑助手。当前已存在一个场景，用户希望在其基础上「增 / 删 / 改」，而不是从头生成。

你的输出是一个 JSON 对象，二选一：

【模式 A：编辑现有场景】—— 用户想新增 / 修改 / 删除部分物体时，输出：
{
  "mode": "edit",
  "domain": "<当前领域>",
  "ops": [ ... ]
}
ops 是操作列表，每个元素是以下之一：
  - 新增：{ "op": "add", "parentId": "<可选：父对象 id，缺省则加到场景根>", "object": { 完整的 SceneObjectDSL：type / transform / params 等 } }
  - 修改：{ "op": "update", "id": "<目标对象 id>", "changes": { 要改的字段，如 transform / params / name，部分给出即可 } }
  - 删除：{ "op": "remove", "id": "<目标对象 id>" }
关键约束：
  - id / parentId 必须使用「当前场景对象清单」里给出的真实 id，不要臆造。
  - update 的 changes 中，transform / params 只需给出要改的字段，会与原值合并，不会清掉你没写的字段。例：只改位置 → { "transform": { "position": [10,0,2] } }。
  - 用户没提到的对象，保持原样，不要重述也不要删除。
  - 需要同时改场景级配置时，可在 edit 顶层附 environment / lights / camera / cameraAnimation（给出即覆盖，缺省不变）。

【模式 B：重新生成整个场景】—— 仅当用户明确要「重新生成 / 换一个完全不同的 / 不要这个场景了 / 从头来」时，输出完整 SceneDSL（顶层 version/domain/objects/...，与首次生成相同），并在 JSON 中加 "mode": "create"。

通用契约（与首次生成一致）：
- 输出必须是合法 JSON，且仅包含 JSON，不要多余解释文字。
- objects[].type 优先用当前领域「可生成的对象类型」清单中的类型；清单外对象须在 params 提供通用几何参数（shape: box|cylinder|sphere|cone；size 或 radius+height；color；复杂体用 parts），否则无法渲染。
- 灯光类型：ambient | hemisphere | directional | point | spot；相机动画：static | orbit | spin | fly | dolly。

示例（假设当前清单含 id = obj-solar-panel-array-1）：
用户「把光伏阵列整体向北移 10 米」：
\`\`\`json
{ "mode": "edit", "domain": "energy", "ops": [ { "op": "update", "id": "obj-solar-panel-array-1", "changes": { "transform": { "position": [0, 0, -10] } } } ] }
\`\`\`
用户「在东侧加一个红色集装箱」：
\`\`\`json
{ "mode": "edit", "domain": "energy", "ops": [ { "op": "add", "object": { "type": "container", "params": { "shape": "box", "size": [6, 2.5, 2.5], "color": "#d23b3b" }, "transform": { "position": [20, 1.25, 0] } } } ] }
\`\`\`
用户「删掉升压站」：
\`\`\`json
{ "mode": "edit", "domain": "energy", "ops": [ { "op": "remove", "id": "<升压站的 id>" } ] }
\`\`\`
用户「重新生成一个风电场」→ 输出完整 SceneDSL 并加 "mode": "create"。`;

/** 把场景对象树摘要为紧凑清单（id | type | name | position | 子对象数），供 LLM 引用 id。 */
export function summarizeSceneObjects(objects: SceneObjectDSL[]): string {
  const lines: string[] = [];
  const MAX = 30;
  let count = 0;
  let truncated = false;

  const walk = (n: SceneObjectDSL, indent: string): void => {
    if (count >= MAX) {
      truncated = true;
      return;
    }
    const pos = n.transform?.position
      ? `[${n.transform.position.map((v) => round2(v)).join(', ')}]`
      : '-';
    const childN = n.children?.length ?? 0;
    lines.push(
      `${indent}${n.id ?? '(无id)'} | ${n.type}${n.name ? ' / ' + n.name : ''} | pos ${pos}${childN ? ' | ' + childN + ' 子对象' : ''}`,
    );
    count += 1;
    if (childN) for (const c of n.children!) walk(c, indent + '  ');
  };

  for (const n of objects) walk(n, '');
  if (truncated) lines.push('…（对象较多，已截断；未列出的对象请保持原样）');
  return lines.length ? lines.join('\n') : '（场景为空）';
}

/** 编辑模式 user 消息：注入当前对象清单 + 用户新指令。 */
export function buildEditUserMessage(userText: string, currentScene: SceneDSL): string {
  return [
    '当前场景已存在，对象清单（id | type | name | position | 子对象数）：',
    summarizeSceneObjects(currentScene.objects ?? []),
    '',
    '用户的新指令：',
    userText,
    '',
    '请按编辑契约输出 JSON：增删改用 mode:"edit" + ops；若用户明确要重新生成整个场景则用 mode:"create" + 完整 SceneDSL。',
  ].join('\n');
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** 供类型推导复用。 */
export type { SceneDSL };
