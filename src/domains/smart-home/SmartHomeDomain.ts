import type { AssetEntry } from '../../core/capabilities/models/types';
import type { DomainPrompt } from '../../core/registry/types';
import type { Domain } from '../../core/registry/types';
import { makeAssetBuilder } from '../_shared/assetBuilder';

/** 智能家居领域资产清单（占位，待补真实 GLB）。 */
export const smartHomeAssets: AssetEntry[] = [
  { key: 'smart-home/room', domain: 'smart-home', url: '/assets/models/smart-home/room.glb', format: 'glb', label: '房间' },
  { key: 'smart-home/device', domain: 'smart-home', url: '/assets/models/smart-home/device.glb', format: 'glb', label: '智能设备' },
];

export const smartHomePrompt: DomainPrompt = {
  objectTypes: [
    { type: 'room', description: '房间 / 户型', params: { width: '宽', depth: '深', height: '层高' } },
    { type: 'device', description: '智能设备（音箱、灯具、传感器等）' },
  ],
  rules: ['设备应摆放在合理位置，体现智能家居联动关系。'],
};

/** 智能家居领域。 */
export class SmartHomeDomain implements Domain {
  readonly id = 'smart-home';
  readonly name = '智能家居';
  readonly description = '户型、房间与智能设备的家居场景';
  readonly builders = [
    makeAssetBuilder('room', 'smart-home/room'),
    makeAssetBuilder('device', 'smart-home/device'),
  ];
  readonly assets = smartHomeAssets.map((a) => a.key);
  readonly prompt = smartHomePrompt;
}

export const smartHomeDomain = new SmartHomeDomain();
