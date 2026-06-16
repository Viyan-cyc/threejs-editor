import * as THREE from 'three';
import { Renderer } from '../../three/Renderer';
import { CameraRig } from '../../three/CameraRig';
import { SceneManager } from '../../three/SceneManager';
import {
  AssetRegistry,
  ModelFactory,
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
import { DOMAINS } from '../../config/domains.config';
import type { DomainKind, SceneDSL } from '../dsl/types';

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
 * 渲染循环在 loop()，由 UI 层 attach(canvas) 后 start()。
 */
export class EditorEngine {
  readonly renderer: Renderer;
  readonly rig: CameraRig;
  readonly sceneManager: SceneManager;

  readonly assetRegistry: AssetRegistry;
  readonly modelFactory: ModelFactory;
  readonly lighting: LightingManager;
  readonly environment: EnvironmentManager;
  readonly cameraAnimator: CameraAnimator;
  readonly animationManager: AnimationManager;

  readonly domains: DomainRegistry;
  readonly sceneBuilder: SceneBuilder;
  readonly orchestrator: SceneGenerationOrchestrator;

  readonly ctx: EditorContext;

  private readonly clock = new THREE.Clock();
  private rafId = 0;
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.sceneManager = new SceneManager();
    this.rig = new CameraRig(canvas, 1);

    this.assetRegistry = new AssetRegistry();
    this.modelFactory = new ModelFactory(this.assetRegistry);
    this.lighting = new LightingManager(this.sceneManager.scene);
    this.environment = new EnvironmentManager(this.sceneManager.scene, this.renderer.instance);
    this.cameraAnimator = new CameraAnimator(this.rig); // CameraRig 实现 CameraRigPort
    this.animationManager = new AnimationManager();

    this.domains = new DomainRegistry();
    DOMAINS.forEach((d) => this.domains.register(d));

    this.ctx = {
      scene: this.sceneManager.scene,
      modelFactory: this.modelFactory,
      lighting: this.lighting,
      environment: this.environment,
      camera: this.cameraAnimator,
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

  /** 自然语言 → 场景。 */
  async generate(naturalLanguage: string, domain: DomainKind): Promise<SceneDSL> {
    const dsl = await this.orchestrator.generate(naturalLanguage, domain);
    await this.applyScene(dsl);
    return dsl;
  }

  /** 用 DSL 重建当前场景（环境/灯光/对象/相机）。 */
  async applyScene(dsl: SceneDSL): Promise<void> {
    this.sceneManager.clearContent();
    if (dsl.camera) this.cameraAnimator.setView(dsl.camera);
    if (dsl.cameraAnimation) this.cameraAnimator.play(dsl.cameraAnimation);
    else this.cameraAnimator.stop();

    const root = await this.sceneBuilder.build(dsl);
    this.sceneManager.add(root);
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
