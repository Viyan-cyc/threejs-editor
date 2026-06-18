import type { DomainPrompt } from '../../core/registry/types';

/** 喂给 LLM 的能源领域知识。PromptBuilder 会拼进 system prompt。 */
export const energyPrompt: DomainPrompt = {
  objectTypes: [
    {
      type: 'solar-panel-array',
      description: '光伏阵列，按行列排布并倾斜面向太阳',
      params: {
        rows: '行数（默认 5）',
        cols: '列数（默认 5）',
        tilt: '倾角角度（默认 30）',
        spacing: '间距（默认 2.4）',
      },
    },
    {
      type: 'power-station',
      description: '升压站 / 汇流站设施',
      params: { capacity: '装机容量描述，如 "100MW"' },
    },
    {
      type: 'energy-reservoir',
      description: '储能箱 / 储能柜，电池储能单元',
      params: {
        color: '柜体颜色（hex 或颜色名，默认深灰）',
        capacity: '容量描述，如 "200kWh"（仅展示，不影响模型）',
      },
    },
  ],
  rules: [
    '光伏阵列应朝向阳光充足的一侧（北半球朝南）。',
    '阵列间距应避免前后遮挡。',
  ],
  examples: [
    {
      domain: 'energy',
      objects: [
        {
          type: 'solar-panel-array',
          params: { rows: 6, cols: 10, tilt: 30, spacing: 2.4 },
        },
      ],
    },
  ],
};
