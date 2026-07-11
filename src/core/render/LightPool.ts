import * as THREE from 'three';

/**
 * Pool de luzes pontuais (ADR 0065, M14.4): o forward renderer sofre com
 * muitas PointLights, então o mundo REGISTRA fontes (tochas, fogueiras,
 * janelas, braseiros) e o pool mantém só as N mais próximas do grupo acesas
 * — as demais continuam existindo como emissivo puro. Flicker de fogo por
 * luz e boost noturno (ADR 0049) aplicados aqui.
 */
const MAX_LIGHTS = 6;
const REPICK_EVERY = 0.35; // s — reescolher as mais próximas é barato, mas não precisa ser por frame

export class LightPool {
  game: any;
  regs: { x: number; y: number; z: number; color: number; intensity: number; seed: number; flicker: number }[];
  lights: THREE.PointLight[];
  _active: number[];
  _t: number;
  _repick: number;
  _lastC: { x: number; z: number } | null;

  constructor(game) {
    this.game = game;
    this.regs = [];
    this._active = [];
    this._t = 0;
    this._repick = 0;
    this._lastC = null;
    this.lights = [];
    for (let i = 0; i < MAX_LIGHTS; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 20, 1.9);
      game.renderer?.add(l);
      this.lights.push(l);
    }
  }

  /** Registra uma fonte de luz do mundo. `flicker` 0..1 (0 = luz firme). */
  register(x: number, y: number, z: number, color: number, intensity: number, flicker = 0.5) {
    this.regs.push({ x, y, z, color, intensity, seed: this.regs.length * 1.7 + x, flicker });
  }

  /** Marca a quantidade atual de luzes registradas — para descartar depois (E35). */
  mark() { return this.regs.length; }

  /**
   * Descarta luzes registradas a partir de `n` (interiores registram lâmpadas/
   * lareira/caldeirão por visita; ao sair, `truncate(mark)` limpa todas de uma
   * vez, evitando acúmulo). Força um repick para as removidas apagarem já.
   */
  truncate(n: number) {
    if (n >= 0 && n < this.regs.length) this.regs.length = n;
    this._active = [];
    this._lastC = null;
  }

  update(dt: number) {
    this._t += dt;
    this._repick += dt;
    const c = this.game.groupCenter ?? { x: 0, z: 0 };
    // Teleporte (fast-travel/masmorra) não espera o próximo repick.
    const jumped = this._lastC && Math.hypot(c.x - this._lastC.x, c.z - this._lastC.z) > 10;
    if (this._repick >= REPICK_EVERY || jumped || !this._lastC) {
      this._repick = 0;
      this._lastC = { x: c.x, z: c.z };
      // N mais próximas (seleção parcial simples — regs é pequeno).
      this._active = this.regs
        .map((r, i) => ({ i, d: (r.x - c.x) * (r.x - c.x) + (r.z - c.z) * (r.z - c.z) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, MAX_LIGHTS)
        .map((e) => e.i);
    }
    // De dia o sol lava as luzes pontuais (como no MCD, elas protagonizam à
    // noite e em masmorra); em masmorra não há dia — sem atenuação.
    const night = this.game.dayNight?.nightAmount?.() ?? 1;
    const dayDim = this.game.inDungeon ? 1 : 0.35 + 0.65 * night;
    const boost = (this.game.dayNight?.lightBoost?.() ?? 1) * dayDim;
    for (let s = 0; s < this.lights.length; s++) {
      const l = this.lights[s];
      const ri = this._active[s];
      if (ri === undefined) { l.intensity = 0; continue; }
      const r = this.regs[ri];
      l.position.set(r.x, r.y, r.z);
      l.color.setHex(r.color);
      const fl = 1 - r.flicker * 0.5 + r.flicker * 0.5 * Math.sin(this._t * 9 + r.seed) * Math.sin(this._t * 3.7 + r.seed * 2);
      l.intensity = r.intensity * boost * fl;
    }
  }
}
