<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore } from '../../stores/editorStore';

const editor = useEditorStore();

/** 把当前 DSL 序列化为可读 JSON，供检查。 */
const dslText = computed(() => {
  const dsl = editor.currentScene;
  return dsl ? JSON.stringify(dsl, null, 2) : '// 暂无场景 DSL';
});
</script>

<template>
  <div class="inspector">
    <div class="inspector__header">属性 / DSL</div>
    <div class="inspector__meta">
      <div>领域：{{ editor.currentScene?.domain ?? '—' }}</div>
      <div>版本：{{ editor.currentScene?.version ?? '—' }}</div>
    </div>
    <pre class="inspector__code">{{ dslText }}</pre>
  </div>
</template>

<style scoped>
.inspector {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fafbfc;
}
.inspector__header {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #555;
  border-bottom: 1px solid #e5e7eb;
  text-transform: uppercase;
}
.inspector__meta {
  padding: 8px 12px;
  font-size: 12px;
  color: #555;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-bottom: 1px solid #eef0f3;
}
.inspector__code {
  flex: 1;
  overflow: auto;
  margin: 0;
  padding: 10px 12px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 11px;
  line-height: 1.5;
  color: #2a2f36;
  white-space: pre;
}
</style>
