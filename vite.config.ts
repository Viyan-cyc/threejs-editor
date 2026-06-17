import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { installHunyuanMiddleware } from './build/hunyuanMiddleware';

// Vite 配置：Vue 插件 + `@/` 路径别名指向 src + GLM dev proxy + 混元3D dev middleware
export default defineConfig(({ mode }) => {
  // loadEnv 第三参 '' 表示加载**所有**前缀的变量（含非 VITE_ 前缀的 TENCENTCLOUD_*）。
  // 这些密钥仅供 Node 侧 middleware 注入到 Python 子进程，不会进前端 bundle。
  const env = loadEnv(mode, process.cwd(), '');

  const publicDir = fileURLToPath(new URL('./public', import.meta.url));
  const skillScriptsDir = fileURLToPath(
    new URL('./.claude/skills/hy-3d-generation-1.0.0/scripts', import.meta.url),
  );

  return {
    plugins: [
      vue(),
      // 混元3D dev middleware：拦截 POST /hunyuan3d/generate，spawn 混元 skill 生成 GLB。
      // 注意：configureServer 是「插件 hook」，必须放在 plugins[] 的插件对象里；
      // 若误放进 server: {} 配置项，vite 不识别、不会调用，middleware 永不注册（请求全 404）。
      {
        name: 'hunyuan-3d-middleware',
        configureServer(server) {
          installHunyuanMiddleware(server, { publicDir, skillScriptsDir, env });
          console.log('[vite] 混元3D middleware 已注册：POST /hunyuan3d/generate');
        },
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      open: true,
      // GLM（智谱 BigModel）不支持浏览器直连（无 CORS 头），用 dev proxy 同源转发。
      // 前端 fetch '/llm/...' → 'https://open.bigmodel.cn/...'。生产部署需自建后端代理。
      proxy: {
        '/llm': {
          target: 'https://open.bigmodel.cn',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/llm/, ''),
        },
      },
    },
  };
});
