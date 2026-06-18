import * as THREE from 'three';
import { Renderer } from '../../three/Renderer';
import { CameraRig } from '../../three/CameraRig';
import { SceneManager } from '../../three/SceneManager';
import {
  AssetRegistry,
  ModelFactory,
  HunyuanModelGenerator,
  LightingManager,
  EnvironmentManager,
  CameraAnimator,
  AnimationManager,
} from '../capabilities';
import { DomainRegistry } from '../registry/DomainRegistry';
import type { EditorContext } from '../registry/EditorContext';
import { SceneBuilder } from '../scene/SceneBuilder';
import { createLLMAdapter } from '../../ai/adapter';
import { appConfig } from '../../config/app.config';
import { PromptBuilder } from '../../ai/prompt/PromptBuilder';
import { SceneGenerationOrchestrator } from '../../ai/orchestrator/SceneGenerationOrchestrator';
import { applyEditOps, isSceneEditDSL } from '../../ai/orchestrator/normalizeDSL';
import type { GenerateOptions } from '../../ai/types';
import { DOMAINS } from '../../config/domains.config';
import type { DomainKind, SceneDSL, SceneEditDSL, SceneEditOp, SceneObjectDSL } from '../dsl/types';
import { SCENE_DSL_VERSION } from '../dsl/types';

/**
 * EditorEngine —— 顶层协调器。
 *
 * 装配关系：
 *  - three 层：Renderer / CameraRig / SceneManager；
 *  - capabilities：AssetRegistry → ModelFactory、Lighting/Environment/Camera/Animation manager；
 *  - registry：注册 config 中的全部领域；
 *  - ai：LLMAdapter（按 appConfig.llm.adapter 选 glm/mock）+ PromptBuilder + Orchestrator；
 *  - 把 capabilities 聚合为 EditorContext，交给 SceneBuilder。
 *
 * 多轮增删改：
 *  - currentScene 持有当前完整 SceneDSL（会话状态），作为编辑模式的上下文；
 *  - objectRoot 是常驻 Group（不被 clearContent 清除），承载所有对象，便于按 id 增删；
 *  - instanceById 把对象 id → Object3D 实例，支撑 diff 时复用未改对象、精准增删改。
 *
 * 渲染循环在 loop()，由 UI 层 attach(canvas) 后 start()。
 */
export class EditorEngine {
  readonly renderer: Renderer;
  readonly rig: CameraRig;
  readonly sceneManager: SceneManager;

  readonly assetRegistry: AssetRegistry;
  readonly modelFactory: ModelFactory;
  readonly hunyuan: HunyuanModelGenerator;
  readonly lighting: LightingManager;
  readonly environment: EnvironmentManager;
  readonly cameraAnimator: CameraAnimator;
  readonly animationManager: AnimationManager;

  readonly domains: DomainRegistry;
  readonly sceneBuilder: SceneBuilder;
  readonly orchestrator: SceneGenerationOrchestrator;

  readonly ctx: EditorContext;

  /** 常驻对象根：承载所有场景对象，全量重建时也不被清除。 */
  private readonly objectRoot = new THREE.Group();
  /** 当前完整 SceneDSL（会话状态，编辑模式上下文 + 引擎 diff 基准）。 */
  private currentScene: SceneDSL | null = null;
  /** id → Object3D 实例（含子节点），支撑增量 diff。 */
  private readonly instanceById = new Map<string, THREE.Object3D>();

  private readonly clock = new THREE.Clock();
  private rafId = 0;
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.sceneManager = new SceneManager();
    this.objectRoot.name = 'object-root';
    this.sceneManager.add(this.objectRoot);
    this.rig = new CameraRig(canvas, 1);

