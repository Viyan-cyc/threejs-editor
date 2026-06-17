import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { GenerateDSL, SceneObjectDSL } from '../../dsl/types';

/**
 * HunyuanModelGenerator —— 运行时调用腾讯混元3D生成高精度 GLB 的能力。
 *
 * 与 ModelFactory 的边界：
 *  - ModelFactory 加载**预登记**资产（AssetRegistry key → 静态 GLB）；
 *  - 本能力加载**运行时 AI 生成**资产（中文 prompt → 混元生成 GLB）。
 *
 * 流程：
 *  1. 同源 fetch POST /hunyuan3d/generate（vite dev middleware 拦截），
 *     middleware 内部 spawn 混元 skill 的 main.py，落盘 GLB 到 public/assets/generated/；
 *  2. 用 GLTFLoader 加载返回的本地 GLB URL；
 *  3. 归一化到单位包围盒（最长边=1，底部贴 y=0，x/z 居中），让上层 transform.scale 语义为「目标米数」；
 *  4. 内存缓存（key=prompt 串），同 prompt 二次命中走 clone，零网络零耗时。
 *
 * 复用 ModelFactory 的 loader + Map cache + clone(true) 范式。
 */
export class HunyuanModelGenerator {
  private readonly loader: GLTFLoader;
  /** key = JSON.stringify(params) → 已归一化的模板（wrapper group，克隆用） */
  private readonly cache = new Map<string, THREE.Object3D>();

  constructor() {
    this.loader = new GLTFLoader();
    // 混元等外部写实高精度 GLB 常用 Draco / meshopt 压缩网格；不配解码器 GLTFLoader 加载会失败。
    // draco decoder 用本地 public/draco/（避免 CDN 依赖），meshopt decoder 是纯 JS 模块直接挂载。
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    this.loader.setDRACOLoader(draco);
    this.loader.setMeshoptDecoder(MeshoptDecoder);
  }

  async generate(
    params: GenerateDSL,
    node: SceneObjectDSL,
    onProgress?: (text: string) => void,
  ): Promise<THREE.Object3D> {
    const key = JSON.stringify(params);
    const label = node.name ?? node.type;

    const cached = this.cache.get(key);
    if (cached) {
      onProgress?.(`加载已缓存：${label}…`);
      return cached.clone(true);
    }

    onProgress?.(`正在生成：${label}…`);
    const res = await fetch('/hunyuan3d/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: key,
    });
    // 先解析 body：middleware 失败时（502）会把人话 message 放在 body 里，
    // 不能因 !res.ok 就直接抛 status 码——那样会丢掉 message，让上层无从总结原因。
    let data: { url?: string; error?: string; message?: string } | null = null;
    try {
      data = (await res.json()) as { url?: string; error?: string; message?: string };
    } catch {
      /* body 非 JSON（如网络中断），保留 null 走兜底文案 */
    }
    if (!res.ok || data?.error || !data?.url) {
      throw new Error(data?.message ?? data?.error ?? `混元生成请求失败 ${res.status}`);
    }

    const wrapper = await this.loadAndNormalize(data.url, node.type);
    this.cache.set(key, wrapper);
    return wrapper.clone(true);
  }

  /** 加载 GLB 并归一化到单位包围盒（wrapper 包裹、开阴影），返回模板。 */
  private async loadAndNormalize(url: string, type: string): Promise<THREE.Group> {
    const gltf = await this.loader.loadAsync(url);
    // 用 wrapper 包裹：归一化作用在 gltf.scene 上，wrapper 保持干净 transform，
    // 供上层 SceneBuilder.applyTransform 正确叠加 position/rotation/scale。
    const wrapper = new THREE.Group();
    wrapper.name = `hunyuan:${type}`;
    wrapper.add(gltf.scene);
    this.normalize(gltf.scene);
    wrapper.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    return wrapper;
  }

  /**
   * 归一化：最长边缩放到 1，底部贴 y=0，x/z 中心对齐原点。
   * 直接 mutate 传入对象的 scale/position（gltf.scene）。
   */
  private normalize(obj: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxAxis = Math.max(size.x, size.y, size.z) || 1;
    obj.scale.multiplyScalar(1 / maxAxis);

    // scale 变化后重新计算包围盒，平移到原点（底部贴地、x/z 居中）
    const box2 = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    box2.getCenter(center);
    obj.position.x -= center.x;
    obj.position.z -= center.z;
    obj.position.y -= box2.min.y;
  }
}
