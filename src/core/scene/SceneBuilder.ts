import * as THREE from 'three';
import type { SceneDSL, SceneObjectDSL } from '../dsl/types';
import type { DomainRegistry } from '../registry/DomainRegistry';
import type { EditorContext } from '../registry/EditorContext';
import { applyTransform } from '../../three/utils/transform';
import { GenericShapeBuilder } from './GenericShapeBuilder';

/**
 * SceneBuilder —— 把 SceneDSL 解释成 THREE.Object3D 树。
 *
 * 流程：
 *  1. 应用环境（ctx.environment）；
 *  2. 应用灯光（ctx.lighting）；
 *  3. 对每个 object：按 domain 路由到对应领域，再用 node.type 查 ObjectBuilder 构造；
 *     清单外（无对应 builder）的 type 走通用几何兜底（GenericShapeBuilder）。
 *
 * 环境与灯光作用于 ctx.scene（场景级），对象返回到一个根 Group 由调用方挂载。
 *
 * 增量支持：buildSingle / buildObjectTree 公开，供 EditorEngine 按 id 增删改单个对象；
 * 每个建出的 Object3D 挂 userData.dslId，便于引擎反查。
 */
export class SceneBuilder {
  /** 清单外对象的通用几何兜底。 */
  private readonly generic = new GenericShapeBuilder();

  constructor(
    private readonly registry: DomainRegistry,
    private readonly ctx: EditorContext,
  ) {}

  /** 一次性构建整份 DSL（环境 + 灯光 + 对象），返回对象根 Group。供全量重建 / 测试用。 */
  async build(dsl: SceneDSL): Promise<THREE.Group> {
    if (dsl.environment) this.ctx.environment.apply(dsl.environment);
    this.ctx.lighting.apply(dsl.lights ?? []);

    const root = new THREE.Group();
    root.name = dsl.title ?? 'scene-objects';
    const objs = await this.buildObjectTree(dsl.objects ?? [], dsl.domain);
    for (const obj of objs) root.add(obj);
    return root;
  }

  /** 批量构建顶层对象（含各自 children）。供引擎 create / 增量批量复用。 */
  async buildObjectTree(
    nodes: SceneObjectDSL[],
    fallbackDomain: SceneDSL['domain'],
  ): Promise<THREE.Object3D[]> {
    const out: THREE.Object3D[] = [];
    for (const node of nodes) out.push(await this.buildSingle(node, fallbackDomain));
    return out;
  }

  /** 构建单个对象（递归含 children），挂 userData.dslId 供引擎按 id 增量管理。 */
  async buildSingle(node: SceneObjectDSL, fallbackDomain: SceneDSL['domain']): Promise<THREE.Object3D> {
    const domain = this.registry.get(node.domain ?? fallbackDomain);
    const builder = domain.builders.find((b) => b.type === node.type);
    const obj = builder
      ? await builder.build(node, this.ctx)
      : await this.buildGeneric(node); // 清单外：混元生成或通用几何兜底

    applyTransform(obj, node.transform);
    if (node.name) obj.name = node.name;
    if (node.id) obj.userData.dslId = node.id;

    if (node.children?.length) {
      for (const child of node.children) {
        obj.add(await this.buildSingle(child, node.domain ?? fallbackDomain));
      }
    }
    return obj;
  }

  /** 清单外对象：有 generate.prompt 走混元高精度生成；无 prompt 或生成失败则走通用几何 lowPoly 兜底。 */
  private async buildGeneric(node: SceneObjectDSL): Promise<THREE.Object3D> {
    if (node.generate?.prompt) {
      try {
        const obj = await this.ctx.hunyuan.generate(node.generate, node, this.ctx.onProgress);
        void fetch('/hunyuan3d/diag', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ where: 'buildGeneric-ok', type: node.type }) }).catch(() => {});
        return obj;
      } catch (err) {
        void fetch('/hunyuan3d/diag', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ where: 'buildGeneric-fail', type: node.type, error: (err as Error).message, stack: (err as Error).stack }) }).catch(() => {});
        console.warn(`[SceneBuilder] 混元生成 "${node.type}" 失败，降级 lowPoly：`, err);
      }
    }
    console.warn(`[SceneBuilder] 未注册对象类型 "${node.type}"，使用通用几何兜底（简化模型）。`);
    return this.generic.build(node, this.ctx);
  }
}
