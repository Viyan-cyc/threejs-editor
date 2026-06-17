import type { DomainKind, SceneDSL, SceneEditDSL } from '../../core/dsl/types';
import { SCENE_DSL_VERSION } from '../../core/dsl/types';

/**
 * 各领域的示例 SceneDSL，供 MockLLMAdapter 使用。
 * 这些示例同时是各领域 DomainPrompt.examples 的来源（保持一致）。
 */
export function mockSceneFor(domain: DomainKind): SceneDSL {
  switch (domain) {
    case 'energy':
      return {
        version: SCENE_DSL_VERSION,
        domain: 'energy',
        title: '光伏电站（示例）',
        environment: { preset: 'sunny', background: true, backgroundColor: '#9ec9ff' },
        camera: { position: [34, 24, 34], target: [0, 0, 0], fov: 50 },
        cameraAnimation: { type: 'orbit', loop: true, target: [0, 0, 0], radius: 38, height: 22 },
        lights: [
          { type: 'hemisphere', intensity: 0.6 },
          { type: 'directional', intensity: 1.3, position: [24, 32, 12], castShadow: true },
        ],
        objects: [
          {
            type: 'solar-panel-array',
            name: '主光伏阵列',
            transform: { position: [0, 0, 0] },
            params: { rows: 6, cols: 10, tilt: 30, spacing: 2.4 },
          },
          {
            type: 'power-station',
            name: '升压站',
            transform: { position: [18, 0, -10] },
            params: { capacity: '100MW' },
          },
        ],
      };

    case 'industrial':
      return {
        version: SCENE_DSL_VERSION,
        domain: 'industrial',
        title: '工业园区（示例）',
        environment: { preset: 'city', background: true, backgroundColor: '#cfd8e3' },
        camera: { preset: 'iso', target: [0, 2, 0] },
        cameraAnimation: { type: 'orbit', loop: true, target: [0, 2, 0], radius: 36, height: 18 },
        lights: [
          { type: 'hemisphere', intensity: 0.7 },
          { type: 'directional', intensity: 1.1, position: [20, 30, 10], castShadow: true },
        ],
        objects: [
          { type: 'factory', name: '主车间', transform: { position: [0, 0, 0] }, params: { area: 2000 } },
          { type: 'warehouse', name: '原料仓', transform: { position: [16, 0, 6] } },
        ],
      };

    case 'ict':
      return {
        version: SCENE_DSL_VERSION,
        domain: 'ict',
        title: '通信基站（示例）',
        environment: { preset: 'sunset', background: true, backgroundColor: '#f3b88c' },
        camera: { position: [14, 10, 16], target: [0, 6, 0], fov: 50 },
        cameraAnimation: { type: 'orbit', loop: true, target: [0, 6, 0], radius: 20, height: 12 },
        lights: [
          { type: 'hemisphere', intensity: 0.6 },
          { type: 'directional', intensity: 1.0, position: [16, 24, 8], castShadow: true },
        ],
        objects: [
          { type: 'base-station', name: '宏基站', transform: { position: [0, 0, 0] } },
          { type: 'signal-tower', name: '信号塔', transform: { position: [8, 0, -4] }, params: { height: 30 } },
        ],
      };

    case 'smart-home':
      return {
        version: SCENE_DSL_VERSION,
        domain: 'smart-home',
        title: '智能家居（示例）',
        environment: { preset: 'studio', background: true, backgroundColor: '#eef1f4' },
        camera: { position: [8, 6, 9], target: [0, 1, 0], fov: 55 },
        cameraAnimation: { type: 'orbit', loop: true, target: [0, 1, 0], radius: 12, height: 7 },
        lights: [
          { type: 'ambient', intensity: 0.5 },
          { type: 'point', intensity: 0.8, position: [0, 4, 0] },
          { type: 'directional', intensity: 0.9, position: [6, 10, 6], castShadow: true },
        ],
        objects: [
          { type: 'room', name: '客厅', transform: { position: [0, 0, 0] }, params: { width: 8, depth: 6, height: 3 } },
          { type: 'device', name: '智能音箱', transform: { position: [-2, 0.6, -1] } },
        ],
      };

    default:
      return {
        version: SCENE_DSL_VERSION,
        domain,
        title: '空场景',
        lights: [{ type: 'ambient', intensity: 1 }],
        objects: [],
      };
  }
}

/**
 * 编辑模式示例 SceneEditDSL（Mock 用）：返回一个「新增蓝色集装箱」op。
 * index 用于错开重复新增的位置，避免完全重叠。
 */
export function mockEditFor(domain: DomainKind, index = 0): SceneEditDSL {
  const x = -16 + (index % 4) * 4;
  const z = 8 + Math.floor(index / 4) * 4;
  return {
    mode: 'edit',
    domain,
    ops: [
      {
        op: 'add',
        object: {
          type: 'container',
          name: `新增集装箱 #${index + 1}（Mock）`,
          transform: { position: [x, 1.25, z] },
          params: { shape: 'box', size: [6, 2.5, 2.5], color: '#3b7dd2' },
        },
      },
    ],
    notes: ['（Mock 适配器）演示「增量新增」：追加一个蓝色集装箱。接入真实 LLM 后将按指令真正增删改。'],
  };
}
