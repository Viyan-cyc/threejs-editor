import * as THREE from 'three';
import type { TransformDSL } from '../../core/dsl/types';

/** 把 TransformDSL 应用到 Object3D（position/rotation/scale）。 */
export function applyTransform(object: THREE.Object3D, transform?: TransformDSL): void {
  if (!transform) return;
  if (transform.position) {
    object.position.set(transform.position[0], transform.position[1], transform.position[2]);
  }
  if (transform.rotation) {
    object.rotation.set(transform.rotation[0], transform.rotation[1], transform.rotation[2]);
  }
  if (transform.scale !== undefined) {
    if (typeof transform.scale === 'number') {
      object.scale.setScalar(transform.scale);
    } else {
      object.scale.set(transform.scale[0], transform.scale[1], transform.scale[2]);
    }
  }
}
