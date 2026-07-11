import * as THREE from 'three';
import { C, Transform, Health, Collider, Faction, Factions } from '../core/ecs/components.js';
import { biomeAt } from './WorldManager.js';
import { FAUNA_BY_BIOME } from '../data/fauna.js';
import { INGREDIENTS } from '../gameplay/ingredients.js';
import { createLootOrb } from '../entities/factories.js';
import { buildFaunaModel } from '../entities/faunaModel.js';
import { makeRng } from '../utils/math.js';
import { approach, turnToward } from '../gameplay/steering.js';

/**
 * Fauna ambiente (ADR 0098, E8): mantém um punhado de bichos vagueando perto do
 * grupo, conforme o bioma atual. Eles fogem quando um jogador se aproxima e são
 * reciclados quando ficam longe (pool com teto). Suspenso em masmorra/interior
 * (`game.inDungeon`).
 *
 * Caça (ADR 0157): bichos com `drops` ganham vida + facção NEUTRA, então o
 * ataque do jogador os acerta (meleeArc atinge times opostos); ao morrer soltam
 * ingredientes temáticos da espécie — a fonte de carne/sebo/ovo vinda dos
 * animais. Não têm IA (não perseguem) e continuam fugindo.
 */
const MAX = 9;         // bichos vivos ao mesmo tempo
const SPAWN_MIN = 16;  // banda de spawn ao redor do grupo
const SPAWN_MAX = 32;
const DESPAWN = 46;    // recicla além disto

export class FaunaManager {
  game: any;
  critters: any[];
  rng: any;
  _t: number;

  constructor(game) {
    this.game = game;
    this.critters = [];
    this.rng = makeRng((game.seed ^ 0x7a1c93f5) >>> 0);
    this._t = 0;
    // Caça (ADR 0157): ao abater um bicho caçável, solta os ingredientes da
    // espécie. O gameEvents pula o loot genérico de monstro para a fauna.
    game.on?.('kill', (e) => this._onKill(e));
  }

  /** É uma entidade de fauna? (para o gameEvents pular o loot de monstro). */
  isFauna(id) {
    return this.critters.some((c) => c.id === id);
  }

  _onKill(e) {
    const i = this.critters.findIndex((c) => c.id === e.id);
    if (i < 0) return;
    const cr = this.critters[i];
    const tr = this.game.world.get(cr.id, C.Transform);
    const x = tr?.x ?? cr.obj.position.x, z = tr?.z ?? cr.obj.position.z;
    for (const [ing, qty] of Object.entries(cr.def.drops ?? {})) {
      const def = INGREDIENTS[ing];
      if (!def) continue;
      createLootOrb(this.game.world, this.game.renderer, {
        x: x + (this.rng() - 0.5), z: z + (this.rng() - 0.5),
        item: { ingredient: def.id, name: def.name, icon: def.icon, count: qty as number, rarityColor: 0xd0b060 },
      });
    }
    // O corpo tomba e some pelo caminho normal (killEntity agendou o destroy);
    // aqui só paramos de conduzir o bicho no passeio.
    this.critters.splice(i, 1);
  }

  _biome() {
    const c = this.game.groupCenter ?? { x: 0, z: 0 };
    return biomeAt(c.x, c.z);
  }

  _spawn(def, cx, cz) {
    const ang = this.rng() * Math.PI * 2;
    const r = SPAWN_MIN + this.rng() * (SPAWN_MAX - SPAWN_MIN);
    const x = cx + Math.sin(ang) * r, z = cz + Math.cos(ang) * r;
    const g = this._model(def);
    g.position.set(x, 0, z);
    this.game.renderer.add(g);
    const id = this.game.world.createEntity();
    this.game.world.add(id, C.Transform, Transform(x, z));
    this.game.world.add(id, C.Renderable, { object3d: g, baseScale: def.size });
    // Caçável (ADR 0157): vida + facção NEUTRA (o jogador acerta; inimigos/aliados
    // ignoram — a IA só conduz entidades com C.AI) + colisor leve (não bloqueia)
    // para o arco de ataque pegar, + Tint para o flash de dano.
    if (def.hp && def.drops) {
      this.game.world.add(id, C.Health, Health(def.hp));
      this.game.world.add(id, C.Faction, Faction(Factions.NEUTRAL));
      this.game.world.add(id, C.Collider, Collider(def.size * 0.5, false));
      this.game.world.add(id, C.Tint, { flash: 0, react: 0 });
    }
    this.critters.push({ id, def, obj: g, target: null, wait: this.rng() * 2, phase: this.rng() * 6.28 });
  }

