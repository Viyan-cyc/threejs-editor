<script setup lang="ts">
import Toolbar from './Toolbar.vue';
import SceneTreePanel from '../scene-tree/SceneTreePanel.vue';
import ViewportPanel from '../viewport/ViewportPanel.vue';
import ChatPanel from '../chat/ChatPanel.vue';
import InspectorPanel from '../inspector/InspectorPanel.vue';
</script>

<template>
  <div class="layout">
    <Toolbar class="layout__toolbar" />

    <SceneTreePanel class="layout__tree" />
    <div class="layout__center">
      <ViewportPanel class="layout__viewport" />
      <ChatPanel class="layout__chat" />
    </div>
    <InspectorPanel class="layout__inspector" />
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 240px 1fr 320px;
  grid-template-rows: 44px 1fr;
  grid-template-areas:
    'toolbar toolbar toolbar'
    'tree center inspector';
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
.layout__toolbar {
  grid-area: toolbar;
}
.layout__tree {
  grid-area: tree;
  overflow: hidden;
  border-right: 1px solid #e5e7eb;
}
.layout__center {
  grid-area: center;
  display: grid;
  grid-template-rows: 1fr 220px;
  min-width: 0;
  min-height: 0;
}
.layout__viewport {
  min-height: 0;
}
.layout__chat {
  border-top: 1px solid #e5e7eb;
  min-height: 0;
}
.layout__inspector {
  grid-area: inspector;
  overflow: hidden;
  border-left: 1px solid #e5e7eb;
}
</style>
