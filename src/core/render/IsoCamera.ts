import * as THREE from 'three';
import { clamp, lerp } from '../../utils/math.js';

/**
 * Câmera ortográfica em ângulo isométrico fixo. Segue um alvo (no coop, o
 * centróide do grupo) com suavização e faz zoom dinâmico para enquadrar todos
 * — ver docs/adr/0003-coop-camera.md.
 */
export class IsoCamera {
  frustum: number;
  minFrustum: number;
  maxFrustum: number;
  cam: THREE.OrthographicCamera;
  offset: THREE.Vector3;
  target: THREE.Vector3;
  _look: THREE.Vector3;
  shake: number;

  constructor() {
    this.frustum = 14; // metade da altura visível (em unidades de mundo)
    this.minFrustum = 11;
    this.maxFrustum = 28;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
    // Offset isométrico em relação ao alvo.
    this.offset = new THREE.Vector3(24, 28, 24);
    this.target = new THREE.Vector3(0, 0, 0);
    this._look = new THREE.Vector3();
    this.shake = 0;
    this.updateProjection();
  }

  addShake(amount) {
    this.shake = Math.min(1.2, this.shake + amount);
  }

  updateProjection() {
    const aspect = window.innerWidth / window.innerHeight;
    const f = this.frustum;
    this.cam.left = -f * aspect;
    this.cam.right = f * aspect;
    this.cam.top = f;
    this.cam.bottom = -f;
    this.cam.updateProjectionMatrix();
  }

  /**
   * @param {{x,z}} center alvo desejado
   * @param {number} spread maior distância entre jogadores (para zoom)
   * @param {number} dt
   */
  follow(center, spread, dt) {
    this.target.x = lerp(this.target.x, center.x, 1 - Math.pow(0.001, dt));
    this.target.z = lerp(this.target.z, center.z, 1 - Math.pow(0.001, dt));

    const desired = clamp(this.minFrustum + spread * 0.6, this.minFrustum, this.maxFrustum);
    const newF = lerp(this.frustum, desired, 1 - Math.pow(0.01, dt));
    if (Math.abs(newF - this.frustum) > 0.001) {
      this.frustum = newF;
      this.updateProjection();
    }

    // Screen shake (decai exponencialmente).
    let sx = 0, sz = 0;
    if (this.shake > 0) {
      const m = this.shake * this.shake * 1.6;
      sx = (Math.random() * 2 - 1) * m;
      sz = (Math.random() * 2 - 1) * m;
      this.shake = Math.max(0, this.shake - dt * 2.2);
    }

    this.cam.position.set(
      this.target.x + this.offset.x + sx,
      this.offset.y,
      this.target.z + this.offset.z + sz,
    );
    this._look.set(this.target.x + sx, 0, this.target.z + sz);
    this.cam.lookAt(this._look);
  }

  /** Converte coordenadas de tela (px) para um ponto no plano y=0 do mundo. */
  screenToGround(clientX, clientY) {
    const ndc = new THREE.Vector2(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.cam);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    ray.ray.intersectPlane(plane, hit);
    return hit ? { x: hit.x, z: hit.z } : null;
  }
}
