/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

interface ImportMetaEnv {
  /** 智谱 GLM API Key（见 .env.local.example） */
  readonly VITE_GLM_API_KEY?: string;
  /** 可选：覆盖默认模型 ID */
  readonly VITE_GLM_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
