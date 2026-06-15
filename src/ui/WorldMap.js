import { C } from '../core/ecs/components.js';
import { LANDMARKS } from '../gameplay/story.js';
import { BIOMES } from '../data/biomes.js';

/**
 * Mapa-mundi em tela cheia (tecla M) com fog of war: só áreas exploradas são
 * reveladas. Clicar num marco descoberto faz fast-travel até ele. Pausa o jogo
 * enquanto aberto. Ver docs/adr/0013-world-map.md.
 */
const MAP_RADIUS = 290; // unidades de mundo do centro até a borda do mapa
const PX = 600;

const POINTS = [
  { key: 'hub', x: 0, z: -10, label: 'Carvalho-Mãe', color: '#6cba5a', always: true },
  { key: 'sanctuary_bear', x: LANDMARKS.sanctuary_bear.x, z: LANDMARKS.sanctuary_bear.z, label: 'Santuário do Urso', color: '#ff9a5a' },
  { key: 'sanctuary_raven', x: LANDMARKS.sanctuary_raven.x, z: LANDMARKS.sanctuary_raven.z, label: 'Santuário do Corvo', color: '#9a7aff' },
  { key: 'sanctuary_frog', x: LANDMARKS.sanctuary_frog.x, z: LANDMARKS.sanctuary_frog.z, label: 'Santuário do Sapo', color: '#6affb0' },
  { key: 'boss', x: LANDMARKS.boss.x, z: LANDMARKS.boss.z, label: 'Coração Corrompido', color: '#ff3030' },
];

const RING_COLORS = ['#3e6b3a', '#40492f', '#4a4036', '#8aa0b0', '#2a1f2a'];
const RING_MAX = [55, 110, 165, 220, 290];

export class WorldMap {
  constructor(game) {
    this.game = game;
    const wrap = document.createElement('div');
    wrap.id = 'worldmap';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:25;display:none;align-items:center;justify-content:center;background:rgba(4,8,5,.9);font-family:system-ui,sans-serif;color:#eaf3e6;flex-direction:column';
    wrap.innerHTML = `<div style="font-size:22px;font-weight:700;margin-bottom:8px;color:#9fe06a">🗺️ Mapa do Mundo</div>
      <canvas width="${PX}" height="${PX}" style="max-width:78vmin;max-height:78vmin;border-radius:50%;border:2px solid rgba(159,224,106,.4);cursor:crosshair"></canvas>
      <div style="opacity:.7;font-size:13px;margin-top:10px">Clique num marco descoberto para viajar · M / Esc para fechar</div>`;
    document.body.appendChild(wrap);
    this.wrap = wrap;
    this.canvas = wrap.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.addEventListener('click', (e) => this._onClick(e));
  }

  _w2p(x, z) {
    const s = PX / 2 / MAP_RADIUS;
    return [PX / 2 + x * s, PX / 2 + z * s];
  }
  _p2w(px, pz) {
    const s = PX / 2 / MAP_RADIUS;
    return [(px - PX / 2) / s, (pz - PX / 2) / s];
  }

  _travelable(pt) {
    if (pt.always) return true;
    if (pt.key.startsWith('sanctuary')) {
      const form = { sanctuary_bear: 'bear', sanctuary_raven: 'raven', sanctuary_frog: 'frog' }[pt.key];
      for (const [, f] of this.game.world.query(C.Form)) if (f.list.includes(form)) return true;
    }
    return this.game.worldManager.isExplored(pt.x, pt.z);
  }

  toggle() {
    if (this.game.menuMain) return;
    const showing = this.wrap.style.display !== 'flex';
    this.wrap.style.display = showing ? 'flex' : 'none';
    this.game.paused = showing;
    if (showing) this.draw();
  }

  draw() {
    const { ctx } = this;
    const wm = this.game.worldManager;
    ctx.clearRect(0, 0, PX, PX);

    // Anéis de bioma (fundo).
    for (let i = RING_MAX.length - 1; i >= 0; i--) {
      const [cx, cy] = this._w2p(0, 0);
      ctx.beginPath();
      ctx.arc(cx, cy, (RING_MAX[i] / MAP_RADIUS) * (PX / 2), 0, Math.PI * 2);
      ctx.fillStyle = RING_COLORS[i] + '22';
      ctx.fill();
    }

    // Fog of war: células exploradas iluminadas.
    const cell = wm.fogCell;
    const cpx = (cell / MAP_RADIUS) * (PX / 2);
    ctx.fillStyle = 'rgba(180,220,150,.22)';
    for (const key of wm.explored) {
      const [cx, cz] = key.split(',').map(Number);
      const [px, pz] = this._w2p(cx * cell, cz * cell);
      ctx.fillRect(px - cpx / 2, pz - cpx / 2, cpx + 1, cpx + 1);
    }

    // Marcos.
    for (const pt of POINTS) {
      const [px, pz] = this._w2p(pt.x, pt.z);
      const known = this._travelable(pt);
      ctx.globalAlpha = known ? 1 : 0.28;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(px, pz, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = known ? 0.9 : 0.35;
      ctx.fillStyle = '#eaf3e6';
      ctx.font = '11px system-ui';
      ctx.fillText(known ? pt.label : '???', px + 9, pz + 4);
      ctx.globalAlpha = 1;
    }

    // Jogadores.
    for (const [, tr, pc, hp] of this.game.world.query(C.Transform, C.PlayerControlled, C.Health)) {
      const [px, pz] = this._w2p(tr.x, tr.z);
      ctx.fillStyle = hp.dead || pc.downed ? '#888' : '#' + pc.color.toString(16).padStart(6, '0');
      ctx.beginPath();
      ctx.arc(px, pz, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _onClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * PX;
    const pz = ((e.clientY - rect.top) / rect.height) * PX;
    const [wx, wz] = this._p2w(px, pz);
    let best = null, bd = Infinity;
    for (const pt of POINTS) {
      if (!this._travelable(pt)) continue;
      const d = Math.hypot(pt.x - wx, pt.z - wz);
      if (d < bd) { bd = d; best = pt; }
    }
    if (best && bd < 28) {
      const ok = this.game.fastTravelTo(best.x, best.z, best.label);
      if (ok) this.toggle();
    }
  }
}
