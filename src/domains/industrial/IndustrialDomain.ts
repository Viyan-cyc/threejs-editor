import type { AssetEntry } from '../../core/capabilities/models/types';
import type { DomainPrompt } from '../../core/registry/types';
import type { Domain } from '../../core/registry/types';
import { makeAssetBuilder } from '../_shared/assetBuilder';

/** 工业领域资产清单（占位，待补真实 GLB）。 */
export const industrialAssets: AssetEntry[] = [
  { key: 'industrial/factory', domain: 'industrial', url: '/assets/models/industrial/factory.glb', format: 'glb', label: '工厂车间' },
  { key: 'industrial/warehouse', domain: 'industrial', url: '/assets/models/industrial/warehouse.glb', format: 'glb', label: '仓库' },
];

export const industrialPrompt: DomainPrompt = {
  objectTypes: [
    { type: 'factory', description: '工厂车间', params: { area: '建筑面积（㎡）' } },
    { type: 'warehouse', description: '仓库 / 厂房' },
  ],
  rules: ['按工艺流程合理布局车间与仓库的相对位置。'],
};

/** 工业领域。 */
export class IndustrialDomain implements Domain {
  readonly id = 'industrial';
  readonly name = '工业';
  readonly description = '工厂、车间、仓储等工业场景';
  readonly builders = [
    makeAssetBuilder('factory', 'industrial/factory'),
    makeAssetBuilder('warehouse', 'industrial/warehouse'),
  ];
  readonly assets = industrialAssets.map((a) => a.key);
  readonly prompt = industrialPrompt;
}

export const industrialDomain = new IndustrialDomain();
