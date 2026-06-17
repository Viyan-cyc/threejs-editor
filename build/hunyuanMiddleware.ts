/**
 * hunyuanMiddleware —— dev 期 Node 侧中间层，把「浏览器 → 腾讯混元3D」打通。
 *
 * 为什么需要它：混元 skill 是 Python 脚本（main.py 调腾讯云 SDK），要 Python 运行时 +
 * 服务端密钥；浏览器无法直连（无 Python、密钥会泄漏、COS 跨域）。本中间层在 vite
 * configureServer 里注册，拦截 POST /hunyuan3d/generate，spawn main.py 生成 GLB，
 * 下载落盘到 public/assets/generated/（缓存 + 绕开 COS 24h 过期与跨域），返回本地 URL。
 *
 * 位置在项目根 build/（而非 src/）：这是 Node/构建侧代码，依赖 node: 内置模块与 vite 的
 * Connect 类型，故放在 tsconfig.include（src/**）之外，不参与 vue-tsc 类型检查——与
 * vite.config.ts 同理。仅被 vite.config.ts 引用。
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { Connect, ViteDevServer } from 'vite';
import type { GenerateDSL } from '../src/core/dsl/types';

const ENDPOINT = '/hunyuan3d/generate';
/** 混元生成 1~5 分钟，给足 10 分钟上限（与 main.py 的 max-poll 一致）。 */
const TIMEOUT_MS = 600_000;

export interface HunyuanMiddlewareOptions {
  /** vite publicDir 绝对路径；GLB 落盘到其下 assets/generated/。 */
  publicDir: string;
  /** 混元 skill 的 scripts 目录绝对路径（含 main.py）。 */
  skillScriptsDir: string;
  /** loadEnv 加载的环境变量（含非 VITE_ 前缀的 TENCENTCLOUD_* 密钥）。 */
  env: Record<string, string>;
}

interface GenerateResponse {
  url?: string;
  cached?: boolean;
  error?: string;
  message?: string;
}

/** 读请求 body 为字符串。 */
function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer | string) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/** prompt+opts → 16 位 hash，仅用作落盘文件名（与前端内存 cache key 无关）。 */
function hashOf(params: GenerateDSL): string {
  const raw = `${params.prompt}|${params.model ?? '3.0'}|${params.enablePbr ? 'pbr' : ''}|${params.generateType ?? 'Normal'}|${params.faceCount ?? ''}`;
  return createHash('sha1').update(raw).digest('hex').slice(0, 16);
}

/** spawn `python3 main.py --stdin`，env 注入密钥；返回完整 stdout 字符串，stderr 透传到终端。 */
function runSkill(opts: HunyuanMiddlewareOptions, params: GenerateDSL): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    // main.py --stdin 读取的 JSON 字段名（snake_case），见 skill scripts/main.py:206-222
    const payload = JSON.stringify({
      prompt: params.prompt,
      model: params.model ?? '3.0',
      enable_pbr: params.enablePbr ?? true,
      face_count: params.faceCount,
      generate_type: params.generateType,
    });

    const proc = spawn('python3', ['main.py', '--stdin'], {
      cwd: opts.skillScriptsDir,
      env: { ...process.env, ...opts.env },
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('混元生成超时（>10 分钟）'));
    }, TIMEOUT_MS);

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      process.stderr.write(chunk); // 透传 [INFO] 轮询日志，便于观察进度
    });
    proc.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(new Error(`无法启动 python3：${err.message}（请确认已安装 python3 与 pip）`));
    });
    proc.on('close', (code: number | null) => {
      clearTimeout(timer);
      if (code !== 0) {
        // main.py 失败时把 error JSON 打到 stdout（AI3D_API_ERROR / UNEXPECTED_ERROR），优先解析它
        let detail = `stderr 末尾：${stderr.slice(-300)}`;
        try {
          const errJson = JSON.parse(stdout.trim()) as { error?: string; message?: string; code?: string };
          if (errJson.error || errJson.message) {
            detail = `${errJson.error ?? ''}${errJson.code ? ` (${errJson.code})` : ''}: ${errJson.message ?? ''}`;
          }
        } catch {
          /* stdout 非 JSON，保留 stderr detail */
        }
        console.error('[hunyuan-mw] main.py 失败（code=' + code + '）。stdout:', stdout, '\nstderr:', stderr);
        reject(new Error(`main.py 退出码 ${code}。${detail}`));
        return;
      }
      resolvePromise(stdout);
    });

    proc.stdin.write(payload);
    proc.stdin.end();
  });
}

