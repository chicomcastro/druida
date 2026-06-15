import * as THREE from 'three';

/** Wrapper fino do Three.js: cena, renderer WebGL, luzes e resize. */
export class Renderer {
  canvas: HTMLCanvasElement;
  three: THREE.WebGLRenderer;
  scene: THREE.Scene;
  sun: THREE.DirectionalLight;

  constructor(canvas) {
    this.canvas = canvas;
    this.three = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.three.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.three.shadowMap.enabled = true;
    this.three.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1410);
    this.scene.fog = new THREE.Fog(0x0d1410, 45, 90);

    const hemi = new THREE.HemisphereLight(0x9fd08a, 0x24341f, 0.8);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff2c0, 1.2);
    sun.position.set(18, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = 40;
    sun.shadow.camera.left = -s;
    sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;
    sun.shadow.camera.bottom = -s;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 120;
    this.scene.add(sun);
    this.sun = sun;

    window.addEventListener('resize', () => this.resize());
  }

  add(obj) {
    this.scene.add(obj);
  }
  remove(obj) {
    this.scene.remove(obj);
  }

  setBiomeMood({ background, fogNear, fogFar }) {
    if (background !== undefined) {
      this.scene.background = new THREE.Color(background);
      this.scene.fog.color = new THREE.Color(background);
    }
    if (fogNear !== undefined) this.scene.fog.near = fogNear;
    if (fogFar !== undefined) this.scene.fog.far = fogFar;
  }

  resize() {
    this.three.setSize(window.innerWidth, window.innerHeight, false);
  }

  render(camera) {
    this.three.render(this.scene, camera);
  }
}
