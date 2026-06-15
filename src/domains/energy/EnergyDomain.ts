import type { Domain } from '../../core/registry/types';
import { SolarPanelFieldBuilder } from './builders/SolarPanelFieldBuilder';
import { PowerStationBuilder } from './builders/PowerStationBuilder';
import { energyAssets } from './assets';
import { energyPrompt } from './prompts';

/** 能源领域：大型电站、光伏阵列、升压站等能源基础设施场景。 */
export class EnergyDomain implements Domain {
  readonly id = 'energy';
  readonly name = '能源';
  readonly description = '大型电站、光伏阵列、升压站等能源基础设施场景';
  readonly builders = [new SolarPanelFieldBuilder(), new PowerStationBuilder()];
  readonly assets = energyAssets.map((a) => a.key);
  readonly prompt = energyPrompt;
}

export const energyDomain = new EnergyDomain();
