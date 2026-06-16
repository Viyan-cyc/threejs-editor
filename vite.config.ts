import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

// Vite 配置：Vue 插件 + `@/` 路径别名指向 src
export default defineConfig({
  plugins: [vue()],
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
});
