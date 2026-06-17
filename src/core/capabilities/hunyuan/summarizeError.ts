/**
 * summarizeHunyuanError —— 把混元生成的原始错误（middleware/main.py 的技术 message）
 * 归类成「人话 + 一句原因」，供对话框系统消息展示。
 *
 * 为什么需要：middleware 失败时返回的 message 是面向排查的技术文案
 * （如 `main.py 退出码 1。AI3D_API_ERROR (AuthFailure.SecretKeyNotFound): …`），
 * 直接塞给用户既冗长又难懂。这里按关键字映射成一句可读原因，
 * 并补上「该对象已跳过」说明降级后果。
 */

/** 混元生成失败时面向用户的提示文案前缀。 */
const PREFIX = (label: string): string => `「${label}」混元生成失败`;

/**
 * 把原始错误归类成一句用户可读的原因。
 * 关键字匹配优先级：从上到下，首个命中即返回。
 */
function reasonOf(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('超时') || s.includes('timeout')) {
    return '生成超时（超过 10 分钟）';
  }
  if (
    s.includes('credentials') ||
    s.includes('credential') ||
    s.includes('secret_key') ||
    s.includes('secretkey') ||
    s.includes('authfailure') ||
    s.includes('unauthorized') ||
    s.includes('鉴权') ||
    s.includes('401') ||
    s.includes('403')
  ) {
    return '服务鉴权失败（请检查 .env.local 密钥）';
  }
  if (s.includes('无法启动 python3') || s.includes('python')) {
    return '未检测到 Python 运行环境';
  }
  // 兜底：截取原始 message 头部，去掉换行/堆栈噪音
  const head = raw.split('\n')[0].trim().slice(0, 80);
  return head || '未知错误';
}

/**
 * 生成完整的对话框提示文案。
 * @param label 对象名（node.name ?? node.type），用于指明是哪个对象失败
 * @param err   HunyuanModelGenerator 抛出的错误
 */
export function summarizeHunyuanError(label: string, err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return `${PREFIX(label)}：${reasonOf(raw)}。该对象已跳过。`;
}
