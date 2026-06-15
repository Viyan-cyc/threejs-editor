<script setup lang="ts">
import { useChatStore } from '../../stores/chatStore';
import { useEditorStore } from '../../stores/editorStore';
import type { DomainKind } from '../../../core/dsl/types';

const chat = useChatStore();
const editor = useEditorStore();

const domains: Array<{ id: DomainKind; label: string }> = [
  { id: 'energy', label: '能源' },
  { id: 'industrial', label: '工业' },
  { id: 'ict', label: 'ICT' },
  { id: 'smart-home', label: '智能家居' },
];

function submit(): void {
  void chat.send(chat.input);
}
</script>

<template>
  <div class="chat">
    <div class="chat__messages">
      <div
        v-for="m in chat.messages"
        :key="m.id"
        class="chat__msg"
        :class="`chat__msg--${m.role}`"
      >
        <span class="chat__role">{{ m.role === 'user' ? '我' : m.role === 'assistant' ? 'AI' : '系统' }}</span>
        <div class="chat__bubble">{{ m.content }}</div>
      </div>
    </div>

    <div class="chat__composer">
      <select v-model="editor.currentDomain" class="chat__domain">
        <option v-for="d in domains" :key="d.id" :value="d.id">{{ d.label }}</option>
      </select>
      <input
        v-model="chat.input"
        class="chat__input"
        type="text"
        placeholder="描述你想生成的场景…（回车发送）"
        :disabled="editor.loading"
        @keydown.enter="submit"
      />
      <button class="chat__send" :disabled="editor.loading || !chat.input.trim()" @click="submit">
        生成
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}
.chat__messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chat__msg {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.chat__role {
  font-size: 11px;
  color: #888;
}
.chat__bubble {
  padding: 8px 10px;
  border-radius: 8px;
  background: #f0f2f5;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
}
.chat__msg--user .chat__bubble {
  background: #d9ecff;
}
.chat__composer {
  display: flex;
  gap: 6px;
  padding: 8px;
  border-top: 1px solid #e5e7eb;
}
.chat__domain {
  border: 1px solid #d0d4da;
  border-radius: 4px;
  padding: 0 6px;
  background: #fff;
}
.chat__input {
  flex: 1;
  border: 1px solid #d0d4da;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 13px;
}
.chat__send {
  border: none;
  background: #2f6fed;
  color: #fff;
  border-radius: 4px;
  padding: 0 16px;
  cursor: pointer;
}
.chat__send:disabled {
  background: #9bb6e6;
  cursor: not-allowed;
}
</style>
