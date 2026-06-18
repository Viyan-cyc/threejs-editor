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

/**
 * 清洗 notes 里的技术实现措辞（混元/高精度模型/归一化/尺寸等）。
 * 这些是引擎运行时才确定、且可能失败/降级的细节，LLM 产出 DSL 时写进 notes 会与实际矛盾、误导用户。
 * 作为 prompt 约束的兜底：即使 LLM 漏听话，也保证对话框不出现矛盾文案。
 */
function sanitizeNote(line: string): string {
  return line
    // 去「采用/用/通过 … 高精度/混元/模型 … 生成」从句
    .replace(/[，,；;]?\s*(?:采用|用|通过|使用)[^，,。；;]*?(?:高精度|混元|模型)[^，,。；;]*?(?:生成|建模|制作)?[^，,。；;]*/g, '')
    // 去括号技术注释：（高精度模型）/（混元…）/（约0.45米）
    .replace(/[（(][^）(]*?(?:高精度|混元|模型|归一化|米)[^）(]*?[）)]/g, '')
    // 去散落的实现词汇
    .replace(/高精度(生成)?模型?/g, '')
    .replace(/混元(3D|高精度)?模型?/g, '')
    .replace(/归一化[^，,。；;]*/g, '')
    // 去尺寸「约X米」「体型约X米」
    .replace(/[，,；;]?\s*(?:体型)?约\s*[\d.]+\s*米/g, '')
    // 清理多余标点 / 首尾空白
    .replace(/\s*[，,]\s*[，,]/g, '，')
    .replace(/^[，,；;\s]+/, '')
    .replace(/[，,；;\s]+$/, '')
    .trim();
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
  /** 用户输入历史（按发送顺序，连续重复去重），供输入框上下箭头 recall。 */
  const history = ref<string[]>([]);
  let seq = 1;
  const nextId = () => ++seq;
  /** 本轮是否有混元对象生成失败（已降级）。send 开头重置，recordWarning 置位。 */
  let hadHunyuanFailure = false;

  function push(role: ChatMessage['role'], content: string): void {
    messages.value.push({ id: nextId(), role, content, kind: 'text' });
  }

  /** 混元失败警告：置本轮失败标志 + 推一条 system 消息（send 据此弱化 notes）。 */
  function recordWarning(content: string): void {
    hadHunyuanFailure = true;
    push('system', content);
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
    // 记录输入历史（与最近一条不同才记，避免连续重复）
    if (history.value[history.value.length - 1] !== content) {
      history.value.push(content);
    }
    input.value = '';
    hadHunyuanFailure = false; // 重置本轮失败标志

    // 占位「思考过程」块，GLM 流式 reasoning 经 onReasoning 实时填充
    const thinkId = startThinking();
    try {
      const dsl = await editor.generate(content, {
        onReasoning: (delta) => appendThinking(thinkId, delta),
      });
      finishThinking(thinkId);
      if (dsl) {
        if (hadHunyuanFailure) {
          // 本轮有对象生成失败（已降级占位盒体）：不展示 LLM 的乐观布局描述，避免误导
          push(
            'assistant',
            '场景已生成。其中部分对象因模型生成失败，已降级为灰色占位盒体（详见上方红色提示）。',
          );
        } else {
          // notes 已被 normalizeSceneDSL 规范为 string[]；清洗技术实现措辞后再展示
          const notes = (dsl.notes ?? []).map(sanitizeNote).filter((s) => s.trim());
          push('assistant', notes.join('\n') || '场景已生成。');
        }
      } else {
        push('assistant', '生成失败：' + (editor.error ?? '未知错误'));
      }
    } catch (e) {
      finishThinking(thinkId);
      push('assistant', '生成失败：' + (e as Error).message);
    }
  }

  return { messages, input, history, send, push, startThinking, appendThinking, finishThinking, recordWarning };
});
