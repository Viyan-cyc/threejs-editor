<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import GUI from 'lil-gui';
import type { Mesh, MeshStandardMaterial, Object3D } from 'three';
import { useEditorStore } from '../../stores/editorStore';
import type { EditorEngine } from '../../../core/engine/EditorEngine';
import type { SceneDSL, SceneObjectDSL } from '../../../core/dsl/types';

/** lil-gui 挂载容器。 */
const container = ref<HTMLElement | null>(null);
let gui: GUI | null = null;
let objectsFolder: GUI | null = null;
let lightsFolder: GUI | null = null;
let stopEngineWatch: (() => void) | null = null;
let stopSceneWatch: (() => void) | null = null;

/** 静态调试控件：渲染 / 相机。 */
function buildStaticFolders(engine: EditorEngine): void {
  if (!container.value || gui) return;
  gui = new GUI({ container: container.value });

  const renderer = engine.renderer.instance;
  const camera = engine.rig.camera;

  const renderFolder = gui.addFolder('渲染');
  renderFolder.add(renderer, 'toneMappingExposure', 0, 3, 0.01).name('曝光');
  renderFolder.add(renderer.shadowMap, 'enabled').name('阴影');

  const camFolder = gui.addFolder('相机');
  camFolder.add(camera, 'fov', 20, 100, 1).name('视野 FOV').onChange(() => camera.updateProjectionMatrix());
  camFolder.add(camera, 'near', 0.01, 5, 0.01).name('近裁面').onChange(() => camera.updateProjectionMatrix());
  camFolder.add(camera, 'far', 100, 10000, 10).name('远裁面').onChange(() => camera.updateProjectionMatrix());
}

/** 收集一个 Object3D 下所有 PBR 材质（builder 用 MeshStandardMaterial）。 */
function collectMaterials(obj: Object3D): MeshStandardMaterial[] {
  const mats: MeshStandardMaterial[] = [];
  obj.traverse((o) => {
    const m = (o as Mesh).material;
    if (!m) return;
    const list = Array.isArray(m) ? m : [m];
    for (const x of list) {
      if ((x as MeshStandardMaterial).isMeshStandardMaterial) mats.push(x as MeshStandardMaterial);
    }
  });
  return mats;
}

/** 按 type 聚合：同类型对象共享一个「颜色 / 不透明度」控件，调一个全部联动。 */
function rebuildObjects(engine: EditorEngine, scene: SceneDSL): void {
  objectsFolder?.destroy();
  objectsFolder = gui!.addFolder('场景对象');

  const byType = new Map<string, MeshStandardMaterial[]>();
  const visit = (node: SceneObjectDSL): void => {
    if (node.id) {
      const obj = engine.getObject3D(node.id);
      if (obj) {
        const mats = collectMaterials(obj);
        if (mats.length) {
          const list = byType.get(node.type) ?? [];
          list.push(...mats);
          byType.set(node.type, list);
        }
      }
    }
    for (const c of node.children ?? []) visit(c);
  };
  for (const n of scene.objects ?? []) visit(n);

  for (const [type, mats] of byType) {
    const target = {
      color: '#' + (mats[0].color.getHexString() ?? 'ffffff'),
      opacity: mats[0].opacity ?? 1,
      metalness: mats[0].metalness ?? 0,
      roughness: mats[0].roughness ?? 0,
    };
    const f = objectsFolder!.addFolder(type);
    f.addColor(target, 'color')
      .name('颜色')
      .onChange((v: unknown) => {
        for (const m of mats) m.color.set(v as string);
      });
    f.add(target, 'opacity', 0, 1, 0.01)
      .name('不透明度')
      .onChange((v: number) => {
        for (const m of mats) {
          m.transparent = v < 1;
          m.opacity = v;
          m.needsUpdate = true;
        }
      });
    f.add(target, 'metalness', 0, 1, 0.01)
      .name('金属度')
      .onChange((v: number) => {
        for (const m of mats) m.metalness = v;
      });
    f.add(target, 'roughness', 0, 1, 0.01)
      .name('粗糙度')
      .onChange((v: number) => {
        for (const m of mats) m.roughness = v;
      });
  }
  objectsFolder.close(); // 类型可能较多，默认折叠
}

