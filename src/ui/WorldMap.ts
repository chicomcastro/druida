import { C } from '../core/ecs/components.js';
import { LANDMARKS } from '../gameplay/story.js';
import { SETTLEMENTS } from '../data/settlements.js';
import { BIOMES, BIOME_ORDER } from '../data/biomes.js';
import { biomeAt } from '../world/WorldManager.js';

/**
 * Mapa-mundi em tela cheia (tecla M) com fog of war: só áreas exploradas são
 * reveladas. Clicar num marco descoberto faz fast-travel até ele. Pausa o jogo
 * enquanto aberto. Ver docs/adr/0013-world-map.md.
 */
const MAP_RADIUS = 330; // unidades de mundo do centro até a borda do mapa (biomas maiores, ADR 0119)
const PX = 600;

const POINTS = [
  // Assentamentos (cidades temáticas): o hub é sempre visível; as demais vilas
  // aparecem/permitem viagem quando exploradas. Ver ADR 0041.
  ...SETTLEMENTS.map((s) => ({
    key: s.id, x: s.x, z: s.z, label: s.name, color: s.mapColor, always: s.id === 'circulo_carvalho', village: true,
  })),
  { key: 'sanctuary_wolf', x: LANDMARKS.sanctuary_wolf.x, z: LANDMARKS.sanctuary_wolf.z, label: 'Santuário do Lobo', color: '#8fd0ff', village: false },
  { key: 'sanctuary_bear', x: LANDMARKS.sanctuary_bear.x, z: LANDMARKS.sanctuary_bear.z, label: 'Santuário do Urso', color: '#ff9a5a', village: false },
  { key: 'sanctuary_raven', x: LANDMARKS.sanctuary_raven.x, z: LANDMARKS.sanctuary_raven.z, label: 'Santuário do Corvo', color: '#9a7aff', village: false },
  { key: 'sanctuary_frog', x: LANDMARKS.sanctuary_frog.x, z: LANDMARKS.sanctuary_frog.z, label: 'Santuário do Sapo', color: '#6affb0', village: false },
  { key: 'boss', x: LANDMARKS.boss.x, z: LANDMARKS.boss.z, label: 'Coração Corrompido', color: '#ff3030', village: false },
];

// Cor de cada bioma no mapa (regiões orgânicas, ADR 0109).
const BIOME_MAP_COLOR = {
  clareira: '#3e6b3a', pantano: '#40492f', bosque_cinza: '#4a4036',
  picos: '#8aa0b0', coracao: '#2a1f2a',
};

/** Legenda do mapa (E14): swatch de cada bioma (nome + nível sugerido) e a
 *  chave dos marcadores — vila (losango) vs santuário/chefe (círculo). */
function legendHtml() {
  const biomes = BIOME_ORDER.map((b) => {
    const c = (BIOME_MAP_COLOR[b] ?? '#3e6b3a');
    return `<span style="display:inline-flex;align-items:center;gap:5px;margin:2px 8px 2px 0">
      <span style="width:12px;height:12px;border-radius:2px;background:${c};border:1px solid rgba(255,255,255,.3)"></span>
      ${BIOMES[b].name} <span style="opacity:.55">· Nv ${BIOMES[b].level}</span></span>`;
  }).join('');
  const markers = `
    <span style="display:inline-flex;align-items:center;gap:5px;margin:2px 8px 2px 0">
      <span style="width:11px;height:11px;background:#eaf3e6;transform:rotate(45deg);border:1px solid #04080522"></span> Vila</span>
    <span style="display:inline-flex;align-items:center;gap:5px;margin:2px 8px 2px 0">
      <span style="width:11px;height:11px;border-radius:50%;background:#eaf3e6"></span> Santuário / Chefe</span>`;
  return `<div style="max-width:78vmin;margin-top:12px;font-size:12px;line-height:1.7;display:flex;flex-wrap:wrap;justify-content:center;
      background:rgba(8,14,9,.55);border:1px solid rgba(159,224,106,.25);border-radius:10px;padding:8px 12px">
      <div style="width:100%;font-weight:700;color:#9fe06a;margin-bottom:2px">Biomas</div>${biomes}
      <div style="width:100%;font-weight:700;color:#9fe06a;margin:4px 0 2px">Marcadores</div>${markers}</div>`;
}

export class WorldMap {
  game: any;
  wrap: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor(game) {
    this.game = game;
    const wrap = document.createElement('div');
    wrap.id = 'worldmap';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:25;display:none;align-items:center;justify-content:center;background:rgba(4,8,5,.9);font-family:system-ui,sans-serif;color:#eaf3e6;flex-direction:column';
    wrap.innerHTML = `<div style="font-size:22px;font-weight:700;margin-bottom:8px;color:#9fe06a">🗺️ Mapa do Mundo</div>
      <canvas width="${PX}" height="${PX}" style="max-width:78vmin;max-height:78vmin;border-radius:50%;border:2px solid rgba(159,224,106,.4);cursor:crosshair"></canvas>
      ${legendHtml()}
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
      const form = { sanctuary_wolf: 'wolf', sanctuary_bear: 'bear', sanctuary_raven: 'raven', sanctuary_frog: 'frog' }[pt.key];
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

    // Regiões orgânicas de bioma (fundo): amostra biomeAt numa grade, recortada
    // no disco do mapa. Cada célula é pintada com a cor do seu bioma (ADR 0109).
    const GRID = 60;                 // resolução da amostragem
    const cellW = PX / GRID;
    const wStep = (MAP_RADIUS * 2) / GRID;
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const wx = -MAP_RADIUS + (i + 0.5) * wStep;
        const wz = -MAP_RADIUS + (j + 0.5) * wStep;
        if (Math.hypot(wx, wz) > MAP_RADIUS) continue; // fora do disco
        ctx.fillStyle = (BIOME_MAP_COLOR[biomeAt(wx, wz)] ?? '#3e6b3a') + '88';
        ctx.fillRect(i * cellW, j * cellW, cellW + 1, cellW + 1);
      }
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
      // Vilas = losango (assentamento); santuários/chefe = círculo (E14).
      if (pt.village) {
        ctx.save();
        ctx.translate(px, pz);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-5.5, -5.5, 11, 11);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(234,243,230,.9)';
        ctx.strokeRect(-5.5, -5.5, 11, 11);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(px, pz, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = known ? 0.9 : 0.35;
      ctx.fillStyle = '#eaf3e6';
      ctx.font = '11px system-ui';
      // Reputação por vila (ADR 0108): estrelas ao lado do nome (marco = assentamento).
      const rep = known ? (this.game.reputation?.[pt.key] ?? 0) : 0;
      const stars = rep > 0 ? '  ' + '★'.repeat(Math.min(3, Math.ceil(rep / 2))) : '';
      ctx.fillText(known ? pt.label + stars : '???', px + 9, pz + 4);
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
