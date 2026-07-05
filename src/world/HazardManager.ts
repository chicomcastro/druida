import { C } from '../core/ecs/components.js';
import { biomeAt } from './WorldManager.js';
import { OVERWORLD_HAZARDS } from '../data/hazards.js';
import { applyDamage, applyStatus } from '../gameplay/combat.js';
import { makeRng } from '../utils/math.js';

/**
 * Perigos ambientais do mundo aberto (ADR 0099, E8.2). No bioma atual (fora das
 * vilas e das masmorras), dispara periodicamente uma zona telegrafada perto do
 * grupo; após o aviso, quem estiver na área leva dano + status do bioma. Os
 * disparos pendentes são resolvidos no próprio update (determinístico, sem
 * depender do agendador do loop). Suspenso em masmorra/interior e nas vilas.
 */
export class HazardManager {
  game: any;
  timer: number;
  pending: { x: number; z: number; hz: any; delay: number }[];
  rng: any;

  constructor(game) {
    this.game = game;
    this.timer = 0;
    this.pending = [];
    this.rng = makeRng((game.seed ^ 0x33aa55c1) >>> 0);
  }

  _strike(p) {
    const { x, z, hz } = p;
    for (const [pid, tr, pc, php] of this.game.world.query(C.Transform, C.PlayerControlled, C.Health)) {
      if (pc.downed || php.dead) continue;
      if (Math.hypot(tr.x - x, tr.z - z) <= hz.radius) {
        applyDamage(this.game, pid, hz.damage, { fromX: x, fromZ: z });
        applyStatus(this.game.world, pid, hz.effect);
      }
    }
    this.game.emit('vfxRing', { x, z, radius: hz.radius * 0.7, color: hz.color });
  }

  update(dt) {
    if (this.game.inDungeon) return;
    // Resolve os golpes já telegrafados.
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      p.delay -= dt;
      if (p.delay <= 0) { this._strike(p); this.pending.splice(i, 1); }
    }
    const c = this.game.groupCenter ?? { x: 0, z: 0 };
    // Vilas são refúgio: nada de perigos ambientais lá dentro.
    if (this.game.settlements?.isSafe(c.x, c.z, 4)) { this.timer = 0; return; }
    const hz = OVERWORLD_HAZARDS[biomeAt(c.x, c.z)];
    if (!hz) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = hz.interval;
    // Telegrafa uma zona perto do grupo.
    const ang = this.rng() * Math.PI * 2, r = this.rng() * 8;
    const x = c.x + Math.sin(ang) * r, z = c.z + Math.cos(ang) * r;
    this.game.emit('vfxRing', { x, z, radius: hz.radius, color: hz.color });
    this.game.emit('objective', { text: hz.label });
    this.pending.push({ x, z, hz, delay: hz.telegraph });
  }
}
