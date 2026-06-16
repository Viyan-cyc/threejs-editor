# 2026-06-16 · 接入 threejs-devtools-mcp

## 概要

- 用户要求接入 [threejs-devtools-mcp](https://github.com/DmitriyGolub/threejs-devtools-mcp)，让 AI 能实时观察 / 调试本项目的 Three.js 场景。
- 该 MCP 经 stdio transport（`npx threejs-devtools-mcp`）启动，代理 Vite dev server（5173）到 `localhost:9222`，在页面注入 bridge，通过 Three.js 官方 `__THREE_DEVTOOLS__` API 抓取 Scene / Renderer，对外暴露 52 个工具。
- 新建项目级 MCP 配置 [.mcp.json](../../.mcp.json)，显式指定 `DEV_PORT=5173`。
- 全量梳理场景对象命名：顶层 / 分组本就有 name，叶子 mesh 普遍无 name（根源在 lowPoly 工具）；给 lowPoly + 4 个 builder 打 name，让 MCP 能按名定位对象（轮次 2）。
- 待用户重启 Claude Code 会话 + `npm run dev` 后验证 bridge 连通。

## 轮次 1 · 接入 threejs-devtools-mcp

**用户**：
> 我要接入这个mcp:https://github.com/DmitriyGolub/threejs-devtools-mcp，要怎么弄

**助手**：
- 拉取该 MCP 的 README，确认其工作原理与本项目兼容性。
- 检查本项目现状：[vite.config.ts](../../vite.config.ts) 固定端口 5173；Three `^0.169.0` 自带 devtools 注册（无需改代码）；当前无任何 MCP 配置。
- 新建项目级 [.mcp.json](../../.mcp.json)：

  ```json
  {
    "mcpServers": {
      "threejs-devtools-mcp": {
        "command": "npx",
        "args": ["-y", "threejs-devtools-mcp"],
        "env": { "DEV_PORT": "5173" }
      }
    }
  }
  ```

- 说明后续三步：重启会话加载 MCP（首次会弹信任确认）→ `npm run dev` → 在 9222 浏览器验证。
- 提醒：各 `ObjectBuilder` 产出的对象需有 `.name`，否则场景树全是 `(unnamed)`。

**结果**：配置文件已落地；需用户在 IDE 重启 Claude Code 后生效（项目级 MCP 首次加载需信任确认）。

## 轮次 2 · 给场景对象打 name（为 MCP 调试做准备）

**用户**：
> 好，你帮我看命名情况
> 好的，你直接改吧

**助手**：
- 全量扫描命名现状：顶层 / 分组（`root-scene`、`scene-objects`、`generic:*`、`placeholder:*`、`solar-panel-array`、`power-station`）均有 name；叶子 mesh（场景里数量最多的那批）几乎全无 name，根源在 [lowPoly.ts](../../src/three/utils/lowPoly.ts) 的 `lowPolyMesh` 不设 name。
- 按约定（叶子语义名 + 循环实例加索引）改 4 个文件：
  - [lowPoly.ts](../../src/three/utils/lowPoly.ts)：新增 `LowPolyShapeOpts`（含 `name?`），`lowPolyMesh` / `box` / `cylinder` / `cone` / `sphere` 全部透传 name —— 根源治理，所有调用点一行带名。
  - [SolarPanelFieldBuilder.ts](../../src/domains/energy/builders/SolarPanelFieldBuilder.ts)：模板构件 `panel.surface` / `panel.frame` / `panel.leg` / `panel.base`；25 块克隆板 `solar-panel.r{r}c{c}`。
  - [PowerStationBuilder.ts](../../src/domains/energy/builders/PowerStationBuilder.ts)：`base` / `transformer.{i}` / `insulator.{i}` / `cabinet` / `lightning.pole` / `lightning.tip`。
  - [assetBuilder.ts](../../src/domains/_shared/assetBuilder.ts)：加载结果 `asset:{key}`。
- 跑 `npm run typecheck`（vue-tsc --noEmit）通过，无报错。

**结果**：场景树从「一片 (unnamed)」变为可读的层级命名；重启会话 + `npm run dev` 后即可用 threejs-devtools-mcp 的 scene_tree / object_details 等工具按名定位对象。
