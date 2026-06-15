# CLAUDE.md

本文件为 Claude（及贡献者）在此仓库工作时的指引。详细设计见 [docs/architecture.md](docs/architecture.md)。

## 项目是什么

AI Three.js Editor：用户用自然语言描述需求，AI 产出**场景 DSL**，引擎把 DSL 解释成 Three.js 场景。支持多领域（能源 / 工业 / ICT / 智能家居），公共能力（灯光 / 环境贴图 / 摄像头动画 / 模型生成）跨领域复用。

技术栈：Vue 3 + Vite + TypeScript + Three.js + Pinia。AI 接入走适配器抽象层，当前默认 Mock 实现。

## 三条核心契约（改动前务必理解）

1. **SceneDSL 是 AI 与引擎之间唯一的契约**（`src/core/dsl/types.ts`）。AI 只产出 DSL，引擎只消费 DSL。任何「让 AI 直接操作 Three」的念头都要先变成 DSL 字段。
2. **领域通过 `Domain` 接口注册**（`src/core/registry/types.ts`）。一个领域 = 一组 `ObjectBuilder` + 资产清单 + 喂给 LLM 的领域知识（`DomainPrompt`）。`SceneBuilder` 按 `SceneObjectDSL.domain` 路由到对应领域。
3. **公共能力都挂在 `EditorContext` 上**（`src/core/registry/EditorContext.ts`），由 `EditorEngine` 注入。任何 `ObjectBuilder.build(node, ctx)` 都能拿到 `ctx.modelFactory / ctx.lighting / ctx.environment / ctx.camera`，不要在领域里自建这些单例。

## 目录约定

- `core/` 必须保持**框架无关**（不 import vue / pinia）。UI 只能通过 `ui/stores` + `core/engine/EditorEngine` 驱动它。
- `capabilities/` 是**所有领域共享**的横切能力；领域专属逻辑放 `domains/<name>/`，不要反过来把领域细节漏进 capabilities。
- `ai/` 只负责 NL → DSL，**不碰 Three.js**。
- 导入用相对路径；类型用 `import type`（`isolatedModules` 已开启）。
- 路径别名 `@/` 已在 tsconfig + vite 配置，但本仓库统一用相对路径以保持解析健壮。

## 常用任务

### 新增领域（例：交通）

1. 新建 `src/domains/transport/`，含：
   - `index.ts`：导出领域实例 `transportDomain`。
   - `TransportDomain.ts`：实现 `Domain` 接口，声明 `id='transport'`、`builders`、`assets`、`prompt`。
   - `builders/`：每个对象类型一个 `ObjectBuilder`（复杂逻辑用类，简单加载用 `_shared/assetBuilder.ts` 的 `makeAssetBuilder`）。
   - `assets.ts`：该领域资产清单（`AssetEntry[]`）。
   - `prompts.ts`：`DomainPrompt`（可生成的对象类型 + 参数 + few-shot）。
2. 在 `src/core/dsl/types.ts` 的 `DomainKind` 联合类型里加入 `'transport'`。
3. 在 `src/config/domains.config.ts` 的 `DOMAINS` 数组里注册。

### 新增公共能力（例：粒子系统）

1. 在 `src/core/capabilities/<name>/` 下新建 manager 类，提供解释 DSL 子结构的 API。
2. 在 `src/core/dsl/types.ts` 增加对应 DSL 子类型，并挂到 `SceneDSL`。
3. 把 manager 实例加到 `EditorContext`，在 `EditorEngine` 构造时创建并注入。
4. 在 `SceneBuilder.build()` 中调用它（多数能力由 builder 统一解释，领域 builder 通过 `ctx` 按需调用）。
5. `src/core/capabilities/index.ts` 补 barrel 导出。

### 接入真实 LLM

实现 `LLMAdapter`（`src/ai/adapter/LLMAdapter.ts`），在 `EditorEngine` 构造里替换 `MockLLMAdapter`。模型 ID / 鉴权等放在 `src/config/app.config.ts` 或环境变量，不要硬编码。

## 编辑器运行

- 视口由 `ui/components/viewport/ViewportPanel.vue` 挂载 `<canvas>` 并 `editorStore.attach(canvas)` 创建 `EditorEngine`。
- 聊天发送经 `chatStore.send()` → `editorStore.generate()` → `EditorEngine.generate()`。
- 渲染循环在 `EditorEngine.loop()`，每帧 `cameraAnimator.update(dt)` + `renderer.render()`。

## 对话日志（重要约定）

本项目要求**记录与 AI 的每次会话**，存放在 [docs/conversations/](docs/conversations/)：
- 每次新会话：在该目录新建 `YYYY-MM-DD-主题.md`（同一天多主题可合并或新建），并把新轮次**追加**进当天文件。
- 每完成一个有意义的轮次：追加 `## 轮次 N · 主题`，记录用户原文 + 助手动作 + 结果。
- 文件顶部写整体概要；更新 [docs/conversations/README.md](docs/conversations/README.md) 的索引表。
详细约定见该目录 README。该要求同时写入 Claude 项目记忆，会跨会话延续。

## 常见坑

- 三维资源需 `dispose()`，封装在 `three/utils/dispose.ts`；`SceneManager.clearContent()` 已统一调用。
- Mock 资产未注册时 `ModelFactory` 返回占位盒体并打 warn——跑通流程无需真实 GLB，但接 LLM 前请补真实资产或在 `assets.ts` 中登记。
- `isolatedModules` 开启：纯类型导入必须 `import type`。