/** 从 main.py stdout（JSON）里提取 glb 文件的 COS URL。 */
function extractGlbUrl(stdout: string): string {
  const trimmed = stdout.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const s = trimmed.indexOf('{');
    const e = trimmed.lastIndexOf('}');
    if (s === -1 || e === -1) throw new Error('混元输出无法解析为 JSON');
    parsed = JSON.parse(trimmed.slice(s, e + 1));
  }
  const result = parsed as { result_files?: Array<{ type?: string; url?: string }> };
  // 腾讯云返回的 Type 是大写 'GLB'/'OBJ'，此处大小写不敏感匹配
  const glb = result?.result_files?.find((f) => f.type?.toLowerCase() === 'glb' && f.url);
  if (!glb?.url) throw new Error('混元输出中未找到 glb 文件 URL');
  return glb.url;
}

/** 下载远程 GLB（COS URL）到本地路径。 */
async function downloadTo(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载 GLB 失败 ${res.status}：${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
}

function send(res: Connect.ServerResponse, status: number, body: GenerateResponse): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

/**
 * 注册混元3D dev middleware。
 * - 命中落盘缓存（publicDir/assets/generated/<hash>.glb 已存在）→ 直接返回本地 URL，零生成；
 * - 否则 spawn 混元 skill 生成、下载落盘、返回本地 URL。
 */
export function installHunyuanMiddleware(server: ViteDevServer, opts: HunyuanMiddlewareOptions): void {
  const generatedDir = join(opts.publicDir, 'assets', 'generated');

  // 诊断端点（调试用）：前端把加载结果 POST 过来打印到日志。TODO 验证后删
  server.middlewares.use('/hunyuan3d/diag', async (req: Connect.IncomingMessage, res: Connect.ServerResponse) => {
    if (req.method === 'POST') {
      try {
        console.log('[hunyuan-diag]', await readBody(req));
      } catch {
        /* ignore */
      }
    }
    res.setHeader('Content-Type', 'text/plain');
    res.end('ok');
  });

  server.middlewares.use(ENDPOINT, async (req: Connect.IncomingMessage, res: Connect.ServerResponse) => {
    if (req.method !== 'POST') {
      send(res, 405, { error: 'METHOD_NOT_ALLOWED', message: '仅支持 POST' });
      return;
    }

    let params: GenerateDSL;
    try {
      params = JSON.parse(await readBody(req)) as GenerateDSL;
    } catch (err) {
      send(res, 400, { error: 'BAD_REQUEST', message: `请求体解析失败：${(err as Error).message}` });
      return;
    }
    if (!params?.prompt || typeof params.prompt !== 'string') {
      send(res, 400, { error: 'BAD_REQUEST', message: '缺少 generate.prompt' });
      return;
    }

    const hash = hashOf(params);
    const localPath = join(generatedDir, `${hash}.glb`);
    const localUrl = `/assets/generated/${hash}.glb`;

    // 命中落盘缓存
    const cached = await fs.stat(localPath).then(
      () => true,
      () => false,
    );
    if (cached) {
      send(res, 200, { url: localUrl, cached: true });
      return;
    }

    // 调混元 skill 生成
    try {
      const stdout = await runSkill(opts, params);
      const glbUrl = extractGlbUrl(stdout);
      console.log('[hunyuan-mw] 生成完成，下载落盘中:', localUrl);
      await fs.mkdir(generatedDir, { recursive: true });
      await downloadTo(glbUrl, localPath);
      console.log('[hunyuan-mw] 落盘成功:', localPath);
      send(res, 200, { url: localUrl, cached: false });
    } catch (err) {
      console.error('[hunyuan-mw] 生成/落盘失败:', (err as Error).message);
      send(res, 502, { error: 'HUNYUAN_FAILED', message: (err as Error).message });
    }
  });
}
