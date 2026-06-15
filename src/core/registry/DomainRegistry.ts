import type { DomainKind } from '../dsl/types';
import type { Domain } from './types';

/**
 * 领域注册中心。
 * 启动时由 EditorEngine 把 config/domains.config.ts 中的领域全部注册进来；
 * SceneBuilder 按对象的 domain 取到对应 Domain，再在其 builders 中查 type。
 */
export class DomainRegistry {
  private readonly domains = new Map<DomainKind, Domain>();

  register(domain: Domain): void {
    if (this.domains.has(domain.id)) {
      throw new Error(`领域已注册，重复注册被拒绝：${domain.id}`);
    }
    this.domains.set(domain.id, domain);
  }

  get(id: DomainKind): Domain {
    const domain = this.domains.get(id);
    if (!domain) {
      throw new Error(`未注册的领域：${id}`);
    }
    return domain;
  }

  has(id: DomainKind): boolean {
    return this.domains.has(id);
  }

  list(): Domain[] {
    return Array.from(this.domains.values());
  }
}
