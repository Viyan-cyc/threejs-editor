import type { AssetEntry } from '../../core/capabilities/models/types';

/** 能源领域资产清单。把真实 GLB 放到 public/assets/models/energy/ 后在此登记。 */
export const energyAssets: AssetEntry[] = [
  {
    key: 'energy/solar-panel',
    domain: 'energy',
    url: '/assets/models/energy/solar-panel.glb',
    format: 'glb',
    scale: 1,
    label: '光伏组件',
  },
  {
    key: 'energy/power-station',
    domain: 'energy',
    url: '/assets/models/energy/power-station.glb',
    format: 'glb',
    scale: 1,
    label: '升压站',
  },
];