    this.assetRegistry = new AssetRegistry();
    this.modelFactory = new ModelFactory(this.assetRegistry);
    this.hunyuan = new HunyuanModelGenerator();
    this.lighting = new LightingManager(this.sceneManager.scene);
    this.environment = new EnvironmentManager(this.sceneManager.scene, this.renderer.instance);
    this.cameraAnimator = new CameraAnimator(this.rig); // CameraRig 实现 CameraRigPort
    this.animationManager = new AnimationManager();

    this.domains = new DomainRegistry();
    DOMAINS.forEach((d) => this.domains.register(d));

    this.ctx = {
      scene: this.sceneManager.scene,
      modelFactory: this.modelFactory,
      hunyuan: this.hunyuan,
      lighting: this.lighting,
      environment: this.environment,
      camera: this.cameraAnimator,
      onProgress: undefined,
      onWarning: undefined,
    };

    this.sceneBuilder = new SceneBuilder(this.domains, this.ctx);

    const promptBuilder = new PromptBuilder(this.domains);
    const adapter = createLLMAdapter(appConfig.llm); // 'glm'（真实模型，走 vite proxy）| 'mock'
    this.orchestrator = new SceneGenerationOrchestrator(adapter, promptBuilder);
  }

  /** 启动渲染循环。 */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    window.addEventListener('resize', this.onResize);
    this.onResize();
    this.loop();
  }

  /** 停止并释放资源。 */
  dispose(): void {
    this.stop();
    this.renderer.dispose();
    this.rig.dispose();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
  }

  /**
   * 自然语言 → 场景（多轮）。
   * - 首次 / 重新生成：orchestrator 返回完整 SceneDSL → 全量重建。
   * - 编辑：orchestrator 返回 SceneEditDSL → 合并到 currentScene → 按 id diff。
   */
  async generate(
    naturalLanguage: string,
    domain: DomainKind,
    opts?: GenerateOptions,
  ): Promise<SceneDSL> {
    const result = await this.orchestrator.generate(naturalLanguage, domain, {
      currentScene: this.currentScene,
      ...opts, // 透传 onReasoning / signal / model
    });

    let nextScene: SceneDSL;
    let isCreate: boolean;
    if (isSceneEditDSL(result)) {
      if (this.currentScene) {
        nextScene = applyEditOps(this.currentScene, result);
        // 用本次 ops 的精确摘要替代 LLM 的 notes——edit 模式下 LLM 倾向重述整个场景（含未改对象），不可靠
        nextScene.notes = summarizeEditOps(result.ops, this.currentScene);
        isCreate = false;
      } else {
        // 防御：编辑产物但无上一份场景（理论不发生）→ 退化为最小完整场景
        nextScene = editToScene(result, domain);
        isCreate = true;
      }
    } else {
      nextScene = result; // 完整 SceneDSL（已在 orchestrator 内 normalize + assignIds）
      isCreate = true;
    }

    await this.applyScene(nextScene, { previous: this.currentScene, isCreate });
    this.currentScene = nextScene;
    return nextScene;
  }

  /** 重置会话：丢弃当前场景与所有对象实例（供「新建场景」UI / 测试用）。 */
  resetSession(): void {
    this.currentScene = null;
    this.clearObjectRoot();
    this.lighting.clear();
    this.environment.clear();
  }

  /** 注入进度回调：SceneBuilder 生成对象（混元等耗时步骤）时回传文案，由 UI 层接线显示。 */
  setProgressHandler(fn: (text: string) => void): void {
    this.ctx.onProgress = fn;
  }

  /** 注入警告回调：对象级非致命失败（如混元生成失败被跳过）时回传文案，由 UI 层接线为对话框系统消息。 */
  setWarningHandler(fn: (text: string) => void): void {
    this.ctx.onWarning = fn;
  }


  /**
   * 用 DSL 应用场景。
   * - isCreate / previous 为空：全量重建（清内容 + 重建环境/灯光/相机/对象）。
   * - 否则：按 id 增量 diff（未改对象复用实例，环境/相机仅在变化时更新）。
   */
  async applyScene(
    dsl: SceneDSL,
    opts: { previous?: SceneDSL | null; isCreate?: boolean } = {},
  ): Promise<void> {
    const previous = opts.previous ?? null;
    const isCreate = opts.isCreate ?? previous === null;

    if (isCreate) {
      this.sceneManager.clearExcept([this.objectRoot]);
      if (dsl.environment) this.environment.apply(dsl.environment);
      this.lighting.clear();
      this.lighting.apply(dsl.lights ?? []);
      this.applyCamera(dsl);

      this.clearObjectRoot();
      const objs = await this.sceneBuilder.buildObjectTree(dsl.objects ?? [], dsl.domain);
      for (const obj of objs) {
        this.objectRoot.add(obj);
        this.indexInstance(obj);
      }
      return;
    }

    await this.applyDiff(previous as SceneDSL, dsl);
  }

  /** 增量 diff：对象按 id 增删改；灯光全量替换；环境/相机仅在变化时更新。 */
  private async applyDiff(previous: SceneDSL, dsl: SceneDSL): Promise<void> {
    await this.diffObjects(previous.objects ?? [], dsl.objects ?? [], dsl.domain);

    // 灯光：LightingManager 是累加的，每次先 clear 再 apply（开销小，无需 diff）。
    this.lighting.clear();
    this.lighting.apply(dsl.lights ?? []);

    // 环境：仅在变化时更新（避免无谓重设背景）。
    if (!deepEqual(previous.environment, dsl.environment)) {
      this.environment.clear();
      if (dsl.environment) this.environment.apply(dsl.environment);
    }

    // 相机：仅在变化时更新 —— 这是「编辑不打断用户轨道视角」的保证。
    if (!deepEqual(previous.camera, dsl.camera) || !deepEqual(previous.cameraAnimation, dsl.cameraAnimation)) {
      this.applyCamera(dsl);
    }
  }

  /**
   * 顶层对象按 id diff（v1 粒度：顶层；某顶层对象内容变则整体重建含其 children）。
   * - 新 id → buildSingle + 挂到 parent + 入 map；
   * - 消失 id → disposeAndRemove + 出 map；
   * - 同 id 但内容变 → 重建（dispose 旧 + build 新）；
   * - 同 id 且内容同 → 复用实例，不动。
   */
  private async diffObjects(
    prevNodes: SceneObjectDSL[],
    newNodes: SceneObjectDSL[],
    fallbackDomain: DomainKind,
  ): Promise<void> {
    const prevById = new Map<string, SceneObjectDSL>();
    for (const n of prevNodes) if (n.id) prevById.set(n.id, n);
    const newIds = new Set(newNodes.map((n) => n.id).filter((id): id is string => !!id));

    // 删除：prev 中不再存在的 id
    for (const [id] of prevById) {
      if (!newIds.has(id)) {
        const inst = this.instanceById.get(id);
        if (inst) {
          this.unindexInstance(inst);
          this.sceneManager.disposeAndRemove(inst);
        }
      }
    }

    // 新增 / 修改（按 newNodes 顺序）
    for (const node of newNodes) {
      const id = node.id;
      if (!id) continue; // assignIds 已保证有 id
      const prevNode = prevById.get(id);
      if (!prevNode) {
        const obj = await this.sceneBuilder.buildSingle(node, fallbackDomain);
        this.objectRoot.add(obj);
        this.indexInstance(obj);
      } else if (!sameObject(prevNode, node)) {
        const oldInst = this.instanceById.get(id);
        if (oldInst) {
          this.unindexInstance(oldInst);
          this.sceneManager.disposeAndRemove(oldInst);
        }
        const obj = await this.sceneBuilder.buildSingle(node, fallbackDomain);
        this.objectRoot.add(obj);
        this.indexInstance(obj);
      }
      // 其余：内容相同 → 复用，不动
    }
  }

  /** 按 dsl 应用相机（位姿 + 动画）。 */
  private applyCamera(dsl: SceneDSL): void {
    if (dsl.camera) this.cameraAnimator.setView(dsl.camera);
    if (dsl.cameraAnimation) this.cameraAnimator.play(dsl.cameraAnimation);
    else this.cameraAnimator.stop();
  }

  /** 清空 objectRoot 的所有子对象并释放，同步清空实例映射。 */
  private clearObjectRoot(): void {
    for (const child of [...this.objectRoot.children]) {
      this.sceneManager.disposeAndRemove(child);
    }
    this.instanceById.clear();
  }

  /** 把对象（含子树）的 userData.dslId 登记到实例映射。 */
  private indexInstance(root: THREE.Object3D): void {
    root.traverse((n) => {
      const id = n.userData?.dslId;
      if (typeof id === 'string') this.instanceById.set(id, n);
    });
  }

  /** 把对象（含子树）的 id 从实例映射移除。 */
  private unindexInstance(root: THREE.Object3D): void {
    root.traverse((n) => {
      const id = n.userData?.dslId;
      if (typeof id === 'string') this.instanceById.delete(id);
    });
  }

  private loop = (): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);
    const dt = this.clock.getDelta();
    this.cameraAnimator.update(dt);
    this.animationManager.update(dt);
    this.renderer.render(this.sceneManager.scene, this.rig.camera);
  };

  private onResize = (): void => {
    const w = this.renderer.instance.domElement.clientWidth || window.innerWidth;
    const h = this.renderer.instance.domElement.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.rig.resize(w / h);
  };
}

