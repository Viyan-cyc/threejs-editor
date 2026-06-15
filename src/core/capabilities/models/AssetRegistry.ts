import type { DomainKind } from '../../dsl/types';
import type { AssetEntry } from './types';

/**
 * 资产清单登记表。
 * 各领域在其 assets.ts 中声明 AssetEntry[]，启动时统一 registerAll 进来。
 * ModelFactory 通过 key 查找实际加载地址。
 */
export class AssetRegistry {
  private readonly entries = new Map<string, AssetEntry>();

  register(entry: AssetEntry): void {
    this.entries.set(entry.key, entry);
  }

  registerAll(entries: AssetEntry[]): void {
    entries.forEach((e) => this.register(e));
  }

  get(key: string): AssetEntry | undefined {
    return this.entries.get(key);
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  list(): AssetEntry[] {
    return Array.from(this.entries.values());
  }

  byDomain(domain: DomainKind): AssetEntry[] {
    return this.list().filter((e) => e.domain === domain);
  }
}
