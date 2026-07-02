import * as THREE from 'three';
import { C, Transform, Collider } from '../core/ecs/components.js';
import { SETTLEMENTS } from '../data/settlements.js';
import { makeRng, angleTo } from '../utils/math.js';
import { buildVoxelGroup, makeVillagerSpec } from '../entities/voxelModels.js';

/**
 * Constrói e administra os assentamentos temáticos (uma cidade-vila por
 * região): geometria procedural por tema, moradores interativos (diálogo de
 * worldbuilding), zona segura sem spawns e anúncio de chegada. As posições são
 * autorais (data/settlements.ts) para conversar com a campanha (ADR 0010).
 * Ver docs/adr/0041-assentamentos-tematicos.md.
 */
export class SettlementManager {
  game: any;
  list: any[];
  _current: any;
  _flames: any[]; // meshes emissivos que pulsam (lanternas/chamas/cristais)
  _lights: any[]; // point lights que tremulam

  constructor(game) {
    this.game = game;
    this._current = null;
    this._flames = [];
    this._lights = [];
    this.list = SETTLEMENTS.map((def) => ({ ...def, visited: false }));
    const builders = {
      druida: (s, rng) => this._buildDruida(s, rng),
      palafitas: (s, rng) => this._buildPalafitas(s, rng),
      lenhadores: (s, rng) => this._buildLenhadores(s, rng),
      degelo: (s, rng) => this._buildDegelo(s, rng),
    };
    for (const s of this.list) {
      const rng = makeRng(((game.seed ?? 1337) ^ hashId(s.id)) >>> 0);
      const g = new THREE.Group();
      g.position.set(s.x, 0, s.z);
      builders[s.theme](wrap(g, s, this, rng), rng);
      game.renderer.add(g);
      for (const v of s.villagers) this._buildVillager(s, v);
    }
  }

  /** Zona segura: dentro de qualquer assentamento (com margem opcional). */
  isSafe(x, z, margin = 0) {
    return this.list.some((s) => Math.hypot(x - s.x, z - s.z) < s.radius + margin);
  }

  settlementAt(x, z) {
    return this.list.find((s) => Math.hypot(x - s.x, z - s.z) < s.radius) ?? null;
  }

  /** Anuncia a chegada (banner sempre; diálogo de worldbuilding só na 1ª). */
  update() {
    if (this.game.inDungeon) return;
    const c = this.game.groupCenter ?? { x: 0, z: 0 };
    const s = this.settlementAt(c.x, c.z);
    if (s && s !== this._current) {
      this._current = s;
      if (!s.visited) {
        s.visited = true;
        this.game.emit('dialogue', { lines: s.arrival });
      }
      this.game.emit('objective', { text: `🏘️ ${s.name} — ${s.tagline}` });
      this.game.emit('settlementEntered', { id: s.id, name: s.name });
    } else if (!s) {
      this._current = null;
    }
  }

  /** Vida ambiente: lanternas/chamas pulsam e as luzes tremulam. */
  animate(t) {
    for (const f of this._flames) {
      f.mesh.material.emissiveIntensity = f.base + Math.sin(t * f.speed + f.seed) * f.amp;
    }
    for (const l of this._lights) {
      l.light.intensity = l.base * (0.85 + 0.15 * Math.sin(t * 7 + l.seed) * Math.sin(t * 3.1 + l.seed * 2));
    }
  }

  // --- Peças compartilhadas -------------------------------------------------

  _collider(x, z, r) {
    const id = this.game.world.createEntity();
    this.game.world.add(id, C.Transform, Transform(x, z));
    this.game.world.add(id, C.Collider, Collider(r, true));
  }

  /**
   * Morador como modelo voxel (mesmo sistema dos personagens/inimigos — ADR
   * 0043): túnica na paleta do tema, ancião com capa/cajado, e partes nomeadas
   * para o animador procedural (idle). Vira Renderable, então o renderSync
   * cuida de posição/rotação/animação.
   */
  _buildVillager(s, v) {
    const { game } = this;
    const palette = VILLAGER_PALETTES[s.theme];
    const g = buildVoxelGroup(makeVillagerSpec({
      robe: v.elder ? palette.elder : palette.robe,
      trim: palette.trim,
      glow: palette.glow,
      elder: !!v.elder,
    }));
    const wx = s.x + v.x, wz = s.z + v.z;
    g.position.set(wx, 0, wz);
    game.renderer.add(g);
    const id = game.world.createEntity();
    // Olha para o centro da vila (rotação sincronizada pelo renderSync).
    game.world.add(id, C.Transform, Transform(wx, wz, angleTo(wx, wz, s.x, s.z)));
    game.world.add(id, C.Renderable, { object3d: g, baseScale: 1 });
    game.world.add(id, C.Collider, Collider(0.55, true));
    game.world.add(id, C.Interactable, {
      kind: 'villager', prompt: `E — Conversar com ${v.name}`, range: 3, used: false, lines: v.lines,
    });
  }

