# 架构设计

本文档描述 AI Three.js Editor 的分层、核心契约与扩展方式。Quick-start 见 [README.md](../README.md)。

## 1. 分层

```
┌───────────────────────────────────────────────┐
│  ui/        Vue 3 编辑器界面（视口/聊天/树/属性） │
├───────────────────────────────────────────────┤
│  ai/        自然语言 → SceneDSL（适配器 + 编排）  │  不碰 Three.js
├───────────────────────────────────────────────┤
│  domains/   业务领域（能源/工业/ICT/智能家居）     │  组合调用 capabilities
├───────────────────────────────────────────────┤
│  core/      引擎内核                            │  框架无关
│   ├─ dsl/          场景契约                    │
│   ├─ registry/     领域注册 + EditorContext     │
│   ├─ capabilities/ 公共能力（跨领域共享）        │
│   ├─ scene/        SceneBuilder                │
│   └─ engine/       EditorEngine                │
├───────────────────────────────────────────────┤
│  three/     Three.js 薄封装                     │
└───────────────────────────────────────────────┘
```

依赖方向自上而下。`core/` 不依赖 `ui/` 或 `ai/`；`ai/` 不依赖 `three/`。

## 2. 核心契约：SceneDSL

AI 产出的唯一产物，定义在 `src/core/dsl/types.ts`。引擎只消费 DSL。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `version` | `string` | DSL 版本，便于演进 |
| `domain` | `DomainKind` | 主导领域，决定路由到哪组 builder |
| `title` | `string?` | 场景标题 |
| `environment` | `EnvironmentDSL?` | 环境贴图（→ EnvironmentManager） |
| `lights` | `LightDSL[]` | 灯光（→ LightingManager） |
| `objects` | `SceneObjectDSL[]` | 场景对象（→ 各领域 ObjectBuilder） |
| `camera` | `CameraDSL?` | 初始相机（→ CameraAnimator.setView） |
| `cameraAnimation` | `CameraAnimationDSL?` | 相机动画（→ CameraAnimator.play） |
| `notes` | `string[]?` | AI 给用户的说明 |

`SceneObjectDSL` 关键字段：

- `type` — 对象类型，对应领域内某个 `ObjectBuilder.type`（如 `solar-panel-array`、`base-station`）。
- `domain` — 可选，缺省取顶层 `domain`，用于跨领域混排。
- `transform` — 位置/旋转/缩放。
- `params` — 领域专属参数，原样透传给 builder（如 `{rows, cols, tilt}`）。
- `children` — 嵌套对象。

## 3. 领域：Domain 接口

```ts
interface Domain {
  id: DomainKind;
  name: string;
  description: string;
  builders: ObjectBuilder[];   // 该领域能构建的对象类型集合
  assets?: string[];           // 引用的资产 key
  prompt?: DomainPrompt;       // 喂给 LLM 的领域知识
}
```

`ObjectBuilder`：`{ type: string; build(node, ctx): Object3D | Promise<Object3D> }`。`SceneBuilder` 用 `node.type` 在目标领域的 `builders` 中查表并调用，再统一套用 `transform`。

`DomainPrompt`（`ai/prompt/` 消费）：告诉 LLM 本领域有哪些 `type` 可用、各自参数、生成规则、few-shot 示例 DSL。`PromptBuilder` 把它拼进 system prompt。

## 4. 公共能力（capabilities）

所有领域通过 `EditorContext` 复用，单例由 `EditorEngine` 注入：

| 能力 | Manager | 职责 |
| --- | --- | --- |
| 模型生成（资产库加载） | `ModelFactory` | 按 key 从 `AssetRegistry` 取 `AssetEntry`，加载 GLB/GLTF，缓存并克隆实例化；未登记时返回占位盒体 |
| 灯光 | `LightManager` | 把 `LightDSL` 解释成 `THREE.Light` |
| 环境贴图 | `EnvironmentManager` | 应用 `EnvironmentDSL`（背景 / HDR） |
| 摄像头动画 | `CameraAnimator` | `setView` 设初始相机；`play` 跑 orbit/fly/spin 等动画；`update(dt)` 每帧推进 |
| 对象动画 | `AnimationManager` | 管理多个 `AnimationMixer` |

> 能力扩展步骤见 [CLAUDE.md](../CLAUDE.md) 的「新增公共能力」。

## 5. AI 流程

```
ChatPanel → chatStore.send(text)
   → editorStore.generate(text)            // 设置 loading
   → EditorEngine.generate(text, domain)
      → SceneGenerationOrchestrator.generate
         → PromptBuilder.build(domain, text)   // 组装 system(基础+领域) + user
         → LLMAdapter.generateScene(prompt)    // Mock 先返回示例 DSL
      → EditorEngine.applyScene(dsl)
         → SceneManager.clearContent()
         → CameraAnimator.setView / play
         → SceneBuilder.build(dsl)             // env + lights + objects
         → SceneManager.add(group)
   → editorStore.currentScene = dsl           // 驱动场景树/属性面板
```

`LLMAdapter` 抽象：`generateScene(prompt: GenerationPrompt): Promise<SceneDSL>`。实现：`MockLLMAdapter`（默认）、`ClaudeAdapter`（占位）。替换在 `EditorEngine` 构造里。

## 6. Three.js 封装

- `Renderer` — WebGLRenderer 包装（像素比、色彩空间、阴影）。
- `CameraRig` — PerspectiveCamera + OrbitControls，处理交互与 resize。
- `SceneManager` — 持有 `THREE.Scene`，`clearContent()` 清空并 `dispose()`。
- `utils/dispose.ts` — 递归释放几何/材质；`utils/transform.ts` — `applyTransform`。

## 7. 扩展配方

### 7.1 新增领域对象类型

在对应领域的 `builders/` 加一个 `ObjectBuilder`，注册进该 `Domain.builders`，并在 `DomainPrompt.objectTypes` 里登记（否则 LLM 不知道有这个 type）。

### 7.2 让领域复用一个公共能力

builder 里直接用 `ctx`：`const panel = await ctx.modelFactory.load('energy/solar-panel');`、`ctx.lighting.add({...})`。不要在领域里 new 这些 manager。

### 7.3 接真实资产

把 GLB 放进 `public/assets/models/<domain>/`，在领域 `assets.ts` 里登记 `AssetEntry`（key / url / format / scale）。`ModelFactory` 会缓存解析结果并克隆。
