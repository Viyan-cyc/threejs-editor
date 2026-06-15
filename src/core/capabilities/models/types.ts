import type { DomainKind } from '../../dsl/types';

/** 单条资产描述。资产库（AssetRegistry）以此为单位登记。 */
export interface AssetEntry {
  /** 全局唯一键，如 'energy/solar-panel'。Builder 通过 ModelFactory.load(key) 引用 */
  key: string;
  /** 归属领域（用于按领域筛选 / 列举） */
  domain?: DomainKind;
  /** 实际 URL，相对 public，如 '/assets/models/energy/solar-panel.glb' */
  url: string;
  format: 'glb' | 'gltf';
  /** 默认缩放，加载后统一应用 */
  scale?: number;
  /** 备注（可读名称） */
  label?: string;
}
