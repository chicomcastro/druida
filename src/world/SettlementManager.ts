import * as THREE from 'three';
import { C, Transform, Collider, Velocity } from '../core/ecs/components.js';
import { SETTLEMENTS } from '../data/settlements.js';
import { makeRng, angleTo } from '../utils/math.js';
import { buildVoxelGroup, makeVillagerSpec } from '../entities/voxelModels.js';
import { pixelTexture, tiledPixelTexture } from '../core/render/pixelTextures.js';
import { buildMerchantStall } from './landmarks.js';
import { interiorTheme } from '../data/interiors.js';
import { routineGoal, goalSpread, ROUTINE_ARCHETYPES } from '../gameplay/routine.js';

/** Ponto de reunião (salão comunal) de cada vila, em coord LOCAL — onde os
 *  moradores almoçam e se reúnem ao entardecer (E22). */
const GATHER_OFFSET: Record<string, { x: number; z: number }> = {
  druida: { x: 5, z: 5 },      // fogueira comunal, ao lado da Carvalho-Mãe
  palafitas: { x: 0, z: -2 },  // deck central
  lenhadores: { x: 0, z: 3 },  // entre os braseiros
  degelo: { x: 0, z: 4 },      // praça do abrigo
};

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
  _villagers: any[]; // moradores que seguem uma rotina de dia/noite (ADR 0055/E22)
  _lastTime: number | null = null; // hora do último tick (detecta virada do dia)
  _day = 0; // contador de dias (variação diária da rotina — E22)
  _waterRef: any; // material da lagoa do Vau (pulsa no animate)
  footprints: Record<string, any[]>; // pegadas por vila (validador ADR 0085)
  streetCells: Set<string>; // células de rua em coord de mundo (validador ADR 0128)
  lanternPts: { x: number; z: number }[]; // postes em coord de mundo (validador ADR 0128)

  constructor(game) {
    this.game = game;
    this._current = null;
    this._flames = [];
    this._lights = [];
    this._smoke = [];
    this._flags = [];
    this._water = [];
    this._villagers = [];
    this.footprints = {};
    this.streetCells = new Set();
    this.lanternPts = [];
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
      this._ambientVillagers(s); // moradores passivos extras — vida própria (ADR 0121)
      this._workers(s); // trabalhadores fixos nos postos de trabalho (ADR 0123)
      if (s.merchant) this._buildMerchant(s);
      // Cozinhar deixou de ficar exposto na praça (E19.6): o caldeirão agora
      // vive dentro da taverna e do salão comunal (ver InteriorManager).
    }
    // Aviso em dev: nenhuma estrutura pode nascer dentro de outra (ADR 0085).
    for (const o of this.overlaps()) {
      console.warn(`[settlements] sobreposição em ${o.settlement}: ${o.a} × ${o.b}`);
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
   * Rotina dos moradores (E22, evolui ADR 0055): cada aldeão escolhe para onde ir
   * conforme a hora do dia e o arquétipo — trabalho, passeio, casa, e a reunião
   * no salão comunal ao almoço/entardecer (routine.routineGoal). Movimento via
   * Velocity (movementSystem integra e colide); param quando um jogador chega
   * perto (para conversar). A hora vem de `game.dayNight.time`; um contador de
   * dia (detectado na virada) dá a variação diária.
   */
  _wander(dt) {
    const { game } = this;
    const time = game.dayNight?.time ?? 0.3;
    if (this._lastTime != null && time < this._lastTime - 0.5) this._day = (this._day ?? 0) + 1;
    this._lastTime = time;
    const day = this._day ?? 0;
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
        const goal = routineGoal(v.archetype ?? 'social', time, { seed: v.seed ?? v.id, day });
        v.goal = goal;
        const anchor = goal === 'hall' ? v.gather : goal === 'roam' ? v.center
          : goal === 'work' ? v.work : v.home; // home/sleep
        const spread = goalSpread(goal);
        v.target = {
          x: anchor.x + (Math.random() - 0.5) * spread,
          z: anchor.z + (Math.random() - 0.5) * spread,
        };
        // Dormir/casa: pausas longas (fica parado); reunião: pausas curtas (troca de lugar).
        v.wait = goal === 'sleep' ? 3 + Math.random() * 5 : goal === 'hall' ? 0.6 + Math.random() * 1.6 : 1.5 + Math.random() * 3.5;
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
    // Escala MCD (ADR 0078/0080/0082) com pegada INTEIRA (ADR 0079): 6×4 no
    // padrão e pé-direito 3.0 — o avatar (~1.95u) passa FOLGADO pela porta.
    const bw = opts.w ?? 6, d = opts.d ?? 4, h = opts.h ?? 3.0;
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
    // Porta ALTA (ADR 0082): 2.5u — nitidamente maior que o avatar.
    const door = mesh(new THREE.BoxGeometry(1.2, 2.5, 0.14), 0x39281a, { tex: 'planks', trx: 1, try: 2 });
    door.position.set(-0.7, 0.35 + 1.25, d / 2 + 0.06);
    const lintel = mesh(new THREE.BoxGeometry(1.5, 0.2, 0.2), beam, { shadow: false });
    lintel.position.set(-0.7, 0.35 + 2.6, d / 2 + 0.08);
    const step = mesh(new THREE.BoxGeometry(1.25, 0.14, 0.55), 0x7d7c80, { shadow: false });
    step.position.set(-0.7, 0.07, d / 2 + 0.42);
    g.add(door, lintel, step);
    // Janelas GRANDES à altura do olho (ADR 0086): frontal ao lado da
    // porta + lateral na empena (quando não há anexo ocupando a parede).
    const winY = 0.35 + 1.5;
    const winW = bw >= 6 ? 0.95 : 0.75;
    const p1 = this._window(g, bw / 2 - 0.95, winY, d / 2 + 0.06, beam, { w: winW, h: winW });
    this._flames.push({ mesh: p1, base: 0.55, amp: 0.12, speed: 1.3, seed: x + z });
    if (!opts.annex) {
      const p2 = this._window(g, bw / 2 + 0.06, winY, -0.5, beam, { w: 0.8, h: 0.8, rotY: Math.PI / 2 });
      this._flames.push({ mesh: p2, base: 0.5, amp: 0.1, speed: 1.7, seed: x * 2 + z });
    }
    if (opts.chimney) {
      const chim = mesh(new THREE.BoxGeometry(0.5, rise + 0.9, 0.5), 0x6f6f76, { tex: 'stone', trx: 1, try: 2 });
      chim.position.set(bw / 2 - 0.55, top + (rise + 0.9) / 2, -d / 4);
      g.add(chim);
    }
    if (opts.tall) {
      // Sobrado (ADR 0080): faixa de viga entre andares + segunda fileira
      // de janelas acesas.
      const band = mesh(new THREE.BoxGeometry(bw + 0.06, 0.18, d + 0.06), beam, { shadow: false });
      band.position.y = 0.35 + h * 0.52;
      g.add(band);
      for (const px of [-1.1, 1.1]) {
        const p2 = this._window(g, px, 0.35 + h * 0.78, d / 2 + 0.06, beam, { w: 0.75, h: 0.75 });
        this._flames.push({ mesh: p2, base: 0.55, amp: 0.1, speed: 1.5, seed: x * 2 + z + px });
      }
    }
    if (opts.annex) {
      // Anexo (ADR 0080): ala 4×3 com telhado próprio em degraus, encostada
      // na lateral +X (aresta também na linha do grid quando bw é par).
      const aw = 4, ad = 3, ah = h * 0.75;
      const ax = bw / 2 + 1, az = -0.5;
      const abase = mesh(new THREE.BoxGeometry(aw, 0.35, ad), 0x7d7c80, { rough: 1, tex: 'stone', trx: 3, try: 1 });
      abase.position.set(ax, 0.18, az);
      const awalls = mesh(new THREE.BoxGeometry(aw, ah, ad), wall, { tex: 'planks', trx: 3, try: 2 });
      awalls.position.set(ax, 0.35 + ah / 2, az);
      g.add(abase, awalls);
      const atop = 0.35 + ah;
      for (const [sw2, sy2] of [[aw + 0.8, atop + 0.2], [aw * 0.45, atop + 0.58]]) {
        const layer = mesh(new THREE.BoxGeometry(sw2, 0.42, ad + 0.6), roofC, { rough: 1, tex: 'thatch', trx: 2, try: 1 });
        layer.position.set(ax, sy2, az);
        g.add(layer);
      }
      const apane = this._window(g, ax, 0.35 + 1.35, az + ad / 2 + 0.06, beam, { w: 0.75, h: 0.75 });
      this._flames.push({ mesh: apane, base: 0.5, amp: 0.1, speed: 1.1, seed: x * 3 + z });
      g.userData.annex = { x: ax, z: az };
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

  /**
   * Ruas de laje (ADR 0080): cada segmento vira um caminho em L (x depois z),
   * uma laje por célula do grid — o caminho também é tabuleiro. Todas as
   * lajes da vila num único InstancedMesh (1 draw call), com variação de tom.
   */
  _streets(w, segments, color = 0x8a8578) {
    const cells = new Map();
    for (const [x0, z0, x1, z1] of segments) {
      let x = Math.round(x0), z = Math.round(z0);
      cells.set(x + ':' + z, [x, z]);
      while (x !== Math.round(x1)) { x += Math.sign(x1 - x); cells.set(x + ':' + z, [x, z]); }
      while (z !== Math.round(z1)) { z += Math.sign(z1 - z); cells.set(x + ':' + z, [x, z]); }
    }
    if (!cells.size) return;
    // Registra as células de rua em mundo (validador ADR 0128: poste não pode
    // cair sobre a laje de um caminho).
    for (const [x, z] of cells.values()) {
      const wc = w.world(x, z);
      this.streetCells.add(Math.round(wc.x) + ':' + Math.round(wc.z));
    }
    const inst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.96, 0.06, 0.96),
      new THREE.MeshStandardMaterial({ roughness: 1, map: pixelTexture('stone') }),
      cells.size,
    );
    inst.receiveShadow = true;
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    let i = 0;
    for (const [x, z] of cells.values()) {
      dummy.position.set(x, 0.03, z);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      col.setHex(color).multiplyScalar(0.88 + (((x * 31 + z * 17) % 5) + 5) % 5 * 0.05);
      inst.setColorAt(i, col);
      i++;
    }
    w.add(inst);
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
   * Porta entrável de uma casa (ADR 0094): placa suspensa na cor do tema como
   * marca visual + entidade interativa que abre o interior. `lx/lz` são coords
   * locais da vila (convertidas para mundo pela entidade).
   */
  _houseDoor(w, lx, lz, themeId) {
    const theme = interiorTheme(themeId);
    const sign = mesh(new THREE.BoxGeometry(0.7, 0.42, 0.1), theme.accent, {
      emissive: theme.accent, emissiveIntensity: 0.7, shadow: false,
    });
    sign.position.set(lx, 2.55, lz);
    w.add(sign);
    this._flames.push({ mesh: sign, base: 0.7, amp: 0.2, speed: 2.2, seed: lx + lz });
    const wp = w.world(lx, lz);
    const id = this.game.world.createEntity();
    this.game.world.add(id, C.Transform, Transform(wp.x, wp.z));
    this.game.world.add(id, C.Interactable, {
      kind: 'house', interiorTheme: themeId, houseLabel: theme.role,
      prompt: `E — Entrar (${theme.role})`, range: 3.2, used: false,
    });
  }

  /**
   * Validador de sobreposição (ADR 0085): cada estrutura registra sua pegada
   * (AABB em coords locais da vila). `overlaps()` devolve os pares que se
   * intersectam — o teste de layout falha se houver qualquer um, e o console
   * avisa em dev. Layout "no olho" deixa de ser possível.
   */
  _fp(s, cx, cz, wxs, dzs, label) {
    this.footprints[s.id] = this.footprints[s.id] ?? [];
    this.footprints[s.id].push({ x0: cx - wxs / 2, x1: cx + wxs / 2, z0: cz - dzs / 2, z1: cz + dzs / 2, label });
  }

  overlaps() {
    const bad: any[] = [];
    for (const [sid, fps] of Object.entries(this.footprints)) {
      for (let i = 0; i < (fps as any[]).length; i++) {
        for (let j = i + 1; j < (fps as any[]).length; j++) {
          const a = fps[i], b = fps[j];
          const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
          const oz = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
          if (ox > 0.05 && oz > 0.05) bad.push({ settlement: sid, a: a.label, b: b.label, ox, oz });
        }
      }
    }
    return bad;
  }

  /**
   * Validador de postes (ADR 0128): nenhum poste de lanterna pode ficar SOBRE a
   * laje de um caminho (cai "no meio da rua"). Devolve os postes cujo centro cai
   * dentro de uma célula de rua (mundo). Postes ao LADO da rua passam.
   */
  lanternsOnStreets() {
    const bad: { x: number; z: number }[] = [];
    for (const p of this.lanternPts) {
      const key = Math.round(p.x) + ':' + Math.round(p.z);
      if (this.streetCells.has(key)) bad.push({ x: p.x, z: p.z });
    }
    return bad;
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
    // Variedade determinística por NOME (ADR 0081): tom da túnica, capuz ou
    // cabelo, avental e mochila — cada morador tem cara própria.
    const hsh = [...String(v.name ?? '')].reduce((a, ch) => ((a * 31 + ch.charCodeAt(0)) >>> 0), 7);
    const robe = new THREE.Color(v.elder ? palette.elder : palette.robe)
      .multiplyScalar(0.82 + (hsh % 7) * 0.06).getHex();
    const HAIR = [0x3a2a1a, 0x6b4a2f, 0x8a8578, 0x2a2a2a, 0xb8863f];
    const SKIN = [0xe6b88c, 0xd8a273, 0xc68a5a, 0xf0d0a8, 0x8a5a3a, 0xa9714a];
    const g = buildVoxelGroup(makeVillagerSpec({
      robe,
      trim: palette.trim,
      glow: palette.glow,
      elder: !!v.elder,
      // Menos capuz (ADR 0103): agora só ~1/4 dos comuns; rosto sempre visível.
      hood: !!v.elder || hsh % 4 === 0,
      hair: HAIR[hsh % HAIR.length],
      skin: SKIN[hsh % SKIN.length],
      beard: hsh % 5 === 3,
      apron: hsh % 4 === 1,
      pack: hsh % 5 === 2,
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
    // Anciãos ficam no posto; os demais seguem uma rotina de dia/noite (E22).
    if (!v.elder) {
      const worker = (v.radius ?? 7) <= 3; // postos de trabalho (raio curto) = trabalhadores
      const archetype = worker ? 'worker' : ROUTINE_ARCHETYPES[hsh % ROUTINE_ARCHETYPES.length];
      const off = GATHER_OFFSET[s.theme] ?? { x: 0, z: 0 };
      this._villagers.push({
        id, seed: hsh, archetype,
        home: { x: wx, z: wz },          // casa / âncora de moradia
        work: { x: wx, z: wz },          // posto (trabalhador nasce no posto)
        center: { x: s.x, z: s.z },      // centro da vila (para perambular)
        gather: { x: s.x + off.x, z: s.z + off.z }, // salão comunal (reunião)
        target: null, wait: Math.random() * 2, radius: v.radius,
      });
    }
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

  /**
   * Moradores passivos extras (ADR 0121): dão vida à vila sem papel na história.
   * Nascem nos PONTOS MÉDIOS entre moradores já existentes (ordenados por ângulo
   * ao redor do centro) — pontos na faixa de circulação, longe das casas e do
   * landmark central. Passeiam como os demais e têm falas de ambiente.
   */
  _ambientVillagers(s) {
    const base = (s.villagers ?? []).filter((v) => !v.elder && Number.isFinite(v.x));
    if (base.length < 2) return;
    const sorted = [...base].sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
    const names = AMBIENT_NAMES[s.theme] ?? AMBIENT_NAMES.druida;
    const lines = AMBIENT_LINES[s.theme] ?? AMBIENT_LINES.druida;
    let made = 0;
    for (let i = 0; i < sorted.length && made < 4; i++) {
      const a = sorted[i], b = sorted[(i + 1) % sorted.length];
      const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
      if (Math.hypot(x, z) < 4.5) continue; // não cai sobre o landmark central
      this._buildVillager(s, { name: names[made % names.length], x, z, lines });
      made++;
    }
  }

  /** Trabalhador fixo (ADR 0123): morador que fica junto a um posto de trabalho
   *  (raio de passeio curto), dando a leitura de "vida própria" — o NPC usa o
   *  objeto de cenário. Coords locais à vila. */
  _worker(s, x, z, name, lines) {
    this._buildVillager(s, { name, x, z, lines, radius: 2.2 });
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
    const CANOPY = { degelo: 0x4a8ab8, palafitas: 0x5a9a6a, lenhadores: 0xc86a3a };
    const stall = buildMerchantStall(CANOPY[s.theme] ?? 0xd8862a);
    stall.position.set(wx, 0, wz);
    game.renderer.add(stall);
    this._fp(s, wx - s.x, wz - s.z, 6, 4.5, 'banca do mercador');
    // Praça do mercador (ADR 0080): lanternas flanqueando a banca. w2 usa coords
    // de mundo diretas; expõe collider p/ os postes ficarem sólidos (ADR 0113).
    const w2 = { add: (...o) => game.renderer.add(...o), world: (x, z) => ({ x, z }), collider: (x, z, r) => this._collider(x, z, r) };
    this._lantern(w2, wx - 3, wz + 2, 0xffd27a);
    this._lantern(w2, wx + 3, wz + 2, 0xffd27a);
    this._collider(wx, wz, 1.6); // estrutura da banca é sólida (ADR 0113)
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
    // Círculo do Carvalho (ADR 0111): a vila cresce em DOIS ANÉIS ao redor da
    // Carvalho-Mãe (centro, 0,0), com uma via em anel encerrando a praça da
    // árvore e espigões radiais até cada casa. O sul (−Z) fica aberto: é o
    // limiar da campanha. Anel interno = serviços; anel externo = moradias.
    const RING = 7; // raio da via em anel ao redor da árvore
    const huts: [number, number, any][] = [
      // Anel interno (r≈13): as 6 casas de serviço, viradas para a árvore.
      [7, 12, {}],
      [13, 0, { annex: true }],
      [7, -12, { roof: 0x8a7a3a }],
      [-7, -12, {}],
      [-13, 0, { tall: true, h: 4.4, roof: 0x4c7a34 }],
      [-7, 12, { annex: true }],
      // Anel externo (r≈22): moradias, nos vãos do anel interno.
      [0, 22, { roof: 0x4c7a34 }],
      [19, 11, { w: 4, d: 4, roof: 0x8a7a3a }],
      [-19, 11, { w: 4, d: 4, roof: 0x4c7a34 }],
    ];
    // Interiores acessíveis (ADR 0094, E5): serviços no anel interno, moradias
    // no externo. Mercado geral fica na banca externa (landmarks).
    const HOUSE_THEMES = ['weapons', 'armor', 'tavern', 'leader', 'hall', 'garden', 'home', 'home', 'home'];
    // Espigões de porta (ADR 0083): da porta de cada casa até a via em anel.
    // Os postes ficam no FIM do espigão (na via em anel), longe das casas e
    // espaçados — não mais ao lado das portas (ADR 0120).
    const spurs: number[][] = [];
    huts.forEach(([x, z, o], i) => {
      const ry = snap90(Math.atan2(-x, -z)); // porta olha o centro, no grid voxel
      const hg = this._house(w, x, z, ry, {
        wall: 0x8a6b4a, beam: 0x54402e, roof: 0x5f8a3a, trim: 0xb89b5a,
        chimney: i % 2 === 0, ...o,
      });
      w.collider(hg.position.x, hg.position.z, (o.w ?? 6) / 2 + 0.6);
      const r90 = Math.abs(Math.round(ry / (Math.PI / 2))) % 2 === 1;
      w.fp(hg.position.x, hg.position.z, r90 ? (o.d ?? 4) : (o.w ?? 6), r90 ? (o.w ?? 6) : (o.d ?? 4), `casa ${i}`);
      if (hg.userData.annex) {
        const a = this._spun(hg.position.x, hg.position.z, ry, hg.userData.annex.x, hg.userData.annex.z);
        w.collider(a.x, a.z, 2.1);
        const a2 = this._spun(hg.position.x, hg.position.z, ry, (o.w ?? 6) / 2 + 1.5, -0.5);
        w.fp(a2.x, a2.z, 3, 3, `anexo ${i}`); // só a parte fora da casa
      }
      const dpos = this._spun(hg.position.x, hg.position.z, ry, -0.7, (o.d ?? 4) / 2 + 0.8);
      this._houseDoor(w, dpos.x, dpos.z, HOUSE_THEMES[i] ?? 'home'); // porta entrável (ADR 0094)
      // Espigão em L da porta até a via em anel (±RING), sem cruzar a árvore.
      const dx = Math.round(dpos.x), dz = Math.round(dpos.z);
      const rx = Math.abs(dx) > RING ? Math.sign(dx) * RING : dx;
      const rz = Math.abs(dz) > RING ? Math.sign(dz) * RING : dz;
      spurs.push([dx, dz, rx, dz], [rx, dz, rx, rz]);
      if (i % 2 === 0) {
        const c = this._spun(hg.position.x, hg.position.z, ry, (o.w ?? 6) / 2 - 0.55, -1.0);
        this._smokeAt(w, c.x, 0.35 + (o.h ?? 3.0) + 2.3, c.z); // topo da chaminé
      }
    });
    // Ruas de laje (ADR 0080/0083): a via em anel quadrada ao redor da árvore,
    // o corredor sul até o portão e os espigões de porta — tudo interligado.
    this._streets(w, [
      // via em anel (quadrada) encerrando a praça da Carvalho-Mãe
      [-RING, -RING, RING, -RING], [RING, -RING, RING, RING],
      [RING, RING, -RING, RING], [-RING, RING, -RING, -RING],
      // corredor ao portão sul
      [0, -RING, 0, -24],
      // caminho até a FRENTE da banca do mercador (para na frente, não por baixo)
      [RING, RING, 12, RING], [12, RING, 12, 14],
      ...spurs,
    ]);
    // Pegadas dos marcos fixos do hub (validador ADR 0085).
    w.fp(0, 0, 3.4, 3.4, 'carvalho-mãe');
    w.fp(5, 5, 2.4, 2.4, 'fogueira');
    w.fp(-5, 5, 3.2, 1.8, 'jardim-oeste');
    w.fp(5, -5, 1.8, 3.2, 'jardim-leste');
    w.fp(12, 17, 6, 4.5, 'banca do mercador'); // vão NE, fora das ruas (ADR 0113)
    w.fp(8, 17, 1.2, 1, 'baú');
    // Fogueira comunal (com fumaça subindo), na praça ao lado da árvore.
    this._fire(w, 5, 5, 0xff9a4a, 1.1);
    this._smokeAt(w, 5, 1.6, 5);
    this._flagAt(w, -3.2, -23.2, 0x6cba5a); // estandarte no portão sul
    // Jardins de ervas: agora canteiros funcionais (E20.2). Os dois canteiros
    // da praça viram entidades interativas 'plot' construídas pelo FarmManager
    // (semear → crescer → colher). Mantemos só as pegadas para o validador.
    // Props de rua (ADR 0084): barris e lenha na praça, varais nos anéis.
    this._barrel(w, -5, -4);
    this._barrel(w, -5.8, -4.3);
    this._woodpile(w, 5, 3, Math.PI / 2);
    this._clothesline(w, 17, 7, 0x6cba5a); // no vão fora do anexo da casa 1 (ADR 0116)
    this._clothesline(w, -16, 6, 0xb89b5a);
    // Varais entram no validador de pegadas (ADR 0085/0116): postes largos não
    // podem invadir casas/anexos — foi assim que um deles colava na casa 1.
    w.fp(17, 7, 2.8, 0.9, 'varal leste');
    w.fp(-16, 6, 2.8, 0.9, 'varal oeste');
    // Menires gêmeos no portão sul (limiar entre a vila e o mundo selvagem).
    for (const mx of [-3, 3]) {
      const menhir = mesh(new THREE.BoxGeometry(1, 3.2, 1), 0x6a6a72, { tex: 'stone', trx: 1, try: 3 });
      menhir.position.set(mx, 1.6, -24);
      w.add(menhir);
      w.collider(mx, -24, 0.8);
    }
    // Lanternas LADEANDO os caminhos (ADR 0120): cada poste fica no tile ao lado
    // da rua (~1.3u fora da via, nunca sobre ela) e a luz aponta para a rua mais
    // próxima. Postes ladeiam a via em anel (2 por lado), o corredor sul e o
    // espigão do mercado — espaçados, longe das casas. [x, z, faceX, faceZ].
    const lampSpots = [
      [8.3, 4, 7, 4], [8.3, -4, 7, -4], [-8.3, 4, -7, 4], [-8.3, -4, -7, -4],   // lados L/O do anel
      [4, 8.3, 4, 7], [-4, 8.3, -4, 7], [4, -8.3, 4, -7], [-4, -8.3, -4, -7],   // lados S/N do anel
      [1.7, -12, 0, -12], [1.7, -19, 0, -19],                                   // corredor sul
      [14.5, 13, 12, 13],                                                       // ao lado do espigão do mercado (fora da laje)
    ];
    for (const [x, z, fx, fz] of lampSpots) this._lantern(w, x, z, 0xd8ffa0, fx, fz);
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
    // Portas/escadas voltadas ao CENTRO (ADR 0083) — ninguém desce no vazio.
    // 5a casa a noroeste (ADR 0084): a vila cresce sobre a lagoa.
    const huts = [[-8, -4, Math.PI / 2], [6, -8, 0], [-2, 8, Math.PI], [10, 4, -Math.PI / 2], [-9, 6, Math.PI / 2]];
    for (const [x, z, ry] of huts) {
      const hut = new THREE.Group();
      for (const [lx, lz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) {
        const leg = mesh(new THREE.BoxGeometry(0.3, 1.5, 0.3), 0x4a3626, { tex: 'log' });
        leg.position.set(lx, 0.75, lz);
        hut.add(leg);
      }
      // Deck 5x5 e cabine de 2.4u (ADR 0082): o coletor entra em pe.
      const deck = mesh(new THREE.BoxGeometry(5, 0.25, 5), 0x6b4a33, { tex: 'planks', trx: 5, try: 5 });
      deck.position.y = 1.55;
      const cabin = mesh(new THREE.BoxGeometry(3.6, 2.4, 3), 0x7a5a3d, { tex: 'planks', trx: 4, try: 2 });
      cabin.position.y = 2.9;
      hut.add(deck, cabin);
      // Porta alta na frente da cabine + vigas de canto e janela acesa.
      const cdoor = mesh(new THREE.BoxGeometry(1.0, 2.1, 0.1), 0x39281a, { tex: 'planks', trx: 1, try: 2 });
      cdoor.position.set(-0.7, 2.75, 1.54);
      hut.add(cdoor);
      for (const [cx, cz] of [[-1.8, -1.5], [1.8, -1.5], [-1.8, 1.5], [1.8, 1.5]]) {
        const post = mesh(new THREE.BoxGeometry(0.18, 2.5, 0.18), 0x4a3626, { shadow: false });
        post.position.set(cx, 2.9, cz);
        hut.add(post);
      }
      const pane = this._window(hut, 0.9, 2.95, 1.56, 0x4a3626, { w: 0.8, h: 0.8, glow: 0x6affc8 });
      this._flames.push({ mesh: pane, base: 0.5, amp: 0.12, speed: 1.1, seed: x * 2 + z });
      // Telhado piramidal em degraus (ADR 0077): camadas de palha no grid.
      const roof = new THREE.Group();
      for (const [size, ry2] of [[5.4, 4.4], [3.8, 4.9], [2.2, 5.4]]) {
        const tier = mesh(new THREE.BoxGeometry(size, 0.52, size), 0x54683a, { rough: 1, tex: 'thatch', trx: 3, try: 1 });
        tier.position.y = ry2;
        roof.add(tier);
      }
      const finial = mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), 0x4a3626, { shadow: false });
      finial.position.y = 5.85;
      // Guarda-corpo do deck (postes + corrimao nas tres faces sem escada).
      const rails = new THREE.Group();
      for (const side of [-1, 1]) {
        const rail = mesh(new THREE.BoxGeometry(0.08, 0.08, 5.0), 0x4a3626, { shadow: false });
        rail.position.set(side * 2.5, 2.2, 0);
        rails.add(rail);
        if (side === 1) { // fundo; a frente fica aberta para a escada
          const railB = mesh(new THREE.BoxGeometry(5.0, 0.08, 0.08), 0x4a3626, { shadow: false });
          railB.position.set(0, 2.2, -2.5);
          rails.add(railB);
        }
        for (let pi = -1; pi <= 1; pi++) {
          const p1 = mesh(new THREE.BoxGeometry(0.09, 0.55, 0.09), 0x4a3626, { shadow: false });
          p1.position.set(side * 2.5, 1.95, pi * 2.3);
          rails.add(p1);
        }
      }
      const ladder = mesh(new THREE.BoxGeometry(0.8, 1.55, 0.12), 0x4a3626, { shadow: false, tex: 'planks' });
      ladder.position.set(0, 0.78, 2.62);
      hut.add(roof, finial, rails, ladder);
      hut.position.set(alignAxis(x, 5), 0, alignAxis(z, 5)); // deck 5x5 no grid
      hut.rotation.y = ry;
      w.add(hut);
      w.collider(hut.position.x, hut.position.z, 2.9);
      w.fp(hut.position.x, hut.position.z, 5, 5, `palafita ${x},${z}`);
    }
    // Portas entráveis (ADR 0097, E7): cada palafita vira um serviço.
    // Rixa do Vau (ADR 0107): duas famílias rivais + mercado + taverna.
    const PAL_THEMES = ['vau_arpo', 'vau_couro', 'tavern', 'market', 'garden'];
    huts.forEach(([x, z, ry], hi) => {
      const px = alignAxis(x, 5), pz = alignAxis(z, 5);
      const dp = this._spun(px, pz, ry, 0, 2.0); // na FRENTE do deck (ADR 0127) — não flutua sobre a água
      this._houseDoor(w, dp.x, dp.z, PAL_THEMES[hi] ?? 'home');
    });
    // Passarelas de tábua: da BASE DA ESCADA de cada casa até o centro, em
    // L ortogonal (ADR 0083) — a rede de píer fica toda interligada.
    for (const [x, z, len, ry] of [
      [-2.2, -4, 4.5, Math.PI / 2], [0, -2, 4, 0],   // casa oeste
      [6, -2.2, 4.5, 0], [3, 0, 6, Math.PI / 2],     // casa sul
      [-2, 2.2, 4.5, 0], [-1, 0, 2, Math.PI / 2],    // casa norte
      [3.2, 4, 6.5, Math.PI / 2], [0, 2, 4, 0],      // casa leste
      [-3.2, 6, 4.6, Math.PI / 2], [-1, 4.5, 3.5, 0], // casa noroeste (5a)
    ]) {
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
    w.fp(12, -9, 2.4, 0.8, 'varal de pesca');
    const boat = mesh(new THREE.BoxGeometry(2.6, 0.5, 1.0), 0x5a4028, { tex: 'planks', trx: 2, try: 1 });
    boat.position.set(-13, 0.25, 6);
    boat.rotation.y = Math.PI / 2;
    w.add(boat);
    w.collider(-13, 6, 1.2);
    w.fp(-13, 6, 2.8, 1.2, 'barco');
    this._water.push({ mat: this._waterRef, base: 0.85, seed: 1.3, bob: boat });
    // Píer de pesca (ADR 0084): a assinatura do Vau — avança sobre a lagoa
    // rumo ao norte, com postes, lanterna na ponta e barco amarrado.
    const pier = mesh(new THREE.BoxGeometry(1.3, 0.12, 10), 0x5a4028, { shadow: false, tex: 'planks', trx: 1, try: 8 });
    pier.position.set(1, 0.14, 7);
    w.add(pier);
    for (const pz of [4, 7, 10]) {
      for (const px of [0.45, 1.55]) {
        const post = mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), 0x4a3626, { shadow: false, tex: 'log' });
        post.position.set(px, 0.45, pz);
        w.add(post);
      }
    }
    this._lantern(w, 1, 12, 0x6affc8, 1, 7); // ponta do píer, luz descendo o caminho (ADR 0122)
    const boat2 = mesh(new THREE.BoxGeometry(2.6, 0.5, 1.0), 0x5a4028, { tex: 'planks', trx: 2, try: 1 });
    boat2.position.set(3.2, 0.25, 10.5);
    boat2.rotation.y = Math.PI / 2;
    w.add(boat2);
    w.fp(3.2, 10.5, 1.2, 2.8, 'barco do píer');
    this._water.push({ mat: this._waterRef, base: 0.85, seed: 2.6, bob: boat2 });
    // Barris de seiva na junção das passarelas (ADR 0084).
    this._barrel(w, 1.6, 1);
    this._barrel(w, -1.6, -1.2);
    this._fishTable(w, 4, -3); // mesa de limpar peixe (worker em _workers, ADR 0123)
    // Lanternas de musgo (verde-água): uma no CANTO EXTERNO do deck de cada
    // palafita (sobre a plataforma sólida, fora das passarelas), luz p/ o centro
    // (ADR 0127). Antes caíam no meio das passarelas.
    for (const [hx, hz] of [[-8, -4], [6, -8], [-2, 8], [10, 4], [-9, 6]]) {
      const len = Math.hypot(hx, hz) || 1;
      this._lantern(w, hx + (hx / len) * 1.8, hz + (hz / len) * 1.8, 0x6affc8, 0, 0);
    }
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
    // Portas voltadas ao centro (ADR 0083).
    const cabins = [[-7, -6, Math.PI / 2], [7, -4, -Math.PI / 2], [0, 9, Math.PI], [-12, 0, Math.PI / 2]];
    for (const [x, z, ry] of cabins) {
      const cabin = new THREE.Group();
      // Paredes de toras: cilindros horizontais empilhados, com os topos
      // salientes nos cantos — a leitura clássica de cabana de lenhador.
      // Pegada INTEIRA 6×4 (ADR 0079/0080), 6 fiadas de tora (ADR 0082):
      // parede de 3u — o lenhador passa pela porta sem abaixar.
      for (let li = 0; li < 6; li++) {
        const y = 0.28 + li * 0.5;
        const logA = mesh(new THREE.BoxGeometry(6, 0.5, 0.5), li % 2 ? 0x5a4232 : 0x64493a, { tex: 'log', trx: 6, try: 1 });
        logA.position.set(0, y, -1.75);
        const logB = logA.clone();
        logB.position.z = 1.75;
        const logC = mesh(new THREE.BoxGeometry(0.5, 0.5, 4), li % 2 ? 0x64493a : 0x5a4232, { tex: 'log', trx: 1, try: 4 });
        logC.position.set(-2.75, y + 0.25, 0);
        const logD = logC.clone();
        logD.position.x = 2.75;
        cabin.add(logA, logB, logC, logD);
      }
      // Fechamento interno (evita ver através das frestas das toras).
      const fill = mesh(new THREE.BoxGeometry(5.4, 2.9, 3.4), 0x4a3628, { shadow: false });
      fill.position.y = 1.6;
      cabin.add(fill);
      // Telhado de duas águas em degraus (ADR 0078): tábuas escuras.
      for (const [sw, sy] of [[6.8, 3.45], [4.6, 3.91], [2.4, 4.35]]) {
        const layer = mesh(new THREE.BoxGeometry(sw, 0.5, 4.5), 0x3a2f28, { rough: 1, tex: 'planks', trx: 4, try: 1 });
        layer.position.y = sy;
        cabin.add(layer);
      }
      const ridge = mesh(new THREE.BoxGeometry(2.5, 0.14, 4.6), 0x2e2620, { shadow: false });
      ridge.position.y = 4.67;
      cabin.add(ridge);
      // Porta ALTA (2.4u), janelas acesas e chaminé de pedra.
      const door = mesh(new THREE.BoxGeometry(1.15, 2.4, 0.14), 0x2e2118, { tex: 'planks', trx: 1, try: 2 });
      door.position.set(-1.0, 1.2, 1.85);
      for (const px of [0.7, 2.0]) {
        const pane = this._window(cabin, px, 1.75, 1.9, 0x3a2d22, { w: 0.85, h: 0.85, glow: 0xff9a3a });
        this._flames.push({ mesh: pane, base: 0.6, amp: 0.16, speed: 1.7, seed: x - z + px });
      }
      cabin.add(door);
      const chimney = mesh(new THREE.BoxGeometry(0.55, 2.2, 0.55), 0x6a6a72, { tex: 'stone', trx: 1, try: 2 });
      chimney.position.set(2.0, 3.9, -0.8);
      cabin.add(chimney);
      const swap = Math.abs(Math.round(ry / (Math.PI / 2))) % 2 === 1;
      cabin.position.set(alignAxis(x, swap ? 4 : 6), 0, alignAxis(z, swap ? 6 : 4));
      cabin.rotation.y = ry;
      w.add(cabin);
      w.collider(cabin.position.x, cabin.position.z, 3.4);
      w.fp(cabin.position.x, cabin.position.z, swap ? 4 : 6, swap ? 6 : 4, `cabana ${x},${z}`);
      // Chaminé acesa: a vila queima madeira dia e noite (worldbuilding).
      const c = this._spun(cabin.position.x, cabin.position.z, ry, 2.0, -0.8);
      this._smokeAt(w, c.x, 5.2, c.z, 0xa8a098);
    }
    this._flagAt(w, 1.8, -16.2, 0xc8a06a); // estandarte no portão sul
    // Portas entráveis (ADR 0097, E7): as cabanas viram serviços da vila.
    // Rixa de Cinzafolha (ADR 0107): serraria × forno + taverna (mercador é ao ar livre).
    const LEN_THEMES = ['cinza_serra', 'cinza_forno', 'tavern', 'garden'];
    cabins.forEach(([x, z, ry], ci) => {
      const swap = Math.abs(Math.round(ry / (Math.PI / 2))) % 2 === 1;
      const px = alignAxis(x, swap ? 4 : 6), pz = alignAxis(z, swap ? 6 : 4);
      const dp = this._spun(px, pz, ry, -1.0, 2.6); // à frente da porta
      this._houseDoor(w, dp.x, dp.z, LEN_THEMES[ci] ?? 'home');
    });
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
    w.fp(-10, 7, 2.2, 3.8, 'serraria');
    // Pilhas de toras e tocos.
    for (const [x, z] of [[10, 9], [12, 6]]) {
      for (let i = 0; i < 3; i++) {
        const log = mesh(new THREE.BoxGeometry(2.6, 0.62, 0.62), 0x6b4a33, { tex: 'log', trx: 3, try: 1 });
        log.position.set(x, 0.35 + Math.floor(i / 2) * 0.62, z + (i % 2) * 0.72 - 0.35);
        w.add(log);
      }
      w.collider(x, z, 1.4);
      w.fp(x, z, 2.8, 1.6, `pilha ${x},${z}`);
    }
    for (let i = 0; i < 6; i++) {
      const stump = mesh(new THREE.BoxGeometry(0.78, 0.5, 0.78), 0x5a4232, { tex: 'log' });
      stump.position.set((rng() - 0.5) * 24, 0.25, (rng() - 0.5) * 24);
      w.add(stump);
    }
    // Braseiros de contenção (brasa laranja) — a defesa da vila contra a praga.
    this._fire(w, -3, 2, 0xff7a2a, 1.2);
    this._fire(w, 4, 4, 0xff7a2a, 0);
    // Postes de brasa ladeando a praça/corredor (ADR 0127): antes só havia 2 nas
    // quinas, invisíveis do centro. Luz voltada ao miolo da vila.
    for (const [x, z] of [[2.5, -5], [-2.5, 3.5], [2.5, 5.5], [-2.5, -3], [-6, 12], [8, -10]]) {
      this._lantern(w, x, z, 0xffb46a, 0, 0);
    }
    // Torre de vigia (ADR 0084): a assinatura de Cinzafolha — os lenhadores
    // vigiam a floresta corrompida do alto, com lanterna acesa.
    const tower = new THREE.Group();
    for (const [lx, lz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
      const leg = mesh(new THREE.BoxGeometry(0.35, 5.2, 0.35), 0x4a3a2c, { tex: 'log', trx: 1, try: 4 });
      leg.position.set(lx, 2.6, lz);
      tower.add(leg);
    }
    const platform = mesh(new THREE.BoxGeometry(3.4, 0.3, 3.4), 0x5a4232, { tex: 'planks', trx: 3, try: 3 });
    platform.position.y = 5.2;
    tower.add(platform);
    for (const sd of [-1, 1]) {
      const r1 = mesh(new THREE.BoxGeometry(0.12, 0.12, 3.4), 0x3a2d22, { shadow: false });
      r1.position.set(sd * 1.65, 6.0, 0);
      const r2 = mesh(new THREE.BoxGeometry(3.4, 0.12, 0.12), 0x3a2d22, { shadow: false });
      r2.position.set(0, 6.0, sd * 1.65);
      tower.add(r1, r2);
    }
    for (const [sw2, sy2] of [[3.8, 7.1], [2.2, 7.56]]) {
      const layer = mesh(new THREE.BoxGeometry(sw2, 0.46, sw2), 0x3a2f28, { rough: 1, tex: 'planks', trx: 3, try: 1 });
      layer.position.y = sy2;
      tower.add(layer);
    }
    const towerLadder = mesh(new THREE.BoxGeometry(0.7, 5.0, 0.12), 0x3a2d22, { shadow: false, tex: 'planks', trx: 1, try: 4 });
    towerLadder.position.set(0, 2.5, 1.28);
    tower.add(towerLadder);
    const beacon = mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), 0xffb46a, { emissive: 0xffb46a, emissiveIntensity: 1.2, rough: 0.4 });
    beacon.position.y = 6.5;
    tower.add(beacon);
    this._flames.push({ mesh: beacon, base: 1.2, amp: 0.3, speed: 2.6, seed: 5 });
    // (-6,-12): longe da banca do mercador — o validador pegou a colisão.
    tower.position.set(-6, 0, -12);
    w.add(tower);
    w.collider(-6, -12, 1.9);
    w.fp(-6, -12, 3.8, 3.8, 'torre de vigia');
    const tp = w.world(-6, -12);
    this.game.lightPool?.register(tp.x, 6.5, tp.z, 0xffb46a, 14, 0.3);
    // Barris e lenha ao longo das ruas (ADR 0084).
    this._barrel(w, -2, -6);
    this._barrel(w, -2.9, -6.2);
    this._woodpile(w, 4, 6, Math.PI / 2);
    this._woodpile(w, -3, -8);
    w.fp(-2.45, -6.1, 2, 1.2, 'barris');
    w.fp(4, 6, 1.9, 1.9, 'lenha-norte');
    w.fp(-3, -8, 1.9, 1.9, 'lenha-sul');
    this._choppingBlock(w, 8, 1); // posto de rachar lenha (worker em _workers, ADR 0123)
    // Ruas de laje: portão sul, portas das cabanas, torre e centro.
    this._streets(w, [
      [0, -14, 0, 7],
      [-4, -4, 0, -4], // porta da cabana oeste
      [4, -4, 0, -4],  // porta da cabana leste
      [1, 7, 0, 7],    // porta da cabana norte
      [-4, -12, 0, -12], // torre de vigia
    ], 0x6a6156);
  }

  /** Abrigo do Degelo: tendas de pele, cairns, cristais e a chama azul. */
  _buildDegelo(w, rng) {
    // Tendas de pele com capuz de neve.
    // 5a tenda ao sul (ADR 0084), guardando a trilha dos cairns.
    const tents = [[-7, 3, 0], [6, -3, -Math.PI / 2], [-3, -8, 0], [8, 8, Math.PI / 2], [-9, -12, 0]];
    for (const [x, z, ry] of tents) {
      // Tenda em blocos (M15.8): pirâmide 3-2-1 de pele, no vocabulário MC.
      const tent = new THREE.Group();
      // Pirâmide 5-3-1 com PAREDE-BASE de 2.2u (ADR 0085): a porta cabe
      // inteira dentro da camada de baixo — nada flutua acima da base.
      const tiers = [
        { n: 5, size: 1.0, y: 1.1, h: 2.2 },
        { n: 3, size: 1.0, y: 2.85, h: 1.3 },
        { n: 1, size: 1.0, y: 4.0, h: 1.0 },
      ];
      for (const t of tiers) {
        for (let bx = 0; bx < t.n; bx++) for (let bz = 0; bz < t.n; bz++) {
          const b = mesh(new THREE.BoxGeometry(t.size, t.h, t.size), (bx + bz) % 2 ? 0x7a5a44 : 0x715340, { tex: 'cloth' });
          b.position.set((bx - (t.n - 1) / 2) * t.size, t.y, (bz - (t.n - 1) / 2) * t.size);
          tent.add(b);
        }
      }
      tent.position.set(x, 0, z);
      tent.rotation.y = ry;
      const snow = mesh(new THREE.BoxGeometry(1.0, 0.22, 1.0), 0xeaf4ff, { rough: 1, shadow: false, tex: 'snow' });
      snow.position.set(x, 4.6, z);
      snow.rotation.y = ry;
      w.add(tent, snow);
      // Entrada ALTA voltada ao centro (vão 2.2u): batentes retos + vão.
      const a = snap90(Math.atan2(-x, -z));
      for (const s of [-1, 1]) {
        const flap = mesh(new THREE.BoxGeometry(0.55, 2.05, 0.1), 0x66493a, { shadow: false });
        flap.position.set(x + Math.sin(a) * 2.55, 1.02, z + Math.cos(a) * 2.55);
        flap.position.x += Math.cos(a) * s * 0.75;
        flap.position.z -= Math.sin(a) * s * 0.75;
        flap.rotation.y = a;
        w.add(flap);
      }
      const gap = mesh(new THREE.BoxGeometry(0.95, 2.05, 0.12), 0x241a12);
      gap.position.set(x + Math.sin(a) * 2.55, 1.02, z + Math.cos(a) * 2.55);
      gap.rotation.y = a;
      w.add(gap);
      w.collider(x, z, 2.9);
      w.fp(x, z, 5, 5, `tenda ${x},${z}`);
    }
    // Pegadas dos marcos do Degelo (validador ADR 0085).
    w.fp(0, 0, 2.4, 2.4, 'chama azul');
    w.fp(-4, 8, 1, 1, 'totem');
    w.fp(-3.5, 12.5, 4.2, 2.2, 'muro-gelo-oeste');
    w.fp(3.5, 12.5, 4.2, 2.2, 'muro-gelo-leste');
    w.fp(-5, -1, 1.9, 1.9, 'lenha');
    w.fp(3, -6, 1, 1, 'barril');
    // Portas entráveis (ADR 0097, E7): as tendas viram serviços do abrigo.
    // Rixa do Degelo (ADR 0107): trilha × rebanho + mercado + taverna.
    const DEG_THEMES = ['degelo_trilha', 'degelo_pasto', 'tavern', 'market', 'garden'];
    tents.forEach(([x, z], ti) => {
      const a = snap90(Math.atan2(-x, -z)); // entrada voltada ao centro
      const dx = x + Math.sin(a) * 2.9, dz = z + Math.cos(a) * 2.9;
      this._houseDoor(w, dx, dz, DEG_THEMES[ti] ?? 'home');
    });
    // Cairns: pilhas de pedra que marcam a trilha antiga ao Coração.
    const cairns = [[0, -13], [-11, -7], [12, 2], [-9, 10], [7, 13]]; // (7,13): fora do muro de gelo
    for (const [x, z] of cairns) {
      for (let i = 0; i < 3; i++) {
        const s = 1.3 - i * 0.34;
        const rock = mesh(new THREE.BoxGeometry(0.85 * s, 0.6, 0.85 * s), 0xb8c6d0, { rough: 1, tex: 'stone' });
        rock.position.set(x, 0.3 + i * 0.62, z);
        w.add(rock);
      }
      w.collider(x, z, 0.9);
      w.fp(x, z, 1.5, 1.5, `cairn ${x},${z}`);
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
    // Muro quebra-vento de gelo (ADR 0084): a assinatura do Degelo — blocos
    // de gelo empilhados protegem o abrigo da nevasca do norte.
    const iceMat = { emissive: 0x3a7ab8, emissiveIntensity: 0.35, rough: 0.2 };
    [[-5, 12, 1.3], [-4, 13, 1.7], [-3, 13, 1.4], [-2, 13, 1.8], [2, 13, 1.6], [3, 13, 1.9], [4, 13, 1.4], [5, 12, 1.2]].forEach(([bx, bz, bh]) => {
      const ice = mesh(new THREE.BoxGeometry(1, bh, 1), 0x9fdcff, iceMat);
      ice.position.set(bx, bh / 2, bz);
      w.add(ice);
    });
    w.collider(-3, 13, 1.6);
    w.collider(3, 13, 1.6);
    // Lenha e barris junto à chama azul (ADR 0084).
    this._woodpile(w, -5, -1, Math.PI / 2);
    this._barrel(w, 3, -6);
    this._furRack(w, 6, 2); // bastidor de curtir peles (worker em _workers, ADR 0123)
    // Postes de gelo ao redor da chama azul (ADR 0127): o Degelo não tinha
    // lanternas visíveis. Luz fria voltada ao centro do abrigo.
    for (const [x, z] of [[2.5, 2.5], [-2.5, -2.5], [2.5, -2.5], [-5, 3]]) {
      this._lantern(w, x, z, 0x9fdcff, 0, 0);
    }
    // Trilhas de laje ligando as tendas à chama azul (ADR 0080/0083).
    this._streets(w, [
      [-4, 3, -2, 3], [-2, 3, -2, 0], [3, -3, 2, -3], [2, -3, 2, 0],
      [-3, -5, -3, -2], [5, 8, 2, 8], [2, 8, 2, 2],
      [-9, -9, -3, -9], [-3, -9, -3, -5],
    ], 0x9aa8b4);
  }

  /**
   * Janela com moldura e cruzeta (ADR 0086): peitoril à altura do olho,
   * vidro aceso que entra no boost noturno. Devolve o pane para _flames.
   */
  _window(parent, x, y, z, beam, opts: any = {}) {
    const ww = opts.w ?? 0.95, wh = opts.h ?? 0.95;
    const g2 = new THREE.Group();
    const frame = mesh(new THREE.BoxGeometry(ww + 0.2, wh + 0.2, 0.08), beam, { shadow: false });
    const pane = mesh(new THREE.BoxGeometry(ww, wh, 0.09), 0xffd890, {
      emissive: opts.glow ?? 0xffb85a, emissiveIntensity: 0.55, shadow: false,
    });
    pane.position.z = 0.015;
    const munH = mesh(new THREE.BoxGeometry(ww, 0.09, 0.1), beam, { shadow: false });
    munH.position.z = 0.035;
    const munV = mesh(new THREE.BoxGeometry(0.09, wh, 0.1), beam, { shadow: false });
    munV.position.z = 0.035;
    g2.add(frame, pane, munH, munV);
    g2.position.set(x, y, z);
    if (opts.rotY) g2.rotation.y = opts.rotY;
    parent.add(g2);
    return pane;
  }

  // --- Props de rua (ADR 0084): vida cotidiana nas vilas ---------------------

  /** Barril de tábuas com cintas escuras. Sólido (ADR 0113). */
  _barrel(w, x, z) {
    const b = mesh(new THREE.BoxGeometry(0.75, 0.95, 0.75), 0x7a5a34, { tex: 'planks', trx: 1, try: 1 });
    b.position.set(x, 0.48, z);
    const band = mesh(new THREE.BoxGeometry(0.82, 0.12, 0.82), 0x4a3a28, { shadow: false });
    band.position.set(x, 0.72, z);
    const band2 = mesh(new THREE.BoxGeometry(0.82, 0.12, 0.82), 0x4a3a28, { shadow: false });
    band2.position.set(x, 0.24, z);
    w.add(b, band, band2);
    w.collider(x, z, 0.45);
  }

  /** Postos de trabalho (ADR 0123): objeto de cenário que um morador usa. */
  _choppingBlock(w, x, z) {
    const block = mesh(new THREE.BoxGeometry(1.0, 0.9, 1.0), 0x6b4a33, { tex: 'log', trx: 1, try: 1 });
    block.position.set(x, 0.45, z);
    const cut = mesh(new THREE.BoxGeometry(1.02, 0.12, 1.02), 0x8a6a48, { shadow: false });
    cut.position.set(x, 0.9, z);
    const handle = mesh(new THREE.BoxGeometry(0.1, 0.1, 0.9), 0x4a3626, { shadow: false });
    handle.position.set(x, 1.05, z + 0.35); handle.rotation.x = -0.5;
    const head = mesh(new THREE.BoxGeometry(0.4, 0.28, 0.12), 0x9a9aa8, { rough: 0.4 });
    head.position.set(x, 1.3, z + 0.02);
    w.add(block, cut, handle, head);
    for (let i = 0; i < 4; i++) {
      const acha = mesh(new THREE.BoxGeometry(0.5, 0.16, 0.16), 0x7a5a3c, { shadow: false, tex: 'log' });
      acha.position.set(x + (i % 2 ? 1.0 : -1.0), 0.1 + Math.floor(i / 2) * 0.18, z - 0.6 + (i % 2) * 0.2);
      w.add(acha);
    }
    w.collider(x, z, 0.7);
    w.fp(x, z, 1.6, 1.6, 'toco de rachar');
  }

  _fishTable(w, x, z) {
    for (const px of [-0.7, 0.7]) {
      const leg = mesh(new THREE.BoxGeometry(0.14, 0.8, 0.14), 0x5a4028, { shadow: false });
      leg.position.set(x + px, 0.4, z); w.add(leg);
    }
    const top = mesh(new THREE.BoxGeometry(2.0, 0.16, 1.0), 0x7a5a3d, { tex: 'planks', trx: 2, try: 1 });
    top.position.set(x, 0.85, z); w.add(top);
    for (let i = 0; i < 3; i++) {
      const fish = mesh(new THREE.BoxGeometry(0.5, 0.12, 0.2), 0x9ab0a0, { shadow: false });
      fish.position.set(x - 0.5 + i * 0.5, 0.96, z); w.add(fish);
    }
    w.collider(x, z, 0.9);
    w.fp(x, z, 2.2, 1.2, 'mesa de peixe');
  }

  _furRack(w, x, z) {
    for (const px of [-1.0, 1.0]) {
      const post = mesh(new THREE.BoxGeometry(0.16, 1.9, 0.16), 0x6a5a48, { tex: 'log', trx: 1, try: 2 });
      post.position.set(x + px, 0.95, z); w.add(post);
    }
    const bar = mesh(new THREE.BoxGeometry(2.2, 0.14, 0.14), 0x6a5a48, { shadow: false });
    bar.position.set(x, 1.8, z); w.add(bar);
    for (const px of [-0.5, 0.5]) {
      const pelt = mesh(new THREE.BoxGeometry(0.7, 0.9, 0.08), 0xb8a488, { shadow: false, tex: 'cloth' });
      pelt.position.set(x + px, 1.25, z); w.add(pelt);
      this._flags.push({ mesh: pelt, base: 0, seed: x + px * 5 });
    }
    w.collider(x, z, 0.9);
    w.fp(x, z, 2.4, 0.9, 'bastidor de peles');
  }

  /** Trabalhadores fixos por vila, nos postos criados pelos builders (ADR 0123). */
  _workers(s) {
    const table = {
      palafitas: [[4, -1.5, 'Peixeira Vaza', ['Limpo o peixe antes que a seiva o pegue.', 'A lagoa ainda dá o que comer.']]],
      lenhadores: [[8, 2.4, 'Rachador Lasca', ['Rachar lenha aquece duas vezes.', 'A praga não gosta de fogo.']]],
      degelo: [[6, 3.4, 'Curtidora Pele', ['Curto as peles antes que o gelo as tome.', 'O frio conserva tudo, forasteiro.']]],
    };
    for (const [x, z, name, lines] of (table[s.theme] ?? [])) this._worker(s, x, z, name, lines);
  }

  /** Pilha de lenha: duas toras embaixo, uma em cima. Sólida (ADR 0113). */
  _woodpile(w, x, z, ry = 0) {
    const g = new THREE.Group();
    for (const [px, py] of [[-0.35, 0.3], [0.35, 0.3], [0, 0.9]]) {
      const log = mesh(new THREE.BoxGeometry(0.6, 0.6, 1.8), 0x6b4a33, { tex: 'log', trx: 1, try: 2 });
      log.position.set(px, py, 0);
      g.add(log);
    }
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    w.add(g);
    w.collider(x, z, 0.8);
  }

  /** Varal: dois postes, linha e panos que balançam ao vento. Postes sólidos. */
  _clothesline(w, x, z, color) {
    for (const px of [-1.2, 1.2]) {
      const post = mesh(new THREE.BoxGeometry(0.14, 1.9, 0.14), 0x4a3626, { shadow: false });
      post.position.set(x + px, 0.95, z);
      w.add(post);
      w.collider(x + px, z, 0.2);
    }
    const line = mesh(new THREE.BoxGeometry(2.4, 0.05, 0.05), 0x2e2620, { shadow: false });
    line.position.set(x, 1.8, z);
    w.add(line);
    for (const px of [-0.6, 0.35]) {
      const cloth = mesh(new THREE.BoxGeometry(0.55, 0.7, 0.06), color, { shadow: false, tex: 'cloth' });
      cloth.position.set(x + px, 1.42, z);
      w.add(cloth);
      this._flags.push({ mesh: cloth, base: 0, seed: x + px * 3 });
    }
  }

  // --- Detalhes com luz/brilho ----------------------------------------------

  /** Poste de lanterna em escala MCD (ADR 0075): mastro quadrado alto, braço e
   * caixa de lanterna pendurada que pulsa. O braço/luz apontam para (faceX,faceZ)
   * — normalmente o caminho (ADR 0116); sem alvo, aponta para +x (retrocompat). */
  _lantern(w, x, z, color, faceX = x + 1, faceZ = z) {
    // Ângulo tal que o offset local +x caia na direção do alvo (rotation.y).
    const a = Math.atan2(-(faceZ - z), (faceX - x));
    const ca = Math.cos(a), sa = Math.sin(a);
    const off = (d) => ({ x: x + ca * d, z: z - sa * d }); // local (d,0,0) sob rotation.y=a
    const pole = mesh(new THREE.BoxGeometry(0.18, 3.1, 0.18), 0x3a2c20, { shadow: false, tex: 'log', trx: 1, try: 3 });
    pole.position.set(x, 1.55, z);
    const arm = mesh(new THREE.BoxGeometry(0.72, 0.14, 0.14), 0x3a2c20, { shadow: false });
    const ap = off(0.3); arm.position.set(ap.x, 3.0, ap.z); arm.rotation.y = a;
    const cp = off(0.55);
    const cap = mesh(new THREE.BoxGeometry(0.4, 0.1, 0.4), 0x2c211a, { shadow: false });
    cap.position.set(cp.x, 2.86, cp.z);
    const lantern = mesh(new THREE.BoxGeometry(0.3, 0.38, 0.3), color, { emissive: color, emissiveIntensity: 1.0, rough: 0.4 });
    lantern.position.set(cp.x, 2.6, cp.z);
    w.add(pole, arm, cap, lantern);
    w.collider(x, z, 0.25); // mastro sólido (ADR 0113)
    this.lanternPts.push(w.world(x, z)); // p/ o validador de postes (ADR 0128)
    this._flames.push({ mesh: lantern, base: 1.0, amp: 0.35, speed: 3.1, seed: x * 7 + z });
    // Lanternas também entram no pool (ADR 0065): luz firme e curta, na caixa.
    const p = w.world(cp.x, cp.z);
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
    /** Registra a pegada (AABB local) de uma estrutura — validador ADR 0085. */
    fp: (cx, cz, wxs, dzs, label) => mgr._fp(s, cx, cz, wxs, dzs, label),
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

/** Nomes e falas de moradores passivos (ADR 0121): cor local, sem papel na trama. */
const AMBIENT_NAMES = {
  druida: ['Morador Feto', 'Moradora Sálvia', 'Menino Trevo', 'Anciã Folha'],
  palafitas: ['Pescador Limo', 'Remadora Vaza', 'Menina Concha', 'Velho Cardume'],
  lenhadores: ['Rachador Toco', 'Carvoeira Fumo', 'Aprendiz Farpa', 'Serrador Nó'],
  degelo: ['Pastor Gelo', 'Tecelã Lã', 'Batedor Nevasca', 'Velha Cardo'],
};
const AMBIENT_LINES = {
  druida: ['A Seiva anda mais forte por aqui.', 'Não passe do portão à noite, viajante.'],
  palafitas: ['A maré da seiva subiu cedo hoje.', 'Cuidado nas passarelas, ficam escorregadias.'],
  lenhadores: ['A floresta range diferente desde a praga.', 'Mantemos as brasas acesas, sempre.'],
  degelo: ['O degelo abre trilhas que o gelo escondia.', 'Chegue perto da chama, forasteiro.'],
};

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
