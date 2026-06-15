import { defineStore } from 'pinia';
import { markRaw, ref, shallowRef } from 'vue';
import { EditorEngine } from '../../core/engine/EditorEngine';
import type { DomainKind, SceneDSL } from '../../core/dsl/types';
import { appConfig } from '../../config/app.config';

/**
 * 编辑器 store —— 持有 EditorEngine 实例（非响应式，用 shallowRef + markRaw）
 * 以及驱动 UI 的响应式状态（当前领域 / 当前 DSL / 加载态 / 错误）。
 */
export const useEditorStore = defineStore('editor', () => {
  const engine = shallowRef<EditorEngine | null>(null);
  const currentDomain = ref<DomainKind>(appConfig.defaultDomain);
  const currentScene = ref<SceneDSL | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function attach(canvas: HTMLCanvasElement): void {
    if (engine.value) return;
    const e = markRaw(new EditorEngine(canvas));
    e.start();
    engine.value = e;
  }

  function detach(): void {
    engine.value?.dispose();
    engine.value = null;
  }

  async function generate(text: string): Promise<SceneDSL | null> {
    if (!engine.value) {
      error.value = '引擎未初始化（视口未挂载）';
      return null;
    }
    loading.value = true;
    error.value = null;
    try {
      const dsl = await engine.value.generate(text, currentDomain.value);
      currentScene.value = dsl;
      return dsl;
    } catch (e) {
      error.value = (e as Error).message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  function setDomain(d: DomainKind): void {
    currentDomain.value = d;
  }

  return { engine, currentDomain, currentScene, loading, error, attach, detach, generate, setDomain };
});
