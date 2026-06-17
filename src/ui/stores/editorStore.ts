import { defineStore } from 'pinia';
import { markRaw, ref, shallowRef } from 'vue';
import { EditorEngine } from '../../core/engine/EditorEngine';
import type { DomainKind, SceneDSL } from '../../core/dsl/types';
import type { GenerateOptions } from '../../ai/types';
import { appConfig } from '../../config/app.config';
import { useChatStore } from './chatStore';

/**
 * 编辑器 store —— 持有 EditorEngine 实例（非响应式，用 shallowRef + markRaw）
 * 以及驱动 UI 的响应式状态（当前领域 / 当前 DSL / 加载态 / 错误）。
 */
export const useEditorStore = defineStore('editor', () => {
  const engine = shallowRef<EditorEngine | null>(null);
  const currentDomain = ref<DomainKind>(appConfig.defaultDomain);
  const currentScene = ref<SceneDSL | null>(null);
  const loading = ref(false);
  /** 生成期间的进度文案（如「正在生成：集装箱…」），由 EditorEngine.onProgress 回填 */
  const loadingText = ref('');
  const error = ref<string | null>(null);

  function attach(canvas: HTMLCanvasElement): void {
    if (engine.value) return;
    const e = markRaw(new EditorEngine(canvas));
    e.setProgressHandler((t) => {
      loadingText.value = t;
    });
    // 混元等对象级非致命失败（已跳过）→ 作为系统消息推到对话框，让用户知情。
    // 运行时调用 useChatStore()，避免与 chatStore（它已 import editorStore）的循环依赖在加载期触发。
    e.setWarningHandler((t) => {
      useChatStore().push('system', t);
    });
    e.start();
    engine.value = e;
  }

  function detach(): void {
    engine.value?.dispose();
    engine.value = null;
  }

  async function generate(text: string, opts?: GenerateOptions): Promise<SceneDSL | null> {
    if (!engine.value) {
      error.value = '引擎未初始化（视口未挂载）';
      return null;
    }
    loading.value = true;
    error.value = null;
    try {
      const dsl = await engine.value.generate(text, currentDomain.value, opts);
      currentScene.value = dsl;
      return dsl;
    } catch (e) {
      error.value = (e as Error).message;
      return null;
    } finally {
      loading.value = false;
      loadingText.value = '';
    }
  }

  function setDomain(d: DomainKind): void {
    currentDomain.value = d;
  }

  return { engine, currentDomain, currentScene, loading, loadingText, error, attach, detach, generate, setDomain };
});
