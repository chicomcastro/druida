import * as THREE from 'three';
import { C, Transform, Velocity, Collider } from '../core/ecs/components.js';
import { makeRng, dist } from '../utils/math.js';
import { biomeAt } from './WorldManager.js';
import { BIOMES } from '../data/biomes.js';
import { ENEMIES } from '../data/enemies.js';
import { buildVoxelGroup, makeVillagerSpec } from '../entities/voxelModels.js';
import { createLootOrb } from '../entities/factories.js';
import { generateItem } from '../gameplay/loot.js';
import { LANDMARK_TYPES } from '../data/landmarks.js';

/**
 * Ermos (E37): spots isolados FORA das vilas que enriquecem o mundo. Cada spot
 * é um cenário único (torre rachada, cemitério, pedras eretas, estátua caída,
 * marco de romaria); alguns têm um EREMITA vivendo ali (com uma rotininha de
 * perambular perto de casa) que oferece uma **caçada**: expurgar N criaturas do
 * ermo em troca de uma recompensa ÚNICA (item lendário nomeado). Purificar não
 * é o ponto — explorar e ser recompensado é. Estado persistido no save.
 *
 * Gera de forma determinística (semente do mundo), longe de vilas e do eixo dos
 * santuários, um por bioma-anel. Ver ADR 0170.
 */
const NEAR = 9;   // distância que "revela" a placa do lugar
const TALK = 3.4; // eremita para de perambular pra conversar

export class LandmarkManager {
  game: any;
  spots: any[];
  done: Set<string>;

  constructor(game) {
    this.game = game;
    this.done = new Set(); // caçadas concluídas (persistido)
    this.spots = this._generate(game.seed ?? 1337);
    this._build();
    game.on('kill', (e) => this._onKill(e));
  }

  /** Enemy-alvo da caçada: o inimigo de maior peso do bioma do spot. */
  _biomeFoe(biome) {
    const list = BIOMES[biome]?.enemies ?? [];
    let best = list[0];
    for (const e of list) if ((e.weight ?? 1) > (best?.weight ?? 0)) best = e;
    return best?.key ?? 'rotboar';
  }

  _generate(seed) {
    const rng = makeRng((seed ^ 0x1a2dfe3) >>> 0);
    const rings = [
      { rmin: 34, rmax: 56 },   // clareira
      { rmin: 70, rmax: 108 },  // pântano
      { rmin: 124, rmax: 162 }, // bosque cinza
      { rmin: 184, rmax: 214 }, // picos
      { rmin: 90, rmax: 140 },  // faixa média (5º tipo: romaria/marco)
    ];
    const spots: any[] = [];
    rings.forEach((ring, i) => {
      const type = LANDMARK_TYPES[i % LANDMARK_TYPES.length];
      let x = 0, z = 0;
      for (let t = 0; t < 12; t++) {
        const ang = rng.range(0.5, Math.PI * 2 - 0.5); // evita o eixo -Z (santuários)
        const rad = rng.range(ring.rmin, ring.rmax);
        x = Math.sin(ang) * rad; z = Math.cos(ang) * rad;
        const clearOfCamps = !(this.game.poi?.camps ?? []).some((c) => dist(c.x, c.z, x, z) < 22);
        if (!this.game.settlements?.isSafe(x, z, 16) && clearOfCamps) break;
      }
      const biome = biomeAt(x, z);
      const foe = this._biomeFoe(biome);
      spots.push({
        id: `mark${i}`, type, x, z, biome, seen: false,
        foe, foeName: ENEMIES[foe]?.name ?? 'criatura', kills: 0,
        active: false, hermitId: null, _t: null, _wait: rng.range(0, 2),
      });
    });
    return spots;
  }

  _build() {
    for (const spot of this.spots) {
      this._buildScenery(spot);
      if (spot.type.hermit) spot.hermitId = this._spawnHermit(spot);
    }
  }

