import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useEditorStore } from './editorStore';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** 消息类型：text 普通气泡；thinking 可折叠「思考过程」块（流式填充）。默认 text。 */
  kind?: 'thinking' | 'text';
  /** 仅 thinking：是否仍在生成中（决定 summary 文案「思考中…」/「思考过程」）。 */
  thinking?: boolean;
}

/** 聊天 store —— 维护对话消息，发送时调用 editorStore.generate。 */
export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content: '你好！描述一个你想生成的 3D 场景，例如：「在南侧平地布置一片 8×12 的光伏阵列，旁边设一座升压站。」',
      kind: 'text',
    },
  ]);
  const input = ref('');
  let seq = 1;
  const nextId = () => ++seq;

  function push(role: ChatMessage['role'], content: string): void {
    messages.value.push({ id: nextId(), role, content, kind: 'text' });
  }

  /** 开始一条「思考过程」占位消息（流式填充前），返回其 id。 */
  function startThinking(): number {
    const id = nextId();
    messages.value.push({ id, role: 'assistant', content: '', kind: 'thinking', thinking: true });
    return id;
  }

  /** 流式追加思考增量到指定消息（Vue 3 深度响应式自动触发 UI 更新）。 */
  function appendThinking(id: number, delta: string): void {
    const m = messages.value.find((x) => x.id === id);
    if (m) m.content += delta;
  }

  /** 结束思考：若全程无内容（模型未提供思考过程）则移除空块，否则标记完成。 */
  function finishThinking(id: number): void {
    const idx = messages.value.findIndex((x) => x.id === id);
    if (idx === -1) return;
    const m = messages.value[idx];
    if (!m.content.trim()) {
      messages.value.splice(idx, 1);
    } else {
      m.thinking = false;
    }
  }

  async function send(text: string): Promise<void> {
    const editor = useEditorStore();
    const content = text.trim();
    if (!content || editor.loading) return;

    push('user', content);
    input.value = '';

    // 占位「思考过程」块，GLM 流式 reasoning 经 onReasoning 实时填充
    const thinkId = startThinking();
    try {
      const dsl = await editor.generate(content, {
        onReasoning: (delta) => appendThinking(thinkId, delta),
      });
      finishThinking(thinkId);
      if (dsl) {
        // notes 已被 normalizeSceneDSL 规范为 string[]
        push('assistant', dsl.notes?.join('\n') || '场景已生成。');
      } else {
        push('assistant', '生成失败：' + (editor.error ?? '未知错误'));
      }
    } catch (e) {
      finishThinking(thinkId);
      push('assistant', '生成失败：' + (e as Error).message);
    }
  }

  return { messages, input, send, push, startThinking, appendThinking, finishThinking };
});
