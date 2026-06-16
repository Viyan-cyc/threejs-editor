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
 */
export class SceneBuilder {
  /** 清单外对象的通用几何兜底。 */
  private readonly generic = new GenericShapeBuilder();

  constructor(
    private readonly registry: DomainRegistry,
    private readonly ctx: EditorContext,
  ) {}

  async build(dsl: SceneDSL): Promise<THREE.Group> {
    if (dsl.environment) this.ctx.environment.apply(dsl.environment);
    this.ctx.lighting.apply(dsl.lights ?? []);

    const root = new THREE.Group();
    root.name = dsl.title ?? 'scene-objects';

    for (const node of dsl.objects ?? []) {
      const obj = await this.buildObject(node, dsl.domain);
      root.add(obj);
    }
    return root;
  }

  private async buildObject(node: SceneObjectDSL, fallbackDomain: SceneDSL['domain']): Promise<THREE.Object3D> {
    const domain = this.registry.get(node.domain ?? fallbackDomain);
    const builder = domain.builders.find((b) => b.type === node.type);
    const obj = builder
      ? await builder.build(node, this.ctx)
      : this.buildGeneric(node); // 清单外：通用几何兜底（简化模型）

    applyTransform(obj, node.transform);
    if (node.name) obj.name = node.name;

    if (node.children?.length) {
      for (const child of node.children) {
        obj.add(await this.buildObject(child, node.domain ?? fallbackDomain));
      }
    }
    return obj;
  }

  /** 清单外对象的通用几何兜底（简化 low-poly）。 */
  private buildGeneric(node: SceneObjectDSL): THREE.Object3D {
    console.warn(`[SceneBuilder] 未注册对象类型 "${node.type}"，使用通用几何兜底（简化模型）。`);
    return this.generic.build(node, this.ctx);
  }
}
