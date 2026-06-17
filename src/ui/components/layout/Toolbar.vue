<script setup lang="ts">
import { useEditorStore } from '../../stores/editorStore';
import type { DomainKind } from '../../../core/dsl/types';

const editor = useEditorStore();

const domains: Array<{ id: DomainKind; label: string }> = [
  { id: 'energy', label: '能源' },
  { id: 'industrial', label: '工业' },
  { id: 'ict', label: 'ICT' },
  { id: 'smart-home', label: '智能家居' },
];
</script>

<template>
  <div class="toolbar">
    <div class="toolbar__brand">AI Three.js Editor</div>
    <div class="toolbar__domains">
      <button
        v-for="d in domains"
        :key="d.id"
        class="toolbar__btn"
        :class="{ 'toolbar__btn--active': editor.currentDomain === d.id }"
        @click="editor.setDomain(d.id)"
      >
        {{ d.label }}
      </button>
    </div>
    <div class="toolbar__status">{{ editor.loading ? (editor.loadingText || '生成中…') : '就绪' }}</div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  background: #23272f;
  color: #fff;
}
.toolbar__brand {
  font-weight: 700;
  font-size: 14px;
}
.toolbar__domains {
  display: flex;
  gap: 4px;
}
.toolbar__btn {
  border: 1px solid transparent;
  background: transparent;
  color: #cdd3dc;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
.toolbar__btn--active {
  background: #2f6fed;
  color: #fff;
}
.toolbar__status {
  margin-left: auto;
  font-size: 12px;
  color: #9aa3b0;
}
</style>
