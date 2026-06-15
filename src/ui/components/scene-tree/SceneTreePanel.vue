<script setup lang="ts">
import { useSceneStore } from '../../stores/sceneStore';

const scene = useSceneStore();
</script>

<template>
  <div class="tree">
    <div class="tree__header">场景结构</div>
    <div class="tree__title">{{ scene.title }}</div>
    <ul class="tree__list">
      <li v-for="(obj, i) in scene.objects" :key="i" class="tree__item">
        <span class="tree__type">{{ obj.type }}</span>
        <span class="tree__name">{{ obj.name ?? '' }}</span>
      </li>
      <li v-if="scene.objects.length === 0" class="tree__empty">暂无对象，发送描述生成场景。</li>
    </ul>
    <div class="tree__footer">灯光数：{{ scene.lightCount }}</div>
  </div>
</template>

<style scoped>
.tree {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fafbfc;
}
.tree__header {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #555;
  border-bottom: 1px solid #e5e7eb;
  text-transform: uppercase;
}
.tree__title {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
}
.tree__list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 0;
}
.tree__item {
  padding: 6px 12px;
  font-size: 13px;
  display: flex;
  gap: 8px;
  align-items: baseline;
}
.tree__item:hover {
  background: #eef2f7;
}
.tree__type {
  font-family: ui-monospace, monospace;
  color: #2f6fed;
  font-size: 12px;
}
.tree__name {
  color: #444;
}
.tree__empty {
  padding: 10px 12px;
  font-size: 12px;
  color: #999;
}
.tree__footer {
  padding: 6px 12px;
  font-size: 11px;
  color: #888;
  border-top: 1px solid #e5e7eb;
}
</style>