  // --- Temas ----------------------------------------------------------------

  /** Vila druida (hub): cabanas de teto vivo, jardins, lanternas e menires. */
  _buildDruida(w, rng) {
    // Cabanas em anel, deixando o sul (−Z) aberto — é o caminho da campanha.
    const huts = [[-14, -2], [14, -4], [-9, 10], [9, 11], [0, 16]];
    for (const [x, z] of huts) {
      const wall = mesh(new THREE.CylinderGeometry(2.1, 2.3, 1.9, 10), 0x8a6b4a);
      wall.position.set(x, 0.95, z);
      const roof = mesh(new THREE.ConeGeometry(3.0, 2.3, 10), 0x4f7a3a, { rough: 1 });
      roof.position.set(x, 2.9, z);
      const door = mesh(new THREE.BoxGeometry(0.9, 1.3, 0.2), 0x3a2a1c);
      const a = Math.atan2(-x, -z); // porta voltada ao centro
      door.position.set(x + Math.sin(a) * 2.2, 0.65, z + Math.cos(a) * 2.2);
      door.rotation.y = a;
      w.add(wall, roof, door);
      w.collider(x, z, 2.4);
    }
    // Fogueira comunal.
    this._fire(w, 0, 4, 0xff9a4a, 1.1);
    // Jardins de ervas (canteiros com brotos).
    for (const [gx, gz] of [[-5.5, 7], [5.5, 7]]) {
      const bed = mesh(new THREE.BoxGeometry(3.2, 0.3, 1.8), 0x4a3424);
      bed.position.set(gx, 0.15, gz);
      w.add(bed);
      for (let i = 0; i < 5; i++) {
        const sprout = mesh(new THREE.ConeGeometry(0.16, 0.5, 5), i % 2 ? 0x7ac86a : 0x9fe06a);
        sprout.position.set(gx - 1.2 + i * 0.6, 0.55, gz + (i % 2 ? 0.4 : -0.35));
        w.add(sprout);
      }
    }
    // Caminho de pedras do centro ao portão sul.
    for (let i = 0; i < 8; i++) {
      const stone = mesh(new THREE.CylinderGeometry(0.5 + rng() * 0.2, 0.5, 0.06, 7), 0x8a8578, { rough: 1, shadow: false });
      stone.position.set((rng() - 0.5) * 1.2, 0.03, -3 - i * 2);
      w.add(stone);
    }
    // Menires gêmeos no portão sul (limiar entre a vila e o mundo selvagem).
    for (const mx of [-2.6, 2.6]) {
      const menhir = mesh(new THREE.BoxGeometry(1.0, 3.2, 0.8), 0x6a6a72);
      menhir.position.set(mx, 1.6, -18);
      menhir.rotation.y = mx > 0 ? 0.2 : -0.2;
      w.add(menhir);
      w.collider(mx, -18, 0.8);
    }
    // Lanternas de vagalumes.
    const lampSpots = [[-7, -1], [7, 1], [-11, 6], [11, 7], [0, 9], [-1.5, -12]];
    for (const [x, z] of lampSpots) this._lantern(w, x, z, 0xd8ffa0);
    // Cerca baixa a leste/oeste.
    for (let i = 0; i < 6; i++) {
      for (const sx of [-1, 1]) {
        const post = mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.0, 5), 0x6b4a2f, { shadow: false });
        post.position.set(sx * 18, 0.5, -6 + i * 3.4);
        w.add(post);
      }
    }
  }

  /** Vau das Palafitas: lagoa, casas sobre estacas, passarelas e juncos. */
  _buildPalafitas(w, rng) {
    // Lagoa rasa sob a vila.
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(19, 28),
      new THREE.MeshStandardMaterial({ color: 0x24403c, roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.85 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.04;
    water.receiveShadow = true;
    w.add(water);
    // Casas sobre estacas.
    const huts = [[-8, -4, 0.4], [6, -8, -0.5], [-2, 8, 0.2], [10, 4, 0.9]];
    for (const [x, z, ry] of huts) {
      const hut = new THREE.Group();
      for (const [lx, lz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) {
        const leg = mesh(new THREE.CylinderGeometry(0.13, 0.16, 1.3, 5), 0x4a3626);
        leg.position.set(lx, 0.65, lz);
        hut.add(leg);
      }
      const deck = mesh(new THREE.BoxGeometry(4.2, 0.25, 4.2), 0x6b4a33);
      deck.position.y = 1.35;
      const cabin = mesh(new THREE.BoxGeometry(3.1, 1.7, 3.1), 0x7a5a3d);
      cabin.position.y = 2.35;
      const roof = mesh(new THREE.ConeGeometry(2.7, 1.7, 4), 0x54683a, { rough: 1 });
      roof.position.y = 4.0;
      roof.rotation.y = Math.PI / 4;
      const ladder = mesh(new THREE.BoxGeometry(0.7, 1.3, 0.12), 0x4a3626, { shadow: false });
      ladder.position.set(0, 0.65, 2.15);
      hut.add(deck, cabin, roof, ladder);
      hut.position.set(x, 0, z);
      hut.rotation.y = ry;
      w.add(hut);
      w.collider(x, z, 2.4);
    }
    // Passarelas de tábua ligando as casas ao centro.
    for (const [x, z, len, ry] of [[-4, -2, 7, 1.1], [3, -4, 7, -0.6], [-1, 4, 7, 0.15], [5, 2, 7, 1.0]]) {
      const walk = mesh(new THREE.BoxGeometry(1.1, 0.12, len), 0x5a4028, { shadow: false });
      walk.position.set(x, 0.12, z);
      walk.rotation.y = ry;
      w.add(walk);
    }
    // Juncos na borda da lagoa.
    for (let i = 0; i < 16; i++) {
      const a = rng() * Math.PI * 2;
      const r = 15 + rng() * 4;
      const reed = mesh(new THREE.ConeGeometry(0.12, 1.4 + rng() * 0.9, 4), 0x5a6b2a, { shadow: false });
      reed.position.set(Math.sin(a) * r, 0.7, Math.cos(a) * r);
      reed.rotation.z = (rng() - 0.5) * 0.25;
      w.add(reed);
    }
    // Varal de pesca e barco.
    const rack = new THREE.Group();
    for (const px of [-1, 1]) {
      const post = mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 5), 0x4a3626);
      post.position.set(px, 0.8, 0);
      rack.add(post);
    }
    const bar = mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5), 0x4a3626, { shadow: false });
    bar.rotation.z = Math.PI / 2;
    bar.position.y = 1.5;
    rack.add(bar);
    for (let i = 0; i < 3; i++) {
      const fish = mesh(new THREE.BoxGeometry(0.16, 0.5, 0.08), 0x9ab0a0, { shadow: false });
      fish.position.set(-0.6 + i * 0.6, 1.2, 0);
      rack.add(fish);
    }
    rack.position.set(12, 0, -9);
    w.add(rack);
    const boat = mesh(new THREE.BoxGeometry(2.6, 0.5, 1.0), 0x5a4028);
    boat.position.set(-13, 0.25, 6);
    boat.rotation.y = 0.7;
    w.add(boat);
    w.collider(-13, 6, 1.2);
    // Lanternas de musgo (verde-água) — a marca da vila.
    for (const [x, z] of [[0, -1], [-6, -6], [8, -5], [-4, 6], [8, 7]]) this._lantern(w, x, z, 0x6affc8);
    this._fireLight(w, 0, -1, 0x6affc8, 0.9);
  }

  /** Cinzafolha: paliçada, cabanas de tronco, serraria, braseiros e cinzas. */
  _buildLenhadores(w, rng) {
    // Paliçada circular com dois portões (norte e sul).
    const posts = 26;
    for (let i = 0; i < posts; i++) {
      const a = (i / posts) * Math.PI * 2;
      if (Math.abs(Math.sin(a)) < 0.28) continue; // vãos dos portões no eixo Z
      const x = Math.sin(a) * 16.5, z = Math.cos(a) * 16.5;
      const log = mesh(new THREE.CylinderGeometry(0.34, 0.4, 3.0 + (i % 2) * 0.4, 6), 0x4a3a2c);
      log.position.set(x, 1.6, z);
      const tip = mesh(new THREE.ConeGeometry(0.34, 0.5, 6), 0x3a2d22, { shadow: false });
      tip.position.set(x, 3.3 + (i % 2) * 0.4, z);
      w.add(log, tip);
      if (i % 2 === 0) w.collider(x, z, 1.5);
    }
    // Cabanas de tronco com telhado de duas águas (prisma triangular).
    const cabins = [[-7, -6, 0.3], [7, -4, -0.4], [0, 9, 0.1]];
    for (const [x, z, ry] of cabins) {
      const cabin = new THREE.Group();
      const base = mesh(new THREE.BoxGeometry(4.0, 1.9, 3.2), 0x5a4232);
      base.position.y = 0.95;
      const roof = mesh(new THREE.CylinderGeometry(2.0, 2.0, 4.4, 3), 0x3a2f28);
      roof.rotation.z = Math.PI / 2;
      roof.rotation.y = Math.PI / 2;
      roof.position.y = 2.6;
      const chimney = mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), 0x6a6a72);
      chimney.position.set(1.2, 3.2, 0);
      cabin.add(base, roof, chimney);
      cabin.position.set(x, 0, z);
      cabin.rotation.y = ry;
      w.add(cabin);
      w.collider(x, z, 2.5);
    }
    // Serraria: cavaletes com tronco e lâmina circular.
    const mill = new THREE.Group();
    for (const px of [-1.1, 1.1]) {
      const trestle = mesh(new THREE.BoxGeometry(0.3, 1.0, 1.4), 0x4a3a2c);
      trestle.position.set(px, 0.5, 0);
      mill.add(trestle);
    }
    const trunk = mesh(new THREE.CylinderGeometry(0.4, 0.4, 3.4, 7), 0x6b4a33);
    trunk.rotation.z = Math.PI / 2;
    trunk.position.y = 1.15;
    const blade = mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 16), 0x9a9aa8, { rough: 0.4 });
    blade.rotation.x = Math.PI / 2;
    blade.position.set(0, 1.15, 0.75);
    mill.add(trunk, blade);
    mill.position.set(-10, 0, 7);
    mill.rotation.y = 0.6;
    w.add(mill);
    w.collider(-10, 7, 1.8);
    // Pilhas de toras e tocos.
    for (const [x, z] of [[10, 9], [12, 6]]) {
      for (let i = 0; i < 3; i++) {
        const log = mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.6, 7), 0x6b4a33);
        log.rotation.z = Math.PI / 2;
        log.position.set(x, 0.35 + Math.floor(i / 2) * 0.62, z + (i % 2) * 0.72 - 0.35);
        w.add(log);
      }
      w.collider(x, z, 1.4);
    }
    for (let i = 0; i < 6; i++) {
      const stump = mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.5, 7), 0x5a4232);
      stump.position.set((rng() - 0.5) * 24, 0.25, (rng() - 0.5) * 24);
      w.add(stump);
    }
    // Braseiros de contenção (brasa laranja) — a defesa da vila contra a praga.
    this._fire(w, -3, 2, 0xff7a2a, 1.2);
    this._fire(w, 4, 4, 0xff7a2a, 0);
    for (const [x, z] of [[-6, 12], [8, -10]]) this._lantern(w, x, z, 0xffb46a);
  }

  /** Abrigo do Degelo: tendas de pele, cairns, cristais e a chama azul. */
  _buildDegelo(w, rng) {
    // Tendas de pele com capuz de neve.
    const tents = [[-7, 3, 0.5], [6, -3, -0.7], [-3, -8, 0.1], [8, 8, 0.9]];
    for (const [x, z, ry] of tents) {
      const tent = mesh(new THREE.ConeGeometry(2.3, 2.8, 7), 0x7a5a44);
      tent.position.set(x, 1.4, z);
      tent.rotation.y = ry;
      const snow = mesh(new THREE.ConeGeometry(0.8, 0.7, 7), 0xeaf4ff, { rough: 1, shadow: false });
      snow.position.set(x, 3.0, z);
      const door = mesh(new THREE.BoxGeometry(0.8, 1.1, 0.2), 0x2a2018);
      const a = Math.atan2(-x, -z);
      door.position.set(x + Math.sin(a) * 2.0, 0.55, z + Math.cos(a) * 2.0);
      door.rotation.y = a;
      w.add(tent, snow, door);
      w.collider(x, z, 2.1);
    }
    // Cairns: pilhas de pedra que marcam a trilha antiga ao Coração.
    const cairns = [[0, -13], [-11, -7], [12, 2], [-9, 10], [4, 13]];
    for (const [x, z] of cairns) {
      for (let i = 0; i < 3; i++) {
        const rock = mesh(new THREE.DodecahedronGeometry(0.7 - i * 0.18, 0), 0xb8c6d0, { rough: 1 });
        rock.position.set(x, 0.4 + i * 0.75, z);
        rock.rotation.y = rng() * Math.PI;
        w.add(rock);
      }
      w.collider(x, z, 0.9);
    }
    // Cristais de gelo que emergem da encosta.
    for (const [x, z, s] of [[-12, 1, 1.0], [10, -8, 0.7], [2, 10, 0.8]]) {
      for (let i = 0; i < 3; i++) {
        const ice = mesh(new THREE.OctahedronGeometry(0.5 * s + rng() * 0.3, 0), 0x9fdcff, {
          emissive: 0x3a7ab8, emissiveIntensity: 0.5, rough: 0.2,
        });
        ice.position.set(x + (rng() - 0.5) * 1.6, 0.5 + rng() * 0.5, z + (rng() - 0.5) * 1.6);
        ice.rotation.set(rng(), rng(), rng());
        w.add(ice);
        this._flames.push({ mesh: ice, base: 0.5, amp: 0.2, speed: 1.4, seed: x + i });
      }
      w.collider(x, z, 1.0);
    }
    // A chama azul: fogueira fria no centro do abrigo.
    this._fire(w, 0, 0, 0x7ac8ff, 1.2);
    // Totem dos montanheses.
    const totem = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const block = mesh(new THREE.BoxGeometry(0.9 - i * 0.15, 0.8, 0.9 - i * 0.15), i % 2 ? 0x6a5a48 : 0x8a7458);
      block.position.y = 0.4 + i * 0.8;
      block.rotation.y = i * 0.4;
      totem.add(block);
    }
    totem.position.set(-4, 0, 8);
    w.add(totem);
    w.collider(-4, 8, 0.8);
  }

  // --- Detalhes com luz/brilho ----------------------------------------------

  /** Lanterna: poste + orbe emissivo que pulsa. */
  _lantern(w, x, z, color) {
    const pole = mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.9, 5), 0x4a3626, { shadow: false });
    pole.position.set(x, 0.95, z);
    const orb = mesh(new THREE.IcosahedronGeometry(0.22, 0), color, { emissive: color, emissiveIntensity: 1.0, rough: 0.4 });
    orb.position.set(x, 1.95, z);
    w.add(pole, orb);
    this._flames.push({ mesh: orb, base: 1.0, amp: 0.35, speed: 3.1, seed: x * 7 + z });
  }

  /** Fogueira: círculo de pedras + chama emissiva (+ luz se lightBase > 0). */
  _fire(w, x, z, color, lightBase) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const stone = mesh(new THREE.DodecahedronGeometry(0.28, 0), 0x6a6a72, { shadow: false });
      stone.position.set(x + Math.sin(a) * 0.9, 0.18, z + Math.cos(a) * 0.9);
      w.add(stone);
    }
    const flame = mesh(new THREE.ConeGeometry(0.45, 1.1, 6), color, { emissive: color, emissiveIntensity: 1.4, rough: 0.5 });
    flame.position.set(x, 0.7, z);
    w.add(flame);
    this._flames.push({ mesh: flame, base: 1.4, amp: 0.5, speed: 6.2, seed: x + z });
    w.collider(x, z, 0.9);
    if (lightBase > 0) this._fireLight(w, x, z, color, lightBase);
  }

  _fireLight(w, x, z, color, base) {
    const light = new THREE.PointLight(color, base, 22, 1.8);
    light.position.set(x, 1.6, z);
    w.add(light);
    this._lights.push({ light, base, seed: x * 3 + z });
  }
}

/** Envelope de conveniência para os builders: add local + collider em mundo. */
function wrap(group, s, mgr, rng) {
  return {
    add: (...objs) => group.add(...objs),
    collider: (lx, lz, r) => mgr._collider(s.x + lx, s.z + lz, r),
    rng,
  };
}

function mesh(geo, color, opts: any = {}) {
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.9,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 1,
    }),
  );
  m.castShadow = opts.shadow ?? true;
  m.receiveShadow = true;
  return m;
}

/** Cores das vestes por tema (morador comum, ancião, cinto e cajado). */
const VILLAGER_PALETTES = {
  druida: { robe: 0x5a8f5f, elder: 0x3f7a58, trim: 0x6b4a2f, glow: 0x9fe06a },
  palafitas: { robe: 0x6b7a3f, elder: 0x4f6b38, trim: 0x8a6b3a, glow: 0x6affc8 },
  lenhadores: { robe: 0x8a5a3a, elder: 0x6b4228, trim: 0x3a2d22, glow: 0xffb46a },
  degelo: { robe: 0x7a8a9a, elder: 0x5a6e86, trim: 0xd8e4ea, glow: 0x9fdcff },
};

function hashId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h >>> 0;
}