  // --- Cenário voxel por tipo -----------------------------------------------
  _buildScenery(spot) {
    const g = new THREE.Group();
    g.position.set(spot.x, 0, spot.z);
    const box = (w, h, d, x, y, z, c, em = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: c, roughness: 1, emissive: em, emissiveIntensity: em ? 0.8 : 0 }));
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
    };
    const stone = 0x8a857e, dark = 0x6a6a72, wood = 0x5a4028, moss = 0x4c6a3a;
    switch (spot.type.scenery) {
      case 'tower': {
        for (let y = 0; y < 5; y++) { // anel de pedra rachado que sobe
          const gap = y === 4 ? 3 : y === 3 ? 1 : 0;
          for (let k = 0; k < 8 - gap; k++) {
            const a = (k / 8) * Math.PI * 2;
            box(0.95, 0.95, 0.95, Math.sin(a) * 1.7, 0.5 + y * 0.9, Math.cos(a) * 1.7, y > 2 ? dark : stone);
          }
        }
        box(0.5, 1.4, 0.5, 0, 0.7, 0, 0x2a2a30); // escada/pilar central quebrado
        this._collider(spot.x, spot.z, 2.4);
        break;
      }
      case 'cemetery': {
        for (const [tx, tz] of [[-2.4, -1], [-0.8, 0.6], [1, -1.4], [2.2, 0.8], [0.2, 2]]) {
          box(0.7, 1.0, 0.2, tx, 0.5, tz, 0.9 * 0 + 0xbfbfc4); // lápide
          box(0.24, 0.24, 0.24, tx, 1.05, tz, 0xcfcfd4);       // topo
          box(0.6, 0.05, 0.9, tx, 0.03, tz + 0.5, moss);        // cova/relva
        }
        box(1.4, 0.16, 0.5, -0.4, 0.1, -2.4, 0x9a8a6a);        // cadáver enrolado (mortalha)
        box(0.4, 0.2, 0.4, -1.0, 0.14, -2.4, 0xe6d8c0);        // crânio
        this._fence(g, box, wood);
        break;
      }
      case 'stones': {
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          const h = 2.6 + (k % 2) * 0.9;
          box(0.9, h, 0.7, Math.sin(a) * 2.6, h / 2, Math.cos(a) * 2.6, k % 3 ? stone : dark);
          this._collider(spot.x + Math.sin(a) * 2.6, spot.z + Math.cos(a) * 2.6, 0.7);
        }
        box(1.4, 0.3, 1.4, 0, 0.15, 0, moss); // altar central
        break;
      }
      case 'statue': {
        box(2.0, 0.6, 2.0, 0, 0.3, 0, stone);                 // pedestal
        box(0.6, 0.3, 1.8, 0.2, 0.75, 0, dark);               // corpo tombado
        box(0.5, 0.5, 0.5, 0.2, 0.85, -1.1, dark);            // cabeça caída
        box(0.3, 1.2, 0.3, -0.6, 1.2, 0.7, dark);             // braço erguido (só ele de pé)
        this._collider(spot.x, spot.z, 1.6);
        break;
      }
      case 'wayshrine': {
        box(0.4, 2.4, 0.4, -1.2, 1.2, 0, stone); box(0.4, 2.4, 0.4, 1.2, 1.2, 0, stone); // batentes
        box(2.8, 0.5, 0.5, 0, 2.6, 0, stone);                 // arco
        const lamp = box(0.4, 0.5, 0.4, 0, 1.4, 0.4, 0xffd27a, 0xffb46a); void lamp;
        this.game.lightPool?.register(spot.x, 1.6, spot.z + 0.4, 0xffc27a, 20, 0.5);
        box(0.16, 1.4, 0.16, 1.9, 0.7, 0.6, wood); box(0.9, 0.5, 0.1, 1.9, 1.5, 0.6, 0x8a6a4a); // placa (post + tábua)
        break;
      }
    }
    // Placa/poste em todos (o "sinal" do lugar), menos onde já tem.
    if (spot.type.scenery !== 'wayshrine') {
      box(0.14, 1.3, 0.14, 2.6, 0.65, 1.6, wood); box(0.8, 0.46, 0.1, 2.6, 1.4, 1.6, 0x8a6a4a);
    }
    this.game.renderer?.add(g);
    spot.mesh = g;
  }

  _fence(g, box, wood) {
    for (let k = 0; k <= 8; k++) {
      const t = k / 8 - 0.5;
      box(0.12, 0.7, 0.12, t * 7, 0.35, -3.2, wood);
      box(0.12, 0.7, 0.12, t * 7, 0.35, 3.2, wood);
    }
  }

  _collider(x, z, r) {
    const id = this.game.world.createEntity();
    this.game.world.add(id, C.Transform, Transform(x, z));
    this.game.world.add(id, C.Collider, Collider(r, true));
  }

  // --- Eremita ---------------------------------------------------------------
  _spawnHermit(spot) {
    const { game } = this;
    const g = buildVoxelGroup(makeVillagerSpec({ robe: 0x4a4438, trim: 0x8a7a5a, elder: true, hood: true, beard: true }));
    const hx = spot.x + 2, hz = spot.z + 2;
    g.position.set(hx, 0, hz);
    game.renderer.add(g);
    const id = game.world.createEntity();
    game.world.add(id, C.Transform, Transform(hx, hz, Math.PI));
    game.world.add(id, C.Velocity, Velocity(0, 0, 1));
    game.world.add(id, C.Renderable, { object3d: g, baseScale: 1 });
    game.world.add(id, C.Collider, Collider(0.55, true));
    game.world.add(id, C.Interactable, {
      kind: 'hermit', spotId: spot.id, prompt: `E — ${spot.type.hermit.name}`, range: 3, used: false, lines: spot.type.hermit.lines,
    });
    return id;
  }

  // --- Caçada (bounty) -------------------------------------------------------
  /** Conversa com o eremita: oferece/mostra/entrega a caçada. */
  talk(spotId) {
    const spot = this.spots.find((s) => s.id === spotId);
    if (!spot?.type.bounty) { if (spot) this.game.emit('dialogue', { lines: spot.type.hermit?.lines ?? [] }); return; }
    const b = spot.type.bounty;
    if (this.done.has(spot.id)) {
      this.game.emit('dialogue', { lines: [`${spot.type.hermit.name}: O ermo respira melhor graças a ti. Vai com o meu apreço.`] });
      return;
    }
    if (!spot.active) {
      spot.active = true; spot.kills = 0;
      this.game.emit('dialogue', { lines: spot.type.hermit.lines });
      this.game.emit('objective', { text: `🗡️ ${spot.type.title}: ${b.verb} ${b.count} ${spot.foeName} (0/${b.count})` });
      this.game.emit('sideQuestStarted', { id: `bounty:${spot.id}` });
    } else {
      this.game.emit('dialogue', { lines: [`${spot.type.hermit.name}: Ainda faltam ${b.count - spot.kills}. O ermo agradece cada uma.`] });
    }
  }

  _onKill(e) {
    for (const spot of this.spots) {
      if (!spot.active || this.done.has(spot.id)) continue;
      const r = this.game.world.get(e.id, C.Renderable);
      if (!r || r.kind !== spot.foe) continue; // só o alvo da caçada conta
      spot.kills++;
      const b = spot.type.bounty;
      if (spot.kills >= b.count) this._complete(spot);
      else this.game.emit('objective', { text: `🗡️ ${spot.type.title}: ${b.verb} ${b.count} ${spot.foeName} (${spot.kills}/${b.count})` });
    }
  }

  _complete(spot) {
    const { game } = this;
    const b = spot.type.bounty;
    spot.active = false;
    this.done.add(spot.id);
    // Recompensa ÚNICA: item lendário nomeado + essência, largados aos pés do eremita.
    const lvl = game.regionLevel?.() ?? 1;
    const item: any = generateItem(lvl + 1, b.reward.type, null, 'unique');
    item.name = b.reward.name;
    const hx = spot.x + 2, hz = spot.z + 2;
    createLootOrb(game.world, game.renderer, { x: hx + 0.6, z: hz, item });
    createLootOrb(game.world, game.renderer, { x: hx - 0.6, z: hz, item: { essence: b.reward.essence, rarityColor: 0xffc83a } });
    game.emit('dialogue', { lines: [`${spot.type.hermit.name}: Está feito. Toma — ${b.reward.name}. Poucos a merecem.`] });
    game.emit('objective', { text: `✅ ${spot.type.title}: caçada concluída! ${b.reward.name} recebida.` });
    game.emit('questCompleted', { id: `bounty:${spot.id}` });
    game.emit('vfxRing', { x: hx, z: hz, radius: 4, color: 0xffc83a });
  }

  // --- Rotina do eremita + revelação da placa --------------------------------
  update(dt) {
    if (this.game.inDungeon) return;
    const c = this.game.groupCenter ?? { x: 0, z: 0 };
    for (const spot of this.spots) {
      // Revela a placa/inscrição ao chegar perto (uma vez).
      if (!spot.seen && dist(c.x, c.z, spot.x, spot.z) < NEAR) {
        spot.seen = true;
        this.game.emit('objective', { text: `🪧 ${spot.type.title} — ${spot.type.sign}` });
      }
      if (spot.hermitId != null) this._hermitTick(spot, dt, c);
    }
  }

  /** Eremita perambula perto de casa; para pra conversar quando você chega. */
  _hermitTick(spot, dt, c) {
    const { game } = this;
    if (!game.world.entities.has(spot.hermitId)) return;
    const tr = game.world.get(spot.hermitId, C.Transform);
    const vel = game.world.get(spot.hermitId, C.Velocity);
    if (!tr || !vel) return;
    if (dist(c.x, c.z, tr.x, tr.z) < TALK) { // jogador perto: para e encara
      vel.vx = 0; vel.vz = 0; tr.rot = Math.atan2(c.x - tr.x, c.z - tr.z); return;
    }
    if (spot._wait > 0) { spot._wait -= dt; vel.vx = 0; vel.vz = 0; return; }
    if (!spot._t || dist(spot._t.x, spot._t.z, tr.x, tr.z) < 0.4) {
      const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 3;
      spot._t = { x: spot.x + Math.sin(a) * r, z: spot.z + Math.cos(a) * r };
      spot._wait = 1 + Math.random() * 3;
      vel.vx = 0; vel.vz = 0; return;
    }
    const dx = spot._t.x - tr.x, dz = spot._t.z - tr.z, d = Math.hypot(dx, dz) || 1;
    vel.vx = (dx / d) * 0.8; vel.vz = (dz / d) * 0.8; tr.rot = Math.atan2(dx, dz);
  }

  // --- Persistência ----------------------------------------------------------
  serialize() { return { done: [...this.done] }; }
  restore(data) {
    if (!data?.done) return;
    this.done = new Set(data.done);
  }
}
