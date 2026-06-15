import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useEditorStore } from './editorStore';
import type { SceneObjectDSL } from '../../core/dsl/types';

/** 场景 store —— 由 editorStore.currentScene 派生，供场景树 / 属性面板消费。 */
export const useSceneStore = defineStore('scene', () => {
  const editor = useEditorStore();

  const dsl = computed(() => editor.currentScene);
  const title = computed(() => dsl.value?.title ?? '（未生成）');
  const objects = computed<SceneObjectDSL[]>(() => dsl.value?.objects ?? []);
  const lightCount = computed(() => dsl.value?.lights?.length ?? 0);

  return { dsl, title, objects, lightCount };
});
