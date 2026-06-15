# AI Three.js Editor

通过**自然语言描述**生成 3D 场景的可视化编辑器。内置多领域（能源 / 工业 / ICT / 智能家居）场景能力，并提供所有领域共享的通用能力（摄像头动画、环境贴图、灯光、模型生成等）。

## ✨ 特性

- 🗣️ **自然语言驱动**：用一句话描述场景，AI 产出场景描述（**DSL**），引擎解释为 Three.js 对象。
- 🧩 **领域分层**：每个业务领域独立封装、按需注册；公共能力统一沉淀到 `capabilities` 层供所有领域复用。
- 🔌 **AI 适配器抽象**：先内置 Mock 实现跑通全流程，后续可零成本接入 Claude / OpenAI。
- 🧱 **资产库模型生成**：通过 `ModelFactory` 加载 GLB/GLTF 资产并实例化。
- 🖼️ **编辑器界面**：3D 视口、场景树、属性面板、聊天输入区。

## 🚀 快速开始

```bash
npm install
npm run dev
```

浏览器打开 Vite 提示的地址，在底部聊天框输入场景描述即可，例如：

> 在南侧平地布置一片 8×12 的光伏阵列，旁边设一座升压站。

默认 AI 为 Mock 实现，会按当前领域直接产出示例场景；接入真实 LLM 后将根据描述细化。

## 📜 脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run preview` | 预览构建产物 |
| `npm run typecheck` | 仅做类型检查 |

## 🏗️ 架构概览

整体分为四层（自底向上）：

1. **three 层** — 对 Three.js（渲染器、相机、场景）的薄封装。
2. **core 层** — 引擎内核：场景 DSL、领域注册中心、**共享能力（capabilities）**、场景构建器、引擎协调器。
3. **domains 层** — 各业务领域（能源 / 工业 / ICT / 智能家居），组合调用共享能力。
4. **ai 层** — 自然语言 → DSL 的适配器与编排；**ui 层** 为 Vue 3 编辑器界面。

核心数据流：

```
用户自然语言
   │  (ChatPanel)
   ▼
SceneGenerationOrchestrator ──► PromptBuilder（注入领域知识）
   │
   ▼
LLMAdapter（Mock / Claude / OpenAI）
   │  产出
   ▼
SceneDSL（JSON，AI 与引擎的契约）
   │
   ▼
SceneBuilder ──► DomainRegistry（找领域）──► ObjectBuilder（构建对象）
   │              └─ 共享 capabilities：Lighting / Environment / Camera / ModelFactory
   ▼
THREE.Scene → 渲染
```

> 详细设计与字段定义见 [docs/architecture.md](docs/architecture.md)。

## 📁 目录结构

```
threejs-editor/
├─ index.html
├─ package.json · vite.config.ts · tsconfig.json · env.d.ts
├─ README.md · CLAUDE.md
├─ docs/architecture.md
├─ public/assets/                # 静态资产（按领域分子目录）
│  ├─ models/{energy,industrial,ict,smart-home}/   # GLB/GLTF
│  └─ environments/              # HDR 环境贴图
└─ src/
   ├─ main.ts · App.vue
   ├─ core/                      # 引擎内核（框架无关）
   │  ├─ dsl/                    #   场景 DSL：AI 与引擎的契约
   │  ├─ registry/               #   领域注册中心 + EditorContext
   │  ├─ scene/SceneBuilder.ts   #   DSL → THREE.Object3D
   │  ├─ engine/EditorEngine.ts  #   顶层协调器
   │  └─ capabilities/           #   公共通用能力（所有领域共享）
   │     ├─ models/  lighting/  environment/  camera/  animation/
   │     └─ index.ts
   ├─ domains/                   # 业务领域
   │  ├─ _shared/assetBuilder.ts
   │  ├─ energy/  industrial/  ict/  smart-home/
   ├─ ai/                        # 自然语言 → DSL
   │  ├─ adapter/  prompt/  orchestrator/
   ├─ three/                     # Three.js 薄封装（Renderer/CameraRig/SceneManager）
   ├─ config/                    # app/domains 运行时配置
   └─ ui/                        # Vue 编辑器界面
      ├─ components/  stores/  composables/
```

## ➕ 如何扩展

- **新增领域** → 见 [CLAUDE.md](CLAUDE.md) 的「新增领域」。
- **新增公共能力** → 见「新增公共能力」。
- **接入真实 LLM** → 实现 `LLMAdapter`，在 [src/core/engine/EditorEngine.ts](src/core/engine/EditorEngine.ts) 中替换 `MockLLMAdapter`。

## 🛠️ 技术栈

Vue 3 · Vite · TypeScript · Three.js · Pinia
