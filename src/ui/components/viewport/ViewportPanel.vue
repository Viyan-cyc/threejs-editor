<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useEditorStore } from '../../stores/editorStore';

const editor = useEditorStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);

onMounted(() => {
  if (canvasRef.value) editor.attach(canvasRef.value);
});

onBeforeUnmount(() => {
  editor.detach();
});
</script>

<template>
  <div class="viewport">
    <canvas ref="canvasRef" class="viewport__canvas"></canvas>
    <div v-if="editor.loading" class="viewport__overlay">{{ editor.loadingText || '生成中…' }}</div>
    <div v-else-if="editor.error" class="viewport__overlay viewport__overlay--error">
      {{ editor.error }}
    </div>
  </div>
</template>

<style scoped>
.viewport {
  position: relative;
  width: 100%;
  height: 100%;
  background: #1a1d23;
}
.viewport__canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.viewport__overlay {
  position: absolute;
  left: 12px;
  bottom: 12px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 4px;
  font-size: 13px;
}
.viewport__overlay--error {
  background: rgba(180, 40, 40, 0.85);
}
</style>