  /** Modelo do bicho (silhueta própria por espécie) — ver entities/faunaModel. */
  _model(def) {
    return buildFaunaModel(def);
  }

  _remove(c) {
    this.game.renderer.remove?.(c.obj);
    if (this.game.world.entities.has(c.id)) this.game.world.destroyEntity(c.id);
  }

  update(dt) {
    if (this.game.inDungeon) return;
    this._t += dt;
    const c = this.game.groupCenter ?? { x: 0, z: 0 };
    const pool = FAUNA_BY_BIOME[this._biome()] ?? [];

    // Recicla os que ficaram longe (ou não pertencem mais ao bioma atual).
    for (let i = this.critters.length - 1; i >= 0; i--) {
      const cr = this.critters[i];
      const far = Math.hypot(cr.obj.position.x - c.x, cr.obj.position.z - c.z) > DESPAWN;
      const alien = !pool.some((d) => d.id === cr.def.id);
      if (far || alien) { this._remove(cr); this.critters.splice(i, 1); }
    }
    // Repõe até o teto (se o bioma tem fauna).
    if (pool.length) {
      let guard = 4;
      while (this.critters.length < MAX && guard-- > 0) {
        this._spawn(pool[Math.floor(this.rng() * pool.length)], c.x, c.z);
      }
    }

    // Passeio + fuga.
    for (const cr of this.critters) {
      const tr = this.game.world.get(cr.id, C.Transform);
      if (!tr) continue;
      // Fuga com HISTERESE (E46): começa a fugir dentro de `flee`, mas só relaxa
      // quando passa de `flee*1.6`. Sem isso, o bicho ping-pongava na borda do
      // raio (foge → sai do raio → volta a passear → entra no raio → foge),
      // "piscando" pra frente/trás. A banda separa os dois estados.
      let fx = 0, fz = 0, fleeing = false;
      const keep = cr._fleeing ? cr.def.flee * 1.6 : cr.def.flee;
      for (const [, ptr] of this.game.world.query(C.Transform, C.PlayerControlled)) {
        const dx = tr.x - ptr.x, dz = tr.z - ptr.z;
        const d = Math.hypot(dx, dz);
        if (d < keep && d > 0.001) { fx += dx / d; fz += dz / d; fleeing = true; }
      }
      cr._fleeing = fleeing;
      let vx = 0, vz = 0;
      if (fleeing) {
        const fl = Math.hypot(fx, fz) || 1;
        vx = (fx / fl) * cr.def.speed * 1.8;
        vz = (fz / fl) * cr.def.speed * 1.8;
      } else {
        if (cr.wait > 0) { cr.wait -= dt; }
        else if (!cr.target || Math.hypot(cr.target.x - tr.x, cr.target.z - tr.z) < 0.5) {
          cr.target = { x: tr.x + (this.rng() - 0.5) * 12, z: tr.z + (this.rng() - 0.5) * 12 };
          cr.wait = 1 + this.rng() * 3;
        } else {
          const dx = cr.target.x - tr.x, dz = cr.target.z - tr.z;
          const d = Math.hypot(dx, dz) || 1;
          vx = (dx / d) * cr.def.speed; vz = (dz / d) * cr.def.speed;
        }
      }
      // Velocidade suavizada (E46) — como nos aldeões, evita o tranco pra
      // frente/trás quando o rumo muda (fuga↔passeio ou troca de alvo).
      cr._vx = approach(cr._vx ?? 0, vx, dt);
      cr._vz = approach(cr._vz ?? 0, vz, dt);
      tr.x += cr._vx * dt; tr.z += cr._vz * dt;
      const sp = Math.hypot(cr._vx, cr._vz);
      if (sp > 0.06) tr.rot = turnToward(tr.rot ?? 0, Math.atan2(cr._vx, cr._vz), dt);
      // Pulinho (sapo/lebre) ou bob leve; anima só o objeto (sem rig).
      const moving = sp > 0.05;
      const bob = cr.def.hop
        ? Math.max(0, Math.sin(this._t * 8 + cr.phase)) * (moving ? 0.28 : 0.04)
        : (moving ? Math.abs(Math.sin(this._t * 6 + cr.phase)) * 0.06 : 0);
      cr.obj.position.set(tr.x, bob, tr.z);
      cr.obj.rotation.y = tr.rot;
    }
  }
}
