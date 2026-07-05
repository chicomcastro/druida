import * as THREE from 'three';
import { C, Transform } from '../core/ecs/components.js';
import { biomeAt } from './WorldManager.js';
import { FAUNA_BY_BIOME } from '../data/fauna.js';
import { makeRng } from '../utils/math.js';

/**
 * Fauna ambiente (ADR 0098, E8): mantém um punhado de bichos vagueando perto do
 * grupo, conforme o bioma atual. Eles fogem quando um jogador se aproxima e são
 * reciclados quando ficam longe (pool com teto). Sem colisor nem combate — só
 * vida no mundo. Suspenso em masmorra/interior (`game.inDungeon`).
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
    this.critters.push({ id, def, obj: g, target: null, wait: this.rng() * 2, phase: this.rng() * 6.28 });
  }

  /** Modelo em blocos simples (corpo + cabeça + pernas), tingido por espécie. */
  _model(def) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.9 });
    const accMat = new THREE.MeshStandardMaterial({ color: def.accent, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.9), bodyMat);
    body.position.y = 0.5; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), accMat);
    head.position.set(0, 0.72, 0.55);
    g.add(body, head);
    for (const [lx, lz] of [[-0.18, -0.3], [0.18, -0.3], [-0.18, 0.3], [0.18, 0.3]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), bodyMat);
      leg.position.set(lx, 0.2, lz);
      g.add(leg);
    }
    g.scale.setScalar(def.size);
    return g;
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
      let fx = 0, fz = 0, fleeing = false;
      for (const [, ptr] of this.game.world.query(C.Transform, C.PlayerControlled)) {
        const dx = tr.x - ptr.x, dz = tr.z - ptr.z;
        const d = Math.hypot(dx, dz);
        if (d < cr.def.flee && d > 0.001) { fx += dx / d; fz += dz / d; fleeing = true; }
      }
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
      tr.x += vx * dt; tr.z += vz * dt;
      if (vx || vz) tr.rot = Math.atan2(vx, vz);
      // Pulinho (sapo/lebre) ou bob leve; anima só o objeto (sem rig).
      const moving = Math.abs(vx) + Math.abs(vz) > 0.01;
      const bob = cr.def.hop
        ? Math.max(0, Math.sin(this._t * 8 + cr.phase)) * (moving ? 0.28 : 0.04)
        : (moving ? Math.abs(Math.sin(this._t * 6 + cr.phase)) * 0.06 : 0);
      cr.obj.position.set(tr.x, bob, tr.z);
      cr.obj.rotation.y = tr.rot;
    }
  }
}
