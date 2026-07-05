import * as THREE from 'three';
import { C, Transform, Collider, Velocity } from '../core/ecs/components.js';
import { SETTLEMENTS } from '../data/settlements.js';
import { makeRng, angleTo } from '../utils/math.js';
import { buildVoxelGroup, makeVillagerSpec } from '../entities/voxelModels.js';
import { tiledPixelTexture } from '../core/render/pixelTextures.js';
import { buildMerchantStall } from './landmarks.js';

/** Alinha um ângulo ao grid voxel — só rotações de 90°, como no MCD (ADR 0076). */
const snap90 = (a) => Math.round(a / (Math.PI / 2)) * (Math.PI / 2);

/**
 * Alinha o CENTRO de uma estrutura para que as ARESTAS caiam nas linhas do
 * grid do chão (ADR 0079): células centradas em inteiros ⇒ arestas em
 * meios-inteiros. Dimensão ímpar ⇒ centro em inteiro; par ⇒ meio-inteiro.
 */
const alignAxis = (v, size) => (Math.round(size) % 2 === 1 ? Math.round(v) : Math.round(v - 0.5) + 0.5);

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
  _smoke: any[]; // baforadas de chaminé (sobem e dissipam em loop)
  _flags: any[]; // bandeiras/estandartes ao vento
  _water: any[]; // superfícies de água com pulso
  _villagers: any[]; // moradores que passeiam (ADR 0055)
  _waterRef: any; // material da lagoa do Vau (pulsa no animate)

  constructor(game) {
    this.game = game;
    this._current = null;
    this._flames = [];
    this._lights = [];
    this._smoke = [];
    this._flags = [];
    this._water = [];
    this._villagers = [];
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
      if (s.merchant) this._buildMerchant(s);
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
  update(dt = 0.016) {
    if (this.game.inDungeon) return;
    this._wander(dt);
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

  /**
   * Moradores passeiam (ADR 0055): alvos aleatórios perto de "casa", pausa
   * entre trajetos e param quando um jogador se aproxima (para conversar).
   * O movimento vai via Velocity (movementSystem integra e colide) e a
   * animação de andar vem de graça pelo renderSync.
   */
  _wander(dt) {
    const { game } = this;
    for (const v of this._villagers) {
      if (!game.world.entities.has(v.id)) continue;
      const tr = game.world.get(v.id, C.Transform);
      const vel = game.world.get(v.id, C.Velocity);
      if (!tr || !vel) continue;
      // Jogador por perto: para e fica disponível para conversa.
      let playerNear = false;
      for (const [, ptr] of game.world.query(C.Transform, C.PlayerControlled)) {
        if (Math.hypot(ptr.x - tr.x, ptr.z - tr.z) < 3.5) { playerNear = true; break; }
      }
      if (playerNear) { vel.vx = 0; vel.vz = 0; continue; }
      if (v.wait > 0) { v.wait -= dt; vel.vx = 0; vel.vz = 0; continue; }
      if (!v.target || Math.hypot(v.target.x - tr.x, v.target.z - tr.z) < 0.4) {
        v.target = {
          x: v.home.x + (Math.random() - 0.5) * 7,
          z: v.home.z + (Math.random() - 0.5) * 7,
        };
        v.wait = 1.5 + Math.random() * 3.5;
        continue;
      }
      const dx = v.target.x - tr.x, dz = v.target.z - tr.z;
      const d = Math.hypot(dx, dz) || 1;
      vel.vx = (dx / d) * 1.1;
      vel.vz = (dz / d) * 1.1;
      tr.rot = Math.atan2(dx, dz);
    }
  }

  /**
   * Vida ambiente: lanternas/chamas pulsam e as luzes tremulam — mais fortes
   * à noite (ADR 0049), quando são elas que desenham a vila.
   */
  animate(t) {
    const boost = this.game.dayNight?.lightBoost?.() ?? 1;
    for (const f of this._flames) {
      f.mesh.material.emissiveIntensity = (f.base + Math.sin(t * f.speed + f.seed) * f.amp) * boost;
    }
    for (const l of this._lights) {
      l.light.intensity = l.base * boost * (0.85 + 0.15 * Math.sin(t * 7 + l.seed) * Math.sin(t * 3.1 + l.seed * 2));
    }
    // Fumaça de chaminé: sobe, dissipa e recomeça (loop por baforada).
    for (const p of this._smoke) {
      const cyc = ((t * p.speed + p.seed) % 3) / 3;
      p.mesh.position.y = p.y0 + cyc * 2.2;
      p.mesh.position.x = p.x0 + Math.sin(t * 0.9 + p.seed) * 0.25;
      p.mesh.scale.setScalar(0.22 + cyc * 0.55);
      p.mesh.material.opacity = 0.32 * (1 - cyc);
    }
    // Bandeiras tremulam; água pulsa; barcos balançam.
    for (const f of this._flags) {
      f.mesh.rotation.y = f.base + Math.sin(t * 2.4 + f.seed) * 0.3;
      f.mesh.rotation.z = Math.sin(t * 3.1 + f.seed) * 0.08;
    }
    for (const w of this._water) {
      w.mat.opacity = w.base + Math.sin(t * 0.8 + w.seed) * 0.05;
      if (w.bob) w.bob.rotation.z = Math.sin(t * 0.9 + w.seed) * 0.06;
    }
  }

  /** Baforadas de fumaça saindo de uma chaminé/fogueira (coords locais). */
  _smokeAt(w, x, y0, z, color = 0xb8b8b8) {
    for (let i = 0; i < 3; i++) {
      const puff = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.42, 0.42), // fumaça em cubos, como no MC
        new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false }),
      );
      puff.position.set(x, y0, z);
      w.add(puff);
      this._smoke.push({ mesh: puff, x0: x, y0, speed: 0.5 + i * 0.07, seed: i * 1.1 + x });
    }
  }

  /** Estandarte: mastro quadrado alto + pano que treme ao vento (coords locais). */
  _flagAt(w, x, z, color) {
    const pole = mesh(new THREE.BoxGeometry(0.14, 3.3, 0.14), 0x4a3626, { shadow: false, tex: 'log', trx: 1, try: 3 });
    pole.position.set(x, 1.65, z);
    w.add(pole);
    const cloth = mesh(new THREE.BoxGeometry(1.05, 0.62, 0.06), color, { shadow: false, tex: 'cloth', trx: 1, try: 1 });
    cloth.position.set(x + 0.55, 2.85, z);
    w.add(cloth);
    this._flags.push({ mesh: cloth, base: 0, seed: x + z });
  }

  // --- Peças compartilhadas -------------------------------------------------

  /**
   * Casa de vigas com telhado de duas águas (ADR 0060): fundação de pedra,
   * cantos em viga, beiral generoso, sótão fechando a empena, porta com verga
   * e janela acesa (pulsa junto das chamas — brilha mais à noite). A leitura
   * de "casa" à distância isométrica vem da silhueta assimétrica do telhado —
   * o cone/cilindro antigo confundia com as copas das árvores.
   */
  _house(w, x, z, ry, opts: any = {}) {
    // Escala MCD (ADR 0078) com pegada INTEIRA (ADR 0079): 5×4 células.
    const bw = opts.w ?? 5, d = opts.d ?? 4, h = opts.h ?? 2.1;
    const wall = opts.wall ?? 0x8a6b4a, beam = opts.beam ?? 0x54402e;
    const roofC = opts.roof ?? 0x6d8a3d, trim = opts.trim ?? 0xb08d52;
    const g = new THREE.Group();
    // Fundação com a MESMA pegada das paredes: a aresta da casa cai
    // exatamente na linha do grid do chão (ADR 0079).
    const found = mesh(new THREE.BoxGeometry(bw, 0.35, d), 0x7d7c80, { rough: 1, tex: 'stone', trx: 4, try: 1 });
    found.position.y = 0.18;
    const walls = mesh(new THREE.BoxGeometry(bw, h, d), wall, { tex: 'planks', trx: 4, try: 2 });
    walls.position.y = 0.35 + h / 2;
    g.add(found, walls);
    for (const [cx, cz] of [[-bw / 2, -d / 2], [bw / 2, -d / 2], [-bw / 2, d / 2], [bw / 2, d / 2]]) {
      const post = mesh(new THREE.BoxGeometry(0.22, h + 0.1, 0.22), beam, { shadow: false });
      post.position.set(cx, 0.35 + h / 2, cz);
      g.add(post);
    }
    const top = 0.35 + h;
    const rise = opts.rise ?? 1.3; // altura do telhado (referência p/ chaminé)
    // Telhado de duas águas em DEGRAUS (ADR 0078): camadas que encolhem —
    // a escada clássica de telhado MC, sem lajes inclinadas.
    const steps = [
      { sw: bw + 1.2, sh: 0.46, y: top + 0.23 },
      { sw: bw * 0.62 + 0.5, sh: 0.44, y: top + 0.66 },
      { sw: bw * 0.3, sh: 0.42, y: top + 1.08 },
    ];
    for (const st of steps) {
      const layer = mesh(new THREE.BoxGeometry(st.sw, st.sh, d + 0.8), roofC, { rough: 1, tex: 'thatch', trx: 3, try: 1 });
      layer.position.y = st.y;
      g.add(layer);
    }
    const ridge = mesh(new THREE.BoxGeometry(bw * 0.3 + 0.16, 0.14, d + 0.9), trim, { shadow: false });
    ridge.position.y = top + 1.36;
    g.add(ridge);
    // Porta alta com verga e degrau (na face +Z — o chamador gira a casa).
    const door = mesh(new THREE.BoxGeometry(1.0, 1.6, 0.14), 0x39281a, { tex: 'planks' });
    door.position.set(-0.6, 0.35 + 0.8, d / 2 + 0.06);
    const lintel = mesh(new THREE.BoxGeometry(1.3, 0.18, 0.2), beam, { shadow: false });
    lintel.position.set(-0.6, 0.35 + 1.7, d / 2 + 0.08);
    const step = mesh(new THREE.BoxGeometry(1.05, 0.14, 0.55), 0x7d7c80, { shadow: false });
    step.position.set(-0.6, 0.07, d / 2 + 0.42);
    g.add(door, lintel, step);
    // Janela acesa (vida dentro da casa; entra no boost noturno).
    const pane = mesh(new THREE.BoxGeometry(0.6, 0.55, 0.08), 0xffd890, {
      emissive: 0xffb85a, emissiveIntensity: 0.55, shadow: false,
    });
    pane.position.set(0.8, 0.35 + h * 0.62, d / 2 + 0.05);
    const frame = mesh(new THREE.BoxGeometry(0.76, 0.7, 0.06), beam, { shadow: false });
    frame.position.set(0.8, 0.35 + h * 0.62, d / 2 + 0.02);
    g.add(frame, pane);
    this._flames.push({ mesh: pane, base: 0.55, amp: 0.12, speed: 1.3, seed: x + z });
    if (opts.chimney) {
      const chim = mesh(new THREE.BoxGeometry(0.5, rise + 0.9, 0.5), 0x6f6f76, { tex: 'stone', trx: 1, try: 2 });
      chim.position.set(bw / 2 - 0.55, top + (rise + 0.9) / 2, -d / 4);
      g.add(chim);
    }
    // Snap do centro por paridade da pegada em eixos de MUNDO (a rotação de
    // 90° troca largura/profundidade) — arestas nas linhas do grid.
    const rot90 = Math.abs(Math.round(ry / (Math.PI / 2))) % 2 === 1;
    const ex = rot90 ? d : bw, ez = rot90 ? bw : d;
    g.position.set(alignAxis(x, ex), 0, alignAxis(z, ez));
    g.rotation.y = ry;
    w.add(g);
    return g;
  }

  /** Offset local -> mundo (rotação Y) p/ acoplar fumaça/props a uma casa girada. */
  _spun(x, z, ry, lx, lz) {
    return { x: x + lx * Math.cos(ry) + lz * Math.sin(ry), z: z - lx * Math.sin(ry) + lz * Math.cos(ry) };
  }

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
    game.world.add(id, C.Velocity, Velocity(0, 0, 1.2));
    game.world.add(id, C.Renderable, { object3d: g, baseScale: 1 });
    game.world.add(id, C.Collider, Collider(0.55, true));
    // Anciãos ficam no posto; os demais passeiam pela vila (ADR 0055).
    if (!v.elder) this._villagers.push({ id, home: { x: wx, z: wz }, target: null, wait: Math.random() * 2 });
    // Ancião com missão vira quest giver (ADR 0047); demais só conversam.
    if (v.elder && s.quest) {
      game.world.add(id, C.Interactable, {
        kind: 'quest_giver', questId: s.quest.id, prompt: `E — Falar com ${v.name}`, range: 3, used: false, lines: v.lines,
      });
    } else {
      game.world.add(id, C.Interactable, {
        kind: 'villager', prompt: `E — Conversar com ${v.name}`, range: 3, used: false, lines: v.lines,
      });
    }
  }

  /** Mercador regional da vila: mesmo voxel do hub, estoque da região. */
  _buildMerchant(s) {
    const { game } = this;
    const g = buildVoxelGroup(makeVillagerSpec({ robe: 0xb8863f, trim: 0x5a4633 }));
    // Pegada 4×3 da banca alinhada às arestas do grid (ADR 0079).
    const wx = alignAxis(s.x + s.merchant.x, 4), wz = alignAxis(s.z + s.merchant.z, 3);
    g.position.set(wx, 0, wz);
    game.renderer.add(g);
    // Banca-estrutura em escala MCD (ADR 0075), com toldo na cor do tema.
    const stall = buildMerchantStall(s.theme === 'gelo' ? 0x4a8ab8 : 0xd8862a);
    stall.position.set(wx, 0, wz);
    game.renderer.add(stall);
    const id = game.world.createEntity();
    game.world.add(id, C.Transform, Transform(wx, wz));
    game.world.add(id, C.Renderable, { object3d: g, baseScale: 1 });
    game.world.add(id, C.Collider, Collider(0.6, true));
    game.world.add(id, C.Interactable, {
      kind: 'merchant', shopId: s.id, prompt: 'E — Mercador', range: 3.5, used: false,
    });
  }

  // --- Temas ----------------------------------------------------------------

  /** Vila druida (hub): cabanas de teto vivo, jardins, lanternas e menires. */
  _buildDruida(w, rng) {
    // Casas em anel, deixando o sul (−Z) aberto — é o caminho da campanha.
    // Teto vivo de musgo com cumeeira de palha; porta voltada ao centro.
    const huts = [[-14, -2], [14, -4], [-9, 10], [9, 11], [0, 16]];
    huts.forEach(([x, z], i) => {
      const ry = snap90(Math.atan2(-x, -z)); // porta olha o centro, no grid voxel
      const hg = this._house(w, x, z, ry, {
        wall: 0x8a6b4a, beam: 0x54402e, roof: 0x5f8a3a, trim: 0xb89b5a,
        chimney: i % 2 === 0,
      });
      w.collider(hg.position.x, hg.position.z, 3.1);
      if (i % 2 === 0) {
        const c = this._spun(hg.position.x, hg.position.z, ry, 1.95, -1.0); // topo da chaminé (casa 5×4)
        this._smokeAt(w, c.x, 4.6, c.z);
      }
    });
    // Fogueira comunal (com fumaça subindo).
    this._fire(w, 0, 4, 0xff9a4a, 1.1);
    this._smokeAt(w, 0, 1.6, 4);
    this._flagAt(w, -3.2, -17.2, 0x6cba5a); // estandarte no portão sul
    // Jardins de ervas (canteiros com brotos).
    for (const [gx, gz] of [[-5.5, 7], [5.5, 7]]) {
      const bed = mesh(new THREE.BoxGeometry(3.2, 0.3, 1.8), 0x4a3424, { tex: 'dirt', trx: 3, try: 2 });
      bed.position.set(gx, 0.15, gz);
      w.add(bed);
      for (let i = 0; i < 5; i++) {
        const sprout = mesh(new THREE.BoxGeometry(0.22, 0.5, 0.22), i % 2 ? 0x7ac86a : 0x9fe06a);
        sprout.position.set(gx - 1.2 + i * 0.6, 0.55, gz + (i % 2 ? 0.4 : -0.35));
        w.add(sprout);
      }
    }
    // Caminho de pedras do centro ao portão sul.
    for (let i = 0; i < 8; i++) {
      const stone = mesh(new THREE.BoxGeometry(0.9 + rng() * 0.3, 0.06, 0.9 + rng() * 0.3), 0x8a8578, { rough: 1, shadow: false, tex: 'stone' });
      stone.position.set((rng() - 0.5) * 1.2, 0.03, -3 - i * 2);
      w.add(stone);
    }
    // Menires gêmeos no portão sul (limiar entre a vila e o mundo selvagem).
    for (const mx of [-3, 3]) {
      const menhir = mesh(new THREE.BoxGeometry(1, 3.2, 1), 0x6a6a72, { tex: 'stone', trx: 1, try: 3 });
      menhir.position.set(mx, 1.6, -18);
      w.add(menhir);
      w.collider(mx, -18, 0.8);
    }
    // Lanternas de vagalumes.
    const lampSpots = [[-7, -1], [7, 1], [-11, 6], [11, 7], [0, 9], [-1.5, -12]];
    for (const [x, z] of lampSpots) this._lantern(w, x, z, 0xd8ffa0);
    // Cerca a leste/oeste: postes quadrados + travessa (escala MCD).
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const post = mesh(new THREE.BoxGeometry(0.22, 1.25, 0.22), 0x6b4a2f, { shadow: false, tex: 'log', trx: 1, try: 1 });
        post.position.set(sx * 18, 0.62, -6 + i * 3.4);
        w.add(post);
        if (i < 5) {
          const rail = mesh(new THREE.BoxGeometry(0.14, 0.14, 3.4), 0x5a4232, { shadow: false });
          rail.position.set(sx * 18, 0.95, -6 + i * 3.4 + 1.7);
          w.add(rail);
        }
      }
    }
  }

  /** Vau das Palafitas: lagoa, casas sobre estacas, passarelas e juncos. */
  _buildPalafitas(w, rng) {
    // Lagoa rasa em BLOCOS de água (M15.8): grade instanciada dentro do
    // raio — o vocabulário MC também na água. Material único pulsa no animate.
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2a4a44, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.85,
    });
    const cells: [number, number][] = [];
    for (let gx = -19; gx <= 19; gx++) for (let gz = -19; gz <= 19; gz++) {
      if (gx * gx + gz * gz <= 19 * 19) cells.push([gx, gz]);
    }
    const water = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.22, 1), waterMat, cells.length);
    water.receiveShadow = true;
    const dummyW = new THREE.Object3D();
    const colW = new THREE.Color();
    cells.forEach(([gx, gz], i) => {
      dummyW.position.set(gx, -0.06 + ((gx * 13 + gz * 7) % 3) * 0.015, gz); // topo ~0.05, ondulação sutil
      dummyW.updateMatrix();
      water.setMatrixAt(i, dummyW.matrix);
      colW.setHex(0xffffff).multiplyScalar(0.92 + ((gx * 31 + gz * 17) % 5) * 0.035);
      water.setColorAt(i, colW);
    });
    w.add(water);
    this._waterRef = waterMat;
    // Casas sobre estacas.
    const huts = [[-8, -4, 0], [6, -8, -Math.PI / 2], [-2, 8, 0], [10, 4, Math.PI / 2]];
    for (const [x, z, ry] of huts) {
      const hut = new THREE.Group();
      for (const [lx, lz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) {
        const leg = mesh(new THREE.BoxGeometry(0.26, 1.3, 0.26), 0x4a3626, { tex: 'log' });
        leg.position.set(lx, 0.65, lz);
        hut.add(leg);
      }
      const deck = mesh(new THREE.BoxGeometry(4, 0.25, 4), 0x6b4a33, { tex: 'planks', trx: 4, try: 4 });
      deck.position.y = 1.35;
      const cabin = mesh(new THREE.BoxGeometry(2.9, 1.6, 2.6), 0x7a5a3d, { tex: 'planks', trx: 3, try: 2 });
      cabin.position.y = 2.3;
      hut.add(deck, cabin);
      // Vigas de canto e janela acesa na cabine.
      for (const [cx, cz] of [[-1.45, -1.3], [1.45, -1.3], [-1.45, 1.3], [1.45, 1.3]]) {
        const post = mesh(new THREE.BoxGeometry(0.18, 1.7, 0.18), 0x4a3626, { shadow: false });
        post.position.set(cx, 2.3, cz);
        hut.add(post);
      }
      const pane = mesh(new THREE.BoxGeometry(0.55, 0.5, 0.08), 0xd8ffe8, {
        emissive: 0x6affc8, emissiveIntensity: 0.5, shadow: false,
      });
      pane.position.set(0.6, 2.45, 1.34);
      hut.add(pane);
      this._flames.push({ mesh: pane, base: 0.5, amp: 0.12, speed: 1.1, seed: x * 2 + z });
      // Telhado piramidal em degraus (ADR 0077): camadas de palha no grid.
      const roof = new THREE.Group();
      for (const [size, ry2] of [[4.4, 3.35], [3.0, 3.85], [1.6, 4.35]]) {
        const tier = mesh(new THREE.BoxGeometry(size, 0.52, size), 0x54683a, { rough: 1, tex: 'thatch', trx: 3, try: 1 });
        tier.position.y = ry2;
        roof.add(tier);
      }
      const finial = mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), 0x4a3626, { shadow: false });
      finial.position.y = 4.75;
      // Guarda-corpo do deck (postes + corrimão nas três faces sem escada).
      const rails = new THREE.Group();
      for (const side of [-1, 1]) {
        const rail = mesh(new THREE.BoxGeometry(0.08, 0.08, 4.0), 0x4a3626, { shadow: false });
        rail.position.set(side * 2.0, 1.95, 0);
        rails.add(rail);
        if (side === 1) { // fundo; a frente fica aberta para a escada
          const railB = mesh(new THREE.BoxGeometry(4.0, 0.08, 0.08), 0x4a3626, { shadow: false });
          railB.position.set(0, 1.95, -2.0);
          rails.add(railB);
        }
        for (let pi = -1; pi <= 1; pi++) {
          const p1 = mesh(new THREE.BoxGeometry(0.09, 0.5, 0.09), 0x4a3626, { shadow: false });
          p1.position.set(side * 2.0, 1.72, pi * 1.9);
          rails.add(p1);
        }
      }
      const ladder = mesh(new THREE.BoxGeometry(0.7, 1.3, 0.12), 0x4a3626, { shadow: false, tex: 'planks' });
      ladder.position.set(0, 0.65, 2.15);
      hut.add(roof, finial, rails, ladder);
      hut.position.set(alignAxis(x, 4), 0, alignAxis(z, 4)); // deck 4×4 no grid
      hut.rotation.y = ry;
      w.add(hut);
      w.collider(hut.position.x, hut.position.z, 2.4);
    }
    // Passarelas de tábua ligando as casas ao centro.
    for (const [x, z, len, ry] of [[-4, -2, 7, Math.PI / 2], [3, -4, 7, 0], [-1, 4, 7, 0], [5, 2, 7, Math.PI / 2]]) {
      const walk = mesh(new THREE.BoxGeometry(1.1, 0.12, len), 0x5a4028, { shadow: false, tex: 'planks', trx: 1, try: 6 });
      walk.position.set(x, 0.12, z);
      walk.rotation.y = ry;
      w.add(walk);
    }
    // Juncos na borda da lagoa.
    for (let i = 0; i < 16; i++) {
      const a = rng() * Math.PI * 2;
      const r = 15 + rng() * 4;
      const reed = mesh(new THREE.BoxGeometry(0.16, 1.4 + rng() * 0.9, 0.16), 0x5a6b2a, { shadow: false });
      reed.position.set(Math.sin(a) * r, 0.7, Math.cos(a) * r);
      w.add(reed);
    }
    // Varal de pesca e barco.
    const rack = new THREE.Group();
    for (const px of [-1, 1]) {
      const post = mesh(new THREE.BoxGeometry(0.18, 1.6, 0.18), 0x4a3626, { tex: 'log', trx: 1, try: 2 });
      post.position.set(px, 0.8, 0);
      rack.add(post);
    }
    const bar = mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), 0x4a3626, { shadow: false });
    bar.position.y = 1.5;
    rack.add(bar);
    for (let i = 0; i < 3; i++) {
      const fish = mesh(new THREE.BoxGeometry(0.16, 0.5, 0.08), 0x9ab0a0, { shadow: false });
      fish.position.set(-0.6 + i * 0.6, 1.2, 0);
      rack.add(fish);
    }
    rack.position.set(12, 0, -9);
    w.add(rack);
    const boat = mesh(new THREE.BoxGeometry(2.6, 0.5, 1.0), 0x5a4028, { tex: 'planks', trx: 2, try: 1 });
    boat.position.set(-13, 0.25, 6);
    boat.rotation.y = Math.PI / 2;
    w.add(boat);
    w.collider(-13, 6, 1.2);
    this._water.push({ mat: this._waterRef, base: 0.85, seed: 1.3, bob: boat });
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
      const log = mesh(new THREE.BoxGeometry(0.68, 3.0 + (i % 2) * 0.4, 0.68), 0x4a3a2c, { tex: 'log', trx: 1, try: 3 });
      log.position.set(x, 1.6, z);
      const tip = mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), 0x3a2d22, { shadow: false });
      tip.position.set(x, 3.3 + (i % 2) * 0.4, z);
      w.add(log, tip);
      if (i % 2 === 0) w.collider(x, z, 1.5);
    }
    // Cabanas de tronco com telhado de duas águas (prisma triangular).
    const cabins = [[-7, -6, 0], [7, -4, Math.PI / 2], [0, 9, 0]];
    for (const [x, z, ry] of cabins) {
      const cabin = new THREE.Group();
      // Paredes de toras: cilindros horizontais empilhados, com os topos
      // salientes nos cantos — a leitura clássica de cabana de lenhador.
      // Pegada INTEIRA 4×3 (ADR 0079): as toras fecham nas linhas do grid.
      for (let li = 0; li < 4; li++) {
        const y = 0.28 + li * 0.5;
        const logA = mesh(new THREE.BoxGeometry(4, 0.5, 0.5), li % 2 ? 0x5a4232 : 0x64493a, { tex: 'log', trx: 4, try: 1 });
        logA.position.set(0, y, -1.25);
        const logB = logA.clone();
        logB.position.z = 1.25;
        const logC = mesh(new THREE.BoxGeometry(0.5, 0.5, 3), li % 2 ? 0x64493a : 0x5a4232, { tex: 'log', trx: 1, try: 3 });
        logC.position.set(-1.75, y + 0.25, 0);
        const logD = logC.clone();
        logD.position.x = 1.75;
        cabin.add(logA, logB, logC, logD);
      }
      // Fechamento interno (evita ver através das frestas das toras).
      const fill = mesh(new THREE.BoxGeometry(3.4, 1.9, 2.4), 0x4a3628, { shadow: false });
      fill.position.y = 1.1;
      cabin.add(fill);
      // Telhado de duas águas em degraus (ADR 0078): tábuas escuras.
      for (const [sw, sy] of [[4.6, 2.4], [3.2, 2.86], [1.8, 3.3]]) {
        const layer = mesh(new THREE.BoxGeometry(sw, 0.5, 3.4), 0x3a2f28, { rough: 1, tex: 'planks', trx: 3, try: 1 });
        layer.position.y = sy;
        cabin.add(layer);
      }
      const ridge = mesh(new THREE.BoxGeometry(1.9, 0.14, 3.5), 0x2e2620, { shadow: false });
      ridge.position.y = 3.62;
      cabin.add(ridge);
      // Porta, janela acesa e chaminé de pedra.
      const door = mesh(new THREE.BoxGeometry(0.85, 1.3, 0.14), 0x2e2118, { tex: 'planks' });
      door.position.set(-0.7, 0.93, 1.35);
      const pane = mesh(new THREE.BoxGeometry(0.55, 0.5, 0.1), 0xffc878, {
        emissive: 0xff9a3a, emissiveIntensity: 0.6, shadow: false,
      });
      pane.position.set(0.9, 1.25, 1.35);
      cabin.add(door, pane);
      this._flames.push({ mesh: pane, base: 0.6, amp: 0.16, speed: 1.7, seed: x - z });
      const chimney = mesh(new THREE.BoxGeometry(0.55, 1.6, 0.55), 0x6a6a72, { tex: 'stone', trx: 1, try: 2 });
      chimney.position.set(1.35, 2.9, -0.6);
      cabin.add(chimney);
      const swap = Math.abs(Math.round(ry / (Math.PI / 2))) % 2 === 1;
      cabin.position.set(alignAxis(x, swap ? 3 : 4), 0, alignAxis(z, swap ? 4 : 3));
      cabin.rotation.y = ry;
      w.add(cabin);
      w.collider(cabin.position.x, cabin.position.z, 2.6);
      // Chaminé acesa: a vila queima madeira dia e noite (worldbuilding).
      const c = this._spun(cabin.position.x, cabin.position.z, ry, 1.35, -0.6);
      this._smokeAt(w, c.x, 3.9, c.z, 0xa8a098);
    }
    this._flagAt(w, 1.8, -16.2, 0xc8a06a); // estandarte no portão sul
    // Serraria: cavaletes com tronco e lâmina circular.
    const mill = new THREE.Group();
    for (const px of [-1.1, 1.1]) {
      const trestle = mesh(new THREE.BoxGeometry(0.3, 1.0, 1.4), 0x4a3a2c, { tex: 'planks' });
      trestle.position.set(px, 0.5, 0);
      mill.add(trestle);
    }
    const trunk = mesh(new THREE.BoxGeometry(3.4, 0.75, 0.75), 0x6b4a33, { tex: 'log', trx: 3, try: 1 });
    trunk.position.y = 1.15;
    const blade = mesh(new THREE.BoxGeometry(1.7, 1.7, 0.08), 0x9a9aa8, { rough: 0.4 });
    blade.position.set(0, 1.15, 0.75);
    mill.add(trunk, blade);
    mill.position.set(-10, 0, 7);
    mill.rotation.y = Math.PI / 2;
    w.add(mill);
    w.collider(-10, 7, 1.8);
    // Pilhas de toras e tocos.
    for (const [x, z] of [[10, 9], [12, 6]]) {
      for (let i = 0; i < 3; i++) {
        const log = mesh(new THREE.BoxGeometry(2.6, 0.62, 0.62), 0x6b4a33, { tex: 'log', trx: 3, try: 1 });
        log.position.set(x, 0.35 + Math.floor(i / 2) * 0.62, z + (i % 2) * 0.72 - 0.35);
        w.add(log);
      }
      w.collider(x, z, 1.4);
    }
    for (let i = 0; i < 6; i++) {
      const stump = mesh(new THREE.BoxGeometry(0.78, 0.5, 0.78), 0x5a4232, { tex: 'log' });
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
    const tents = [[-7, 3, 0], [6, -3, -Math.PI / 2], [-3, -8, 0], [8, 8, Math.PI / 2]];
    for (const [x, z, ry] of tents) {
      // Tenda em blocos (M15.8): pirâmide 3-2-1 de pele, no vocabulário MC.
      const tent = new THREE.Group();
      // Blocos de 1.0 exato (ADR 0079): a base 3×3 fecha nas linhas do grid.
      const tiers = [
        { n: 3, size: 1.0, y: 0.5 },
        { n: 2, size: 1.0, y: 1.45 },
        { n: 1, size: 1.0, y: 2.3 },
      ];
      for (const t of tiers) {
        for (let bx = 0; bx < t.n; bx++) for (let bz = 0; bz < t.n; bz++) {
          const b = mesh(new THREE.BoxGeometry(t.size, 0.95, t.size), (bx + bz) % 2 ? 0x7a5a44 : 0x715340, { tex: 'cloth' });
          b.position.set((bx - (t.n - 1) / 2) * t.size, t.y, (bz - (t.n - 1) / 2) * t.size);
          tent.add(b);
        }
      }
      tent.position.set(x, 0, z);
      tent.rotation.y = ry;
      const snow = mesh(new THREE.BoxGeometry(1.0, 0.22, 1.0), 0xeaf4ff, { rough: 1, shadow: false, tex: 'snow' });
      snow.position.set(x, 2.9, z);
      snow.rotation.y = ry;
      w.add(tent, snow);
      // Entrada voltada ao centro, alinhada ao grid: batentes retos + vão.
      const a = snap90(Math.atan2(-x, -z));
      for (const s of [-1, 1]) {
        const flap = mesh(new THREE.BoxGeometry(0.55, 1.2, 0.1), 0x66493a, { shadow: false });
        flap.position.set(x + Math.sin(a) * 1.9 + Math.cos(a) * s * 0.55, 0.6, z + Math.cos(a) * 1.9 - Math.sin(a) * s * 0.55);
        flap.rotation.y = a;
        w.add(flap);
      }
      const gap = mesh(new THREE.BoxGeometry(0.7, 1.1, 0.12), 0x241a12);
      gap.position.set(x + Math.sin(a) * 1.95, 0.55, z + Math.cos(a) * 1.95);
      gap.rotation.y = a;
      w.add(gap);
      w.collider(x, z, 2.1);
    }
    // Cairns: pilhas de pedra que marcam a trilha antiga ao Coração.
    const cairns = [[0, -13], [-11, -7], [12, 2], [-9, 10], [4, 13]];
    for (const [x, z] of cairns) {
      for (let i = 0; i < 3; i++) {
        const s = 1.3 - i * 0.34;
        const rock = mesh(new THREE.BoxGeometry(0.85 * s, 0.6, 0.85 * s), 0xb8c6d0, { rough: 1, tex: 'stone' });
        rock.position.set(x, 0.3 + i * 0.62, z);
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
        ice.rotation.set(0, Math.floor(rng() * 4) * (Math.PI / 2), 0); // cristal em pé, no grid
        w.add(ice);
        this._flames.push({ mesh: ice, base: 0.5, amp: 0.2, speed: 1.4, seed: x + i });
      }
      w.collider(x, z, 1.0);
    }
    // A chama azul: fogueira fria no centro do abrigo (fumaça gélida).
    this._fire(w, 0, 0, 0x7ac8ff, 1.2);
    this._smokeAt(w, 0, 1.6, 0, 0xd8e8f0);
    this._flagAt(w, -5.2, 8, 0x9fdcff); // estandarte junto ao totem
    // Totem dos montanheses.
    const totem = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const block = mesh(new THREE.BoxGeometry(0.9 - i * 0.15, 0.8, 0.9 - i * 0.15), i % 2 ? 0x6a5a48 : 0x8a7458, { tex: 'log' });
      block.position.y = 0.4 + i * 0.8;
      totem.add(block);
    }
    totem.position.set(-4, 0, 8);
    w.add(totem);
    w.collider(-4, 8, 0.8);
  }

  // --- Detalhes com luz/brilho ----------------------------------------------

  /** Poste de lanterna em escala MCD (ADR 0075): mastro quadrado alto,
   * braço e caixa de lanterna pendurada que pulsa. */
  _lantern(w, x, z, color) {
    const pole = mesh(new THREE.BoxGeometry(0.18, 3.1, 0.18), 0x3a2c20, { shadow: false, tex: 'log', trx: 1, try: 3 });
    pole.position.set(x, 1.55, z);
    const arm = mesh(new THREE.BoxGeometry(0.72, 0.14, 0.14), 0x3a2c20, { shadow: false });
    arm.position.set(x + 0.3, 3.0, z);
    const cap = mesh(new THREE.BoxGeometry(0.4, 0.1, 0.4), 0x2c211a, { shadow: false });
    cap.position.set(x + 0.55, 2.86, z);
    const lantern = mesh(new THREE.BoxGeometry(0.3, 0.38, 0.3), color, { emissive: color, emissiveIntensity: 1.0, rough: 0.4 });
    lantern.position.set(x + 0.55, 2.6, z);
    w.add(pole, arm, cap, lantern);
    this._flames.push({ mesh: lantern, base: 1.0, amp: 0.35, speed: 3.1, seed: x * 7 + z });
    // Lanternas também entram no pool (ADR 0065): luz firme e curta.
    const p = w.world(x + 0.55, z);
    this.game.lightPool?.register(p.x, 2.6, p.z, color, 8, 0.2);
  }

  /** Fogueira: círculo de pedras + chama emissiva (+ luz se lightBase > 0). */
  _fire(w, x, z, color, lightBase) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const stone = mesh(new THREE.BoxGeometry(0.44, 0.36, 0.44), 0x6a6a72, { shadow: false, tex: 'stone' });
      stone.position.set(x + Math.sin(a) * 0.9, 0.18, z + Math.cos(a) * 0.9);
      w.add(stone);
    }
    // Chama em cubos empilhados (base larga + língua de fogo).
    const flame = mesh(new THREE.BoxGeometry(0.62, 0.6, 0.62), color, { emissive: color, emissiveIntensity: 1.4, rough: 0.5 });
    flame.position.set(x, 0.45, z);
    const tongue = mesh(new THREE.BoxGeometry(0.32, 0.5, 0.32), color, { emissive: color, emissiveIntensity: 1.7, rough: 0.5, shadow: false });
    tongue.position.set(x, 0.98, z);
    w.add(flame, tongue);
    this._flames.push({ mesh: flame, base: 1.4, amp: 0.5, speed: 6.2, seed: x + z });
    this._flames.push({ mesh: tongue, base: 1.7, amp: 0.7, speed: 7.4, seed: x * 2 + z });
    w.collider(x, z, 0.9);
    if (lightBase > 0) this._fireLight(w, x, z, color, lightBase);
  }

  /** Fogueiras/braseiros entram no pool de luzes (ADR 0065): só as N mais
   * próximas do grupo acendem de verdade — o resto fica no emissivo. */
  _fireLight(w, x, z, color, base) {
    const p = w.world(x, z);
    this.game.lightPool?.register(p.x, 1.6, p.z, color, base * 22, 0.6);
  }
}

/** Envelope de conveniência para os builders: add local + collider em mundo. */
function wrap(group, s, mgr, rng) {
  return {
    add: (...objs) => group.add(...objs),
    collider: (lx, lz, r) => mgr._collider(s.x + lx, s.z + lz, r),
    world: (lx, lz) => ({ x: s.x + lx, z: s.z + lz }),
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
      // Pixel-art tintável (ADR 0062): `tex` é o tipo; trx/try o repeat.
      map: opts.tex ? tiledPixelTexture(opts.tex, opts.trx ?? 1, opts.try ?? 1) : null,
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
