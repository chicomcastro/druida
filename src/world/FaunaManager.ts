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

  /**
   * Modelo em blocos com silhueta PRÓPRIA por espécie (ADR 0103): chifres do
   * cervo, orelhas da lebre, asas da ave/libélula, corpo achatado do sapo, etc.
   */
  _model(def) {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.9 });
    const acc = new THREE.MeshStandardMaterial({ color: def.accent, roughness: 0.9 });
    const bone = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.8 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const box = (w, h, d, x, y, z, m) => {
      const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      me.position.set(x, y, z); me.castShadow = true; g.add(me); return me;
    };
    const id = def.id;
    if (id === 'corvo' || id === 'libelula') {
      // Ave/inseto: corpo pequeno + asas; voa (bob alto no update).
      box(0.4, 0.32, 0.7, 0, 0.7, 0, body);
      box(0.7, 0.06, 0.4, -0.5, 0.76, 0.05, acc);
      box(0.7, 0.06, 0.4, 0.5, 0.76, 0.05, acc);
      box(0.3, 0.3, 0.3, 0, 0.88, 0.42, acc);
      if (id === 'corvo') box(0.1, 0.1, 0.26, 0, 0.86, 0.62, bone); // bico
      else { box(0.6, 0.05, 0.35, -0.45, 0.74, -0.32, acc); box(0.6, 0.05, 0.35, 0.45, 0.74, -0.32, acc); } // 2º par
    } else if (id === 'sapo') {
      box(0.72, 0.3, 0.6, 0, 0.24, 0, body);              // corpo largo/baixo
      box(0.44, 0.3, 0.34, 0, 0.36, 0.3, body);
      box(0.14, 0.14, 0.08, -0.14, 0.46, 0.42, acc); box(0.14, 0.14, 0.08, 0.14, 0.46, 0.42, acc); // olhos saltados
      box(0.2, 0.18, 0.3, -0.36, 0.14, -0.16, body); box(0.2, 0.18, 0.3, 0.36, 0.14, -0.16, body); // coxas
    } else {
      // Quadrúpede base + features por espécie.
      box(0.5, 0.4, 0.95, 0, 0.5, 0, body);
      const head = box(0.36, 0.36, 0.36, 0, 0.72, 0.56, acc);
      for (const [lx, lz] of [[-0.18, -0.32], [0.18, -0.32], [-0.18, 0.34], [0.18, 0.34]]) box(0.12, 0.42, 0.12, lx, 0.2, lz, body);
      box(0.1, 0.1, 0.05, -0.1, 0.76, 0.74, dark); box(0.1, 0.1, 0.05, 0.1, 0.76, 0.74, dark); // olhos
      if (id === 'cervo') {
        box(0.06, 0.42, 0.06, -0.12, 1.05, 0.5, bone); box(0.06, 0.42, 0.06, 0.12, 1.05, 0.5, bone);
        box(0.28, 0.06, 0.06, -0.2, 1.22, 0.5, bone); box(0.28, 0.06, 0.06, 0.2, 1.22, 0.5, bone); // galhadas
        head.position.z += 0.05; head.position.y += 0.06;
      } else if (id === 'lebre') {
        box(0.1, 0.44, 0.08, -0.1, 1.02, 0.5, acc); box(0.1, 0.44, 0.08, 0.1, 1.02, 0.5, acc); // orelhas longas
      } else if (id === 'cabra') {
        box(0.08, 0.24, 0.08, -0.13, 0.98, 0.5, bone); box(0.08, 0.24, 0.08, 0.13, 0.98, 0.5, bone); // chifres
        box(0.12, 0.18, 0.1, 0, 0.6, 0.72, acc); // barbicha/focinho
      } else if (id === 'coruja') {
        box(0.42, 0.42, 0.32, 0, 0.78, 0.32, acc); // cabeça grande redonda
        box(0.15, 0.15, 0.06, -0.11, 0.82, 0.5, bone); box(0.15, 0.15, 0.06, 0.11, 0.82, 0.5, bone);
        box(0.07, 0.07, 0.05, -0.11, 0.82, 0.54, dark); box(0.07, 0.07, 0.05, 0.11, 0.82, 0.54, dark); // olhos grandes
      }
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
