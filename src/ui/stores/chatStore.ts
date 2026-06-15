import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useEditorStore } from './editorStore';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/** 聊天 store —— 维护对话消息，发送时调用 editorStore.generate。 */
export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      content: '你好！描述一个你想生成的 3D 场景，例如：「在南侧平地布置一片 8×12 的光伏阵列，旁边设一座升压站。」',
    },
  ]);
  const input = ref('');
  let seq = 1;
  const nextId = () => ++seq;

  function push(role: ChatMessage['role'], content: string): void {
    messages.value.push({ id: nextId(), role, content });
  }

  async function send(text: string): Promise<void> {
    const editor = useEditorStore();
    const content = text.trim();
    if (!content || editor.loading) return;

    push('user', content);
    input.value = '';

    try {
      const dsl = await editor.generate(content);
      push('assistant', dsl?.notes?.join('\n') ?? '场景已生成。');
    } catch (e) {
      push('assistant', '生成失败：' + (e as Error).message);
    }
  }

  return { messages, input, send };
});