// ---------------------------------------------------------------------------
// 纯工具函数（模块级）
// ---------------------------------------------------------------------------

/** 规范化对象为可比较字符串（递归含 children 内容；顶层 diff 据此判断是否变化）。 */
function canon(n: SceneObjectDSL): string {
  return JSON.stringify({
    type: n.type,
    domain: n.domain,
    name: n.name,
    transform: n.transform,
    params: n.params,
    children: (n.children ?? []).map(canon),
  });
}

/** 两个对象节点（含子树）是否内容一致。 */
function sameObject(a: SceneObjectDSL, b: SceneObjectDSL): boolean {
  return canon(a) === canon(b);
}

/** 粗略深比较（DSL 为纯 JSON 结构，JSON 序列化相等即视为相等）。 */
function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * 把本次 edit ops 摘要为给用户看的 notes。
 * 不信任 LLM 的 notes（edit 模式下它倾向重述整个场景、含未改对象），改由引擎按 ops 精确生成。
 */
function summarizeEditOps(ops: SceneEditOp[], prev: SceneDSL | null): string[] {
  const byId = new Map<string, SceneObjectDSL>();
  const walk = (n: SceneObjectDSL): void => {
    if (n.id) byId.set(n.id, n);
    for (const c of n.children ?? []) walk(c);
  };
  for (const n of prev?.objects ?? []) walk(n);

  const out: string[] = [];
  for (const op of ops) {
    if (op.op === 'add') {
      out.push(`新增「${op.object.name ?? op.object.type}」`);
    } else if (op.op === 'update') {
      const n = byId.get(op.id);
      out.push(`修改「${n?.name ?? n?.type ?? op.id}」`);
    } else if (op.op === 'remove') {
      const n = byId.get(op.id);
      out.push(`删除「${n?.name ?? n?.type ?? op.id}」`);
    }
  }
  return out;
}

/** 防御：把编辑产物降级为最小完整 SceneDSL（无上一份场景时用）。 */
function editToScene(edit: SceneEditDSL, domain: DomainKind): SceneDSL {
  return {
    version: SCENE_DSL_VERSION,
    domain: edit.domain ?? domain,
    lights: edit.lights ?? [],
    objects: [],
    environment: edit.environment,
    camera: edit.camera,
    cameraAnimation: edit.cameraAnimation,
    notes: edit.notes,
  };
}
