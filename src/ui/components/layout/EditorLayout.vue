<script setup lang="ts">
import { ref } from 'vue';
import Toolbar from './Toolbar.vue';
import ViewportPanel from '../viewport/ViewportPanel.vue';
import ChatPanel from '../chat/ChatPanel.vue';
import InspectorPanel from '../inspector/InspectorPanel.vue';

/** 侧栏折叠状态：true = 收起（列宽 0），false = 展开 */
const chatCollapsed = ref(false);
const inspectorCollapsed = ref(false);
const SIDE_W = 320;
</script>

<template>
  <div
    class="layout"
    :style="{ gridTemplateColumns: `${chatCollapsed ? 0 : SIDE_W}px 1fr ${inspectorCollapsed ? 0 : SIDE_W}px` }"
  >
    <Toolbar class="layout__toolbar" />

    <ChatPanel v-show="!chatCollapsed" class="layout__chat" />
    <div class="layout__center">
      <ViewportPanel class="layout__viewport" />
    </div>
    <InspectorPanel v-show="!inspectorCollapsed" class="layout__inspector" />

    <!-- 折叠/展开按钮：贴在侧栏与中栏的分界线上 -->
    <button
      class="layout__toggle layout__toggle--chat"
      :style="{ left: `${chatCollapsed ? 0 : SIDE_W}px` }"
      :title="chatCollapsed ? '展开 AI 对话框' : '收起 AI 对话框'"
      @click="chatCollapsed = !chatCollapsed"
    >{{ chatCollapsed ? '▸' : '◂' }}</button>
    <button
      class="layout__toggle layout__toggle--inspector"
      :style="{ right: `${inspectorCollapsed ? 0 : SIDE_W}px` }"
      :title="inspectorCollapsed ? '展开属性 / DSL' : '收起属性 / DSL'"
      @click="inspectorCollapsed = !inspectorCollapsed"
    >{{ inspectorCollapsed ? '◂' : '▸' }}</button>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 320px 1fr 320px;
  grid-template-rows: 44px 1fr;
  grid-template-areas:
    'toolbar toolbar toolbar'
    'chat center inspector';
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  transition: grid-template-columns 0.2s ease;
}
.layout__toolbar {
  grid-area: toolbar;
}
.layout__chat {
  grid-area: chat;
  overflow: hidden;
  border-right: 1px solid #e5e7eb;
}
.layout__center {
  grid-area: center;
  display: grid;
  grid-template-rows: 1fr;
  min-width: 0;
  min-height: 0;
}
.layout__viewport {
  min-height: 0;
}
.layout__inspector {
  grid-area: inspector;
  overflow: hidden;
  border-left: 1px solid #e5e7eb;
}

/* 折叠/展开竖条按钮 */
.layout__toggle {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 80px;
  padding: 0;
  border: 1px solid #d0d4da;
  background: #f0f2f5;
  color: #666;
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: left 0.2s ease, right 0.2s ease, background 0.15s;
}
.layout__toggle:hover {
  background: #e2e6ec;
  color: #333;
}
.layout__toggle--chat {
  border-radius: 0 4px 4px 0;
  border-left: none;
}
.layout__toggle--inspector {
  border-radius: 4px 0 0 4px;
  border-right: none;
}
</style>
