import * as THREE from 'three';

/**
 * Números de dano flutuantes (ADR 0056): pool de divs projetados do mundo
 * para a tela (feedback "juicy" clássico de ARPG). Branco/amarelo = dano
 * causado, vermelho = dano sofrido pelo jogador, verde = cura. Sobem e somem
 * em ~0.7s; pool com teto para hordas.
 */
const POOL = 28;
const LIFE = 0.75;

export class DamageNumbers {
  game: any;
  _pool: { el: HTMLElement; t: number; x: number; z: number; rise: number }[];
  _v: THREE.Vector3;

  constructor(game) {
    this.game = game;
    this._v = new THREE.Vector3();
    this._pool = [];
    const host = document.getElementById('hud-root') ?? document.body;
    for (let i = 0; i < POOL; i++) {
      const el = document.createElement('div');
      el.className = 'dmgnum';
      el.style.display = 'none';
      host.appendChild(el);
      this._pool.push({ el, t: 0, x: 0, z: 0, rise: 0 });
    }

    game.on('damage', (e) => {
      if (e.dot && e.amount < 3) return; // ticks pequenos de DoT não poluem
      const isPlayer = !!game.world.get(e.id, 'PlayerControlled');
      this.spawn(e.x ?? 0, e.z ?? 0, Math.round(e.amount), isPlayer ? '#ff6a6a' : '#ffe9b0');
    });
    game.on('heal', (e) => {
      const tr = game.world.get(e.id, 'Transform');
      if (tr && e.amount >= 3) this.spawn(tr.x, tr.z, '+' + Math.round(e.amount), '#8affa0');
    });
    // Conversa entre aldeões (E22.5): balãozinho de fala flutuante.
    game.on('villagerChat', (e) => this.spawn(e.x, e.z, `💬 ${e.text}`, '#e8f0d8'));
  }

  spawn(x, z, text, color) {
    // Reusa o slot mais antigo (pool circular por tempo restante).
    let slot = this._pool.find((s) => s.t <= 0);
    if (!slot) {
      slot = this._pool.reduce((a, b) => (a.t < b.t ? a : b));
    }
    slot.t = LIFE;
    slot.x = x + (Math.random() - 0.5) * 0.8;
    slot.z = z + (Math.random() - 0.5) * 0.4;
    slot.rise = 0;
    slot.el.textContent = String(text);
    slot.el.style.color = color;
    slot.el.style.display = 'block';
  }

  /** Chamado no render: projeta mundo -> tela e anima subida/fade. */
  update(dt) {
    const cam = this.game.camera?.cam;
    if (!cam) return;
    for (const s of this._pool) {
      if (s.t <= 0) continue;
      s.t -= dt;
      if (s.t <= 0) { s.el.style.display = 'none'; continue; }
      s.rise += dt * 1.6;
      this._v.set(s.x, 1.6 + s.rise, s.z).project(cam);
      const sx = (this._v.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-this._v.y * 0.5 + 0.5) * window.innerHeight;
      s.el.style.left = `${sx}px`;
      s.el.style.top = `${sy}px`;
      s.el.style.opacity = String(Math.min(1, s.t / (LIFE * 0.55)));
    }
  }
}
