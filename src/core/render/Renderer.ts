import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Passe final barato: vignette suave + leve realce de saturação/contraste —
 * o "grade" que separa render cru de imagem com direção (ADR 0054).
 */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    vignette: { value: 0.32 },
    saturation: { value: 1.12 },
    contrast: { value: 1.05 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform float saturation;
    uniform float contrast;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(l), c.rgb, saturation);
      c.rgb = (c.rgb - 0.5) * contrast + 0.5;
      float d = distance(vUv, vec2(0.5));
      c.rgb *= 1.0 - smoothstep(0.42, 0.85, d) * vignette;
      gl_FragColor = c;
    }
  `,
};

/**
 * Wrapper fino do Three.js: cena, renderer WebGL, luzes e resize.
 * Realismo/atmosfera: tone mapping ACES, iluminação por bioma (sol +
 * hemisfério recoloridos via `setBiomeMood`) e sol que segue o grupo para que
 * as sombras existam em todo o mundo, não só perto da origem.
 * Ver docs/adr/0042-atmosfera-visual.md.
 */
export class Renderer {
  canvas: HTMLCanvasElement;
  three: THREE.WebGLRenderer;
  scene: THREE.Scene;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  _sunOffset: THREE.Vector3;
  _groundTex: THREE.Texture | null;
  _base: any;
  _tmpBg?: THREE.Color;
  _nightBg?: THREE.Color;
  composer: any;
  bloom: any;
  post: boolean;
  sky: THREE.Mesh | null;
  _skyMat: THREE.ShaderMaterial | null;

  constructor(canvas) {
    this.canvas = canvas;
    this.three = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.three.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.three.shadowMap.enabled = true;
    this.three.shadowMap.type = THREE.PCFSoftShadowMap;
    this.three.toneMapping = THREE.ACESFilmicToneMapping;
    this.three.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1410);
    this.scene.fog = new THREE.Fog(0x0d1410, 45, 90);

    const hemi = new THREE.HemisphereLight(0x9fd08a, 0x24341f, 0.8);
    this.scene.add(hemi);
    this.hemi = hemi;

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
    this.scene.add(sun.target);
    this.sun = sun;
    this._sunOffset = new THREE.Vector3(18, 30, 12);
    this._groundTex = null;

    // Céu com gradiente (domo, ADR 0054): horizonte com brilho em vez de cor
    // chapada. Cores derivadas do background do bioma em setBiomeMood.
    this._skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x0a1010) }, bottom: { value: new THREE.Color(0x1a2a1e) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 1.6 + 0.35, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }',
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(380, 24, 12), this._skyMat);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    // Pós-processamento (ADR 0054): bloom sutil nos emissivos (lanternas,
    // cristais, chamas) + vignette/grade. MSAA preservado via samples=4.
    this.post = true;
    this.composer = new EffectComposer(this.three);
    (this.composer.renderTarget1 as any).samples = 4;
    (this.composer.renderTarget2 as any).samples = 4;
    this.composer.addPass(new RenderPass(this.scene, new THREE.Camera())); // câmera trocada por frame
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.65, 0.82);
    this.composer.addPass(this.bloom);
    // OutputPass aplica tone mapping ACES + sRGB (sem ele o composer sai
    // linear e a cena fica escura); o grade roda por último, já em sRGB.
    this.composer.addPass(new OutputPass());
    this.composer.addPass(new ShaderPass(GradeShader));

    // Nitidez (ADR 0052): dimensiona o buffer JÁ na criação — sem isso o
    // canvas fica no tamanho default (300×150) esticado por CSS até o
    // primeiro resize da janela (blur forte, pior em tablet, onde o evento
    // nunca dispara). visualViewport cobre rotação/zoom em mobile.
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
  }

  add(obj) {
    this.scene.add(obj);
  }
  remove(obj) {
    this.scene.remove(obj);
  }

  /**
   * Clima do bioma: fundo/névoa e, se o bioma definir `light`, a cor e a
   * intensidade do sol/hemisfério — cada região ganha luz própria.
   */
  setBiomeMood({ background, fogNear, fogFar, light }: any) {
    if (background !== undefined) {
      this.scene.background = new THREE.Color(background);
      this.scene.fog.color = new THREE.Color(background);
    }
    if (fogNear !== undefined) this.scene.fog.near = fogNear;
    if (fogFar !== undefined) this.scene.fog.far = fogFar;
    if (light) {
      if (light.sun !== undefined) this.sun.color.setHex(light.sun);
      if (light.sunIntensity !== undefined) this.sun.intensity = light.sunIntensity;
      if (light.hemi !== undefined) this.hemi.color.setHex(light.hemi);
      if (light.hemiGround !== undefined) this.hemi.groundColor.setHex(light.hemiGround);
      if (light.hemiIntensity !== undefined) this.hemi.intensity = light.hemiIntensity;
    }
    // Base do dia/noite (ADR 0049): applyDayNight modula a partir daqui.
    const bg = (this.scene.background as THREE.Color).clone();
    this._base = {
      bg,
      fogNear: this.scene.fog.near,
      fogFar: this.scene.fog.far,
      sunI: this.sun.intensity,
      hemiI: this.hemi.intensity,
      // Céu: topo mais profundo, horizonte com brilho (derivado do bioma).
      skyTop: bg.clone().multiplyScalar(0.5),
      skyBottom: bg.clone().lerp(new THREE.Color(0xfff2d0), 0.22),
    };
    this._skyMat?.uniforms.top.value.copy(this._base.skyTop);
    this._skyMat?.uniforms.bottom.value.copy(this._base.skyBottom);
  }

  /**
   * Modula a cena pela hora do mundo: 0 = dia pleno (base do bioma),
   * 1 = noite (escurece fundo/névoa e reduz sol/hemisfério). Chamado por
   * frame; `fogMul` aproxima a névoa durante clima fechado.
   */
  applyDayNight(night: number, fogMul = 1) {
    if (!this._base) return;
    this._tmpBg = this._tmpBg ?? new THREE.Color();
    this._nightBg = this._nightBg ?? new THREE.Color(0x060a14);
    this._tmpBg.copy(this._base.bg).lerp(this._nightBg, night * 0.78);
    (this.scene.background as THREE.Color).copy(this._tmpBg);
    this.scene.fog.color.copy(this._tmpBg);
    this.scene.fog.near = this._base.fogNear * fogMul;
    this.scene.fog.far = this._base.fogFar * (1 - night * 0.22) * fogMul;
    this.sun.intensity = this._base.sunI * (1 - night * 0.72);
    this.hemi.intensity = this._base.hemiI * (1 - night * 0.45);
    // Céu acompanha a hora: escurece o topo mais rápido que o horizonte.
    if (this._skyMat) {
      this._skyMat.uniforms.top.value.copy(this._base.skyTop).lerp(this._nightBg, night * 0.9);
      this._skyMat.uniforms.bottom.value.copy(this._base.skyBottom).lerp(this._nightBg, night * 0.7);
    }
  }

  /** Move o sol junto do grupo: sombras corretas em qualquer canto do mundo. */
  updateSun(center) {
    this.sun.position.set(center.x + this._sunOffset.x, this._sunOffset.y, center.z + this._sunOffset.z);
    this.sun.target.position.set(center.x, 0, center.z);
    this.sun.target.updateMatrixWorld();
  }

  /**
   * Textura procedural de ruído para o chão (variação sutil de tom, quebra o
   * "verde chapado"). Gerada uma vez via canvas; multiplicada pela cor do
   * bioma no material do chão.
   */
  groundTexture() {
    if (this._groundTex) return this._groundTex;
    if (typeof document === 'undefined') return null;
    const size = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 900; i++) {
      const r = 3 + Math.random() * 14;
      const dark = Math.random() < 0.55;
      const a = 0.03 + Math.random() * 0.08;
      ctx.fillStyle = dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(26, 26);
    this._groundTex = tex;
    return tex;
  }

  resize() {
    // Reaplica o pixel ratio: muda ao arrastar entre telas ou dar zoom.
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.three.setPixelRatio(dpr);
    this.three.setSize(window.innerWidth, window.innerHeight, false);
    this.composer?.setSize(window.innerWidth, window.innerHeight);
    this.composer?.setPixelRatio?.(dpr);
  }

  /** Liga/desliga o pós-processamento (toggle de qualidade no menu). */
  setPostEnabled(on: boolean) {
    this.post = on;
  }

  /** O domo do céu acompanha o grupo (chamado junto do updateSun). */
  followSky(center) {
    this.sky?.position.set(center.x, 0, center.z);
  }

  render(camera) {
    if (this.post && this.composer) {
      (this.composer.passes[0] as any).camera = camera;
      this.composer.render();
    } else {
      this.three.render(this.scene, camera);
    }
  }
}