/** 灯光：每盏一个 folder，强度 / 颜色（实时绑 THREE.Light）。 */
function rebuildLights(engine: EditorEngine): void {
  lightsFolder?.destroy();
  lightsFolder = gui!.addFolder('灯光');
  const lights = engine.lighting.getLights();
  lights.forEach((light, i) => {
    const f = lightsFolder!.addFolder(light.name || `${light.type} ${i + 1}`);
    f.add(light, 'intensity', 0, 8, 0.05).name('强度');
    const colorTarget = { color: '#' + light.color.getHexString() };
    f.addColor(colorTarget, 'color')
      .name('颜色')
      .onChange((v: unknown) => light.color.set(v as string));
  });
  lightsFolder.close();
}

function init(engine: EditorEngine): void {
  buildStaticFolders(engine);
  const editor = useEditorStore();
  if (editor.currentScene) {
    rebuildObjects(engine, editor.currentScene);
    rebuildLights(engine);
  }
  // 场景变化（新生成 / 编辑）时重建对象 / 灯光 folder
  stopSceneWatch = watch(
    () => editor.currentScene,
    (scene) => {
      if (!gui) return;
      if (scene) {
        rebuildObjects(engine, scene);
        rebuildLights(engine);
      } else {
        objectsFolder?.destroy();
        objectsFolder = null;
        lightsFolder?.destroy();
        lightsFolder = null;
      }
    },
  );
}

onMounted(() => {
  const editor = useEditorStore();
  if (editor.engine) {
    init(editor.engine);
  } else {
    // engine 在 ViewportPanel 挂载后才 attach，这里等它就绪
    stopEngineWatch = watch(
      () => editor.engine,
      (engine) => {
        if (engine) init(engine);
      },
    );
  }
});

onBeforeUnmount(() => {
  stopEngineWatch?.();
  stopSceneWatch?.();
  gui?.destroy();
  gui = null;
});
</script>

<template>
  <div class="gui">
    <div class="gui__header">GUI</div>
    <div ref="container" class="gui__body"></div>
  </div>
</template>

<style scoped>
.gui {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fafbfc;
}
.gui__header {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #555;
  border-bottom: 1px solid #e5e7eb;
  text-transform: uppercase;
}
.gui__body {
  flex: 1;
  overflow: auto;
}
/* lil-gui container 模式：让它填满面板宽度 */
/* macOS 系统风：浅灰底（sidebar 灰）+ 白控件 + 大圆角 + 系统蓝强调 + 系统字体 */
.gui__body :deep(.lil-gui) {
  --background-color: #ececec;
  --text-color: #1d1d1f;
  --title-background-color: #dcdcdc;
  --title-text-color: #1d1d1f;
  --widget-color: #ffffff;
  --hover-color: #d8d8d8;
  --focus-color: #007aff;
  --number-color: #007aff;
  --string-color: #1d1d1f;
  --font-size: 12px;
  --font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  --widget-border-radius: 6px;
  --widget-height: 22px;
  --title-height: 28px;
  --spacing: 6px;
  --padding: 8px;
  --name-width: 45%;
}
/* 滑轨圆角细条 + 系统蓝填充 */
.gui__body :deep(.lil-gui .lil-slider) {
  background: #cfcfcf;
  border-radius: 3px;
}
.gui__body :deep(.lil-gui .lil-fill) {
  background: #007aff;
}
/* 输入：白底 + 细边框 + 圆角，聚焦蓝边 */
.gui__body :deep(.lil-gui input:not([type='checkbox'])) {
  background: #ffffff;
  border: 1px solid #cfcfcf;
  border-radius: 4px;
}
.gui__body :deep(.lil-gui input:not([type='checkbox']):focus) {
  border-color: #007aff;
}
/* 根宽度填满 */
.gui__body :deep(.lil-gui.lil-root) {
  width: 100%;
}
</style>
