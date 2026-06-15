import { C, Factions } from '../core/ecs/components.js';
import { LANDMARKS } from '../gameplay/story.js';

/**
 * Minimapa/radar top-down no canto superior direito. Mostra hub, jogadores,
 * inimigos, santuários e o chefe num raio ao redor do centróide do grupo.
 */
export class Minimap {
  [key: string]: any;
  constructor(game) {
    this.game = game;
    this.range = 60; // unidades de mundo visíveis (raio)
    const c = document.createElement('canvas');
    c.width = 168; c.height = 168;
    c.style.cssText = 'position:fixed;top:64px;right:12px;z-index:9;border-radius:50%;border:2px solid rgba(159,224,106,.4);background:rgba(8,16,10,.6)';
    document.body.appendChild(c);
    this.canvas = c;
    this.ctx = c.getContext('2d');
  }

  _p(x, z, cx, cz) {
    const s = this.canvas.width / 2 / this.range;
    return [this.canvas.width / 2 + (x - cx) * s, this.canvas.height / 2 + (z - cz) * s];
  }

  dot(x, z, cx, cz, color, r = 2.5) {
    const [px, py] = this._p(x, z, cx, cz);
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  update() {
    const { game, ctx } = this;
    const c = game.groupCenter ?? { x: 0, z: 0 };
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Hub
    this.dot(0, -10, c.x, c.z, '#6cba5a', 4);
    // Santuários e chefe
    this.dot(LANDMARKS.sanctuary_bear.x, LANDMARKS.sanctuary_bear.z, c.x, c.z, '#ff9a5a', 3);
    this.dot(LANDMARKS.sanctuary_raven.x, LANDMARKS.sanctuary_raven.z, c.x, c.z, '#9a7aff', 3);
    this.dot(LANDMARKS.sanctuary_frog.x, LANDMARKS.sanctuary_frog.z, c.x, c.z, '#6affb0', 3);
    this.dot(LANDMARKS.boss.x, LANDMARKS.boss.z, c.x, c.z, '#ff3030', 3.5);

    // Inimigos
    for (const [id, tr, fac] of game.world.query(C.Transform, C.Faction)) {
      if (fac.team !== Factions.ENEMY) continue;
      const boss = game.world.get(id, C.Boss);
      this.dot(tr.x, tr.z, c.x, c.z, boss ? '#ff2a2a' : '#e06a6a', boss ? 4 : 2);
    }
    // Jogadores
    for (const [, tr, pc, hp] of game.world.query(C.Transform, C.PlayerControlled, C.Health)) {
      const col = '#' + pc.color.toString(16).padStart(6, '0');
      this.dot(tr.x, tr.z, c.x, c.z, hp.dead || pc.downed ? '#888' : col, 3.5);
    }

    // Norte
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.font = '9px system-ui';
    ctx.fillText('N', this.canvas.width / 2 - 3, 12);
  }
}
