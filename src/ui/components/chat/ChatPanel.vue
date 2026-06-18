<script setup lang="ts">
import { ref } from 'vue';
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

/** 输入历史 recall 游标：-1 = 当前编辑（非 recall 状态）；>=0 = 正在显示 history[idx]。 */
const histIdx = ref(-1);

/** 切换到更早一条历史输入。 */
function recallPrev(): void {
  const h = chat.history;
  if (!h.length) return;
  histIdx.value = histIdx.value < 0 ? h.length - 1 : Math.min(histIdx.value + 1, h.length - 1);
  chat.input = h[histIdx.value];
}
/** 切换到更新一条，到底则清空回到当前编辑。 */
function recallNext(): void {
  if (histIdx.value < 0) return;
  histIdx.value -= 1;
  chat.input = histIdx.value < 0 ? '' : chat.history[histIdx.value];
}

/** ↑ 键：光标在第一行时 recall 更早一条，否则让浏览器正常移动光标（不影响多行编辑）。 */
function onArrowUp(e: KeyboardEvent): void {
  if (e.isComposing) return;
  const ta = e.target as HTMLTextAreaElement;
  const firstLineEnd = ta.value.indexOf('\n');
  if (ta.selectionStart > (firstLineEnd === -1 ? ta.value.length : firstLineEnd)) return;
  e.preventDefault();
  recallPrev();
}
/** ↓ 键：光标在最后一行时 recall 更新一条，否则让浏览器正常移动光标。 */
function onArrowDown(e: KeyboardEvent): void {
  if (e.isComposing) return;
  const ta = e.target as HTMLTextAreaElement;
  const lastLineStart = ta.value.lastIndexOf('\n');
  if (ta.selectionStart <= lastLineStart) return;
  e.preventDefault();
  recallNext();
}

function submit(): void {
  void chat.send(chat.input).then(() => {
    histIdx.value = -1; // 发送后回到当前编辑态
  });
}

/** 回车发送，但过滤中文输入法（IME）组词状态：组词时按回车仅用于确认候选词，不应触发发送。 */
function onEnterKey(e: KeyboardEvent): void {
  if (e.isComposing) return;
  submit();
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
        <details v-if="m.kind === 'thinking'" class="chat__thinking" open>
          <summary class="chat__thinking-summary">
            {{ m.thinking ? '思考中…' : '思考过程' }}
          </summary>
          <div class="chat__thinking-body">{{ m.content }}</div>
        </details>
        <div v-else class="chat__bubble">{{ m.content }}</div>
      </div>
    </div>

    <div class="chat__composer">
      <div class="chat__row">
        <select v-model="editor.currentDomain" class="chat__domain">
          <option v-for="d in domains" :key="d.id" :value="d.id">{{ d.label }}</option>
        </select>
        <button class="chat__send" :disabled="editor.loading || !chat.input.trim()" @click="submit">
          生成
        </button>
      </div>
      <textarea
        v-model="chat.input"
        class="chat__input"
        rows="3"
        placeholder="描述你想生成的场景…（回车发送，↑↓ 切换历史输入）"
        :disabled="editor.loading"
        @keydown.enter="onEnterKey"
        @keydown.up="onArrowUp"
        @keydown.down="onArrowDown"
      />
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
.chat__msg--user {
  align-items: flex-end;
}
.chat__msg--user .chat__bubble {
  background: #d9ecff;
  text-align: right;
}
.chat__msg--assistant {
  align-items: flex-start;
}
.chat__msg--system .chat__bubble {
  background: #fdecec;
  border-left: 3px solid #e5484d;
  color: #c01a2a;
}
.chat__thinking {
  background: #f6f7f9;
  border: 1px solid #e5e7eb;
  border-left: 3px solid #c0c4cc;
  border-radius: 8px;
  color: #6b7280;
  font-size: 12px;
}
.chat__thinking-summary {
  padding: 6px 10px;
  cursor: pointer;
  user-select: none;
  color: #8a8f99;
  list-style: none;
}
.chat__thinking-summary::-webkit-details-marker {
  display: none;
}
.chat__thinking-summary::before {
  content: '▸ ';
  color: #b0b4bb;
}
.chat__thinking[open] .chat__thinking-summary::before {
  content: '▾ ';
}
.chat__thinking-body {
  padding: 0 10px 8px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}
.chat__composer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-top: 1px solid #e5e7eb;
}
.chat__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chat__domain {
  width: 84px;
  box-sizing: border-box;
  border: 1px solid #d0d4da;
  border-radius: 4px;
  padding: 4px 6px;
  background: #fff;
  font-size: 13px;
}
.chat__input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d0d4da;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: none;
}
.chat__send {
  width: 84px;
  box-sizing: border-box;
  border: none;
  background: #2f6fed;
  color: #fff;
  border-radius: 4px;
  padding: 4px 16px;
  cursor: pointer;
  font-size: 13px;
}
.chat__send:disabled {
  background: #9bb6e6;
  cursor: not-allowed;
}
</style>
