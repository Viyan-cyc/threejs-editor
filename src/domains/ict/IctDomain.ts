import type { AssetEntry } from '../../core/capabilities/models/types';
import type { DomainPrompt } from '../../core/registry/types';
import type { Domain } from '../../core/registry/types';
import { makeAssetBuilder } from '../_shared/assetBuilder';

/** ICT 领域资产清单（占位，待补真实 GLB）。 */
export const ictAssets: AssetEntry[] = [
  { key: 'ict/base-station', domain: 'ict', url: '/assets/models/ict/base-station.glb', format: 'glb', label: '通信基站' },
  { key: 'ict/signal-tower', domain: 'ict', url: '/assets/models/ict/signal-tower.glb', format: 'glb', label: '信号塔' },
];

export const ictPrompt: DomainPrompt = {
  objectTypes: [
    { type: 'base-station', description: '宏基站 / 微基站机柜与天线' },
    { type: 'signal-tower', description: '信号塔 / 桁架塔', params: { height: '塔高（米）' } },
  ],
  rules: ['天线朝向与扇区覆盖应符合网络规划。'],
};

/** ICT 领域：基站、信号塔、网络信号覆盖场景。 */
export class IctDomain implements Domain {
  readonly id = 'ict';
  readonly name = 'ICT';
  readonly description = '基站、信号塔、网络信号覆盖等通信场景';
  readonly builders = [
    makeAssetBuilder('base-station', 'ict/base-station'),
    makeAssetBuilder('signal-tower', 'ict/signal-tower'),
  ];
  readonly assets = ictAssets.map((a) => a.key);
  readonly prompt = ictPrompt;
}

export const ictDomain = new IctDomain();
