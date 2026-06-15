import * as THREE from 'three';

/** WebGLRenderer 薄封装：像素比 / 色彩空间 / 阴影。 */
export class Renderer {
  readonly instance: THREE.WebGLRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.instance = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap;
    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 1.0;
  }

  /** updateStyle=false：用 CSS 控制画布尺寸，避免拉伸。 */
  setSize(width: number, height: number): void {
    this.instance.setSize(width, height, false);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.instance.render(scene, camera);
  }

  dispose(): void {
    this.instance.dispose();
  }
}
