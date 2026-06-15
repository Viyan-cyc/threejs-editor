import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AssetRegistry } from './AssetRegistry';

/**
 * ModelFactory —— 模型生成能力（资产库加载实现）。
 *
 * - 按 key 从 AssetRegistry 取 AssetEntry，加载 GLB/GLTF；
 * - 解析结果缓存（仅解析一次），每次 load 返回克隆实例；
 * - 资产未登记或加载失败时返回**占位盒体**并打 warn，
 *   使流程在无真实资产时也能跑通（便于早期联调）。
 */
export class ModelFactory {
  private readonly loader = new GLTFLoader();
  /** key → 已解析的根 Object3D（模板，克隆用） */
  private readonly cache = new Map<string, THREE.Object3D>();

  constructor(private readonly registry: AssetRegistry) {}

  async load(key: string): Promise<THREE.Object3D> {
    const cached = this.cache.get(key);
    if (cached) return cached.clone(true);

    const entry = this.registry.get(key);
    if (!entry) {
      console.warn(`[ModelFactory] 资产未注册："${key}"，使用占位几何体。请在对应领域 assets.ts 登记。`);
      return this.placeholder(key);
    }

    try {
      const gltf = await this.loader.loadAsync(entry.url);
      const template = gltf.scene;
      if (entry.scale) template.scale.setScalar(entry.scale);
      template.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      });
      this.cache.set(key, template);
      return template.clone(true);
    } catch (err) {
      console.warn(`[ModelFactory] 资产加载失败："${key}" (${entry.url})，使用占位几何体。`, err);
      return this.placeholder(key);
    }
  }

  /** 占位几何体：带标签的半透明盒体，便于在缺资产时直观看到布局。 */
  private placeholder(label: string): THREE.Object3D {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x4a90d9,
      transparent: true,
      opacity: 0.85,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `placeholder:${label}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}
