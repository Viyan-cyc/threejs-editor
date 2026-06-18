# 2026-06-18 · 布局调整：Inspector 下移、右侧新建 GUI 面板

## 概要

- Inspector（属性/DSL）从右侧移到**视口下方**（中列内部上下分：上视口 / 下属性）。
- 右侧原 Inspector 位置新建**占位 GUI 面板**（[GuiPanel.vue](../../src/ui/components/gui/GuiPanel.vue)），后续接入调试控件。
- 移除 Inspector 的折叠按钮（简化）；左栏 chat 折叠保留。

## 轮次 1 · Inspector 下移 + 右侧 GUI 占位

**用户**：「属性/DSL 面板放到下面，原面板存放gui」

**助手**：用户选定 Inspector「仅视口下方」+ 右侧「新建占位面板」。改动：

- 新建 [GuiPanel.vue](../../src/ui/components/gui/GuiPanel.vue) —— 占位（标题 GUI + 空内容「GUI 控件待接入」），仿 InspectorPanel 风格。
- 重写 [EditorLayout.vue](../../src/ui/components/layout/EditorLayout.vue)：
  - `grid-template-areas` 由 `'chat center inspector'` 改为 `'chat center gui'`；
  - `.layout__center` 的 `grid-template-rows` 从 `1fr` 改回 `1fr 240px`，把 `<InspectorPanel>` 移入 center 内部（视口下方）；
  - 右列挂 `<GuiPanel class="layout__gui">`；
  - 移除 `inspectorCollapsed` 状态与 Inspector 折叠按钮（右列固定 320px），保留左栏 chat 折叠。

**结果**：`npm run typecheck` 通过。布局现为：顶 toolbar / 左 chat / 中（上视口+下属性DSL）/ 右 GUI。HMR 即时生效。

## 轮次 2 · 右侧 GUI 接入 lil-gui（Three.js 调试面板）

**用户**：「右侧的gui存放three的gui面板」

**助手**：选 lil-gui（three.js 现用 GUI 库，dat.GUI 已停维护）。`npm install lil-gui`，重写 [GuiPanel.vue](../../src/ui/components/gui/GuiPanel.vue)：`onMounted` 用 `new GUI({ container })` 挂到面板，接 EditorEngine 的渲染器 / 相机做调试控件——渲染（曝光 toneMappingExposure、阴影 shadowMap.enabled）、相机（FOV / 近远裁面，改投影参数 onChange 调 `updateProjectionMatrix`）。engine 未就绪时 `watch(editor.engine)` 等 attach。`:deep(.lil-gui.root)` 让面板填满宽度。

**结果**：`npm run typecheck` 通过。右侧 GUI 面板现可实时调曝光 / 阴影 / 相机 FOV 等参数（拖动即时作用于视口）。后续可加灯光、环境、材质等控件。
