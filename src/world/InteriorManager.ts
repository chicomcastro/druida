import * as THREE from 'three';
import { C, Transform, Collider, Velocity } from '../core/ecs/components.js';
import { buildVoxelGroup, makeVillagerSpec } from '../entities/voxelModels.js';
import { healEntity } from '../gameplay/combat.js';
import { interiorTheme, TAVERN } from '../data/interiors.js';
import { biomeAt } from './WorldManager.js';
import { BIOMES } from '../data/biomes.js';

/** Clima "interior": fundo escuro que sela a sala do mundo aberto. Névoa a
 * distância grande (a câmera ortográfica fica longe — valores curtos apagam
 * tudo, como nas masmorras ~40/90). */
const INDOOR_MOOD = {
  background: 0x2a2016, fogNear: 60, fogFar: 130,
  light: { sun: 0xffe2ba, sunIntensity: 1.5, hemi: 0x9a7e5c, hemiGround: 0x241a10, hemiIntensity: 1.0 },
};

/**
 * Interiores das casas (ADR 0094, E5). Entrar por uma porta temática
 * teletransporta o grupo para uma sala isolada (mesmo truque da masmorra —
 * arena longe do mundo aberto, `game.inDungeon` suspende overworld/spawns).
 * Dentro há um NPC responsável (loja especializada, taverna ou diálogo) e um
 * portal de saída. A sala é construída uma vez e recolorida por tema a cada
 * entrada; o NPC é criado/destruído por visita.
 */
const ROOM = { x: -1000, z: 1000 };
const ROOM_R = 8;

export class InteriorManager {
  game: any;
  active: any;
  _built: boolean;
  _floorMat: any;
  _wallMats: any[];
  _lampMat: any;
  _props: any; // móveis temáticos, reconstruídos por visita (ADR 0104)

  constructor(game) {
    this.game = game;
    this.active = null;
    this._built = false;
    this._wallMats = [];
    // Se o grupo for derrotado dentro (não deveria haver combate), sai.
    game.on('wipe', () => { if (this.active) this.exit(); });
  }

  _buildRoom() {
    if (this._built) return;
    this._built = true;
    // Materiais recoloridos por tema no enter() — cores planas (indoor, sem
    // textura) para leitura limpa e segurança headless.
    this._floorMat = new THREE.MeshStandardMaterial({ color: 0x3a2e22, roughness: 1 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_R * 2, 0.2, ROOM_R * 2), this._floorMat);
    floor.position.set(ROOM.x, 0.02, ROOM.z);
    floor.receiveShadow = true;
    this.game.renderer.add(floor);
    // Quatro paredes fechando a sala (colisores estáticos).
    const walls: [number, number, number, number][] = [
      [0, -ROOM_R, ROOM_R * 2, 0.6], [0, ROOM_R, ROOM_R * 2, 0.6],
      [-ROOM_R, 0, 0.6, ROOM_R * 2], [ROOM_R, 0, 0.6, ROOM_R * 2],
    ];
    for (const [lx, lz, sw, sd] of walls) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x4a3628, roughness: 1 });
      const wall = new THREE.Mesh(new THREE.BoxGeometry(sw, 5, sd), mat);
      wall.position.set(ROOM.x + lx, 2.5, ROOM.z + lz);
      wall.castShadow = true;
      this.game.renderer.add(wall);
      this._wallMats.push(mat);
      const id = this.game.world.createEntity();
      this.game.world.add(id, C.Transform, Transform(ROOM.x + lx, ROOM.z + lz));
      this.game.world.add(id, C.Collider, Collider(Math.max(sw, sd) / 2, true));
    }
    // Lâmpadas de canto (emissivo recolorido por tema).
    this._lampMat = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb46a, emissiveIntensity: 1.3 });
    // Lâmpadas nos QUATRO cantos (antes só 2) — sala bem iluminada (ADR 0105).
    for (const [lx, lz] of [[-ROOM_R + 1.2, -ROOM_R + 1.2], [ROOM_R - 1.2, -ROOM_R + 1.2], [-ROOM_R + 1.2, ROOM_R - 1.2], [ROOM_R - 1.2, ROOM_R - 1.2]]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), this._lampMat);
      lamp.position.set(ROOM.x + lx, 2.6, ROOM.z + lz);
      this.game.renderer.add(lamp);
      this.game.lightPool?.register(ROOM.x + lx, 2.6, ROOM.z + lz, 0xffc27a, 32, 0.25);
    }
    // Portal de saída (batente iluminado) na parede sul.
    const arch = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.6, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x241a12, emissive: 0x2a1a0a, emissiveIntensity: 0.5 }),
    );
    arch.position.set(ROOM.x, 1.3, ROOM.z + ROOM_R - 0.4);
    this.game.renderer.add(arch);
    const exit = this.game.world.createEntity();
    this.game.world.add(exit, C.Transform, Transform(ROOM.x, ROOM.z + ROOM_R - 1.4));
    this.game.world.add(exit, C.Interactable, { kind: 'house_exit', prompt: 'E — Sair', range: 3, used: false });
  }

  _teleport(x, z) {
    let i = 0;
    for (const [, tr, pc, hp] of this.game.world.query(C.Transform, C.PlayerControlled, C.Health)) {
      tr.x = x + (i % 2 ? 1.2 : -1.2);
      tr.z = z + Math.floor(i / 2) * 1.4;
      if (!pc.downed && !hp.dead) hp.invuln = Math.max(hp.invuln, 1);
      i++;
    }
    this.game.groupCenter = { x, z };
    this.game.camera?.snapTo?.({ x, z });
  }

  /** Entra num interior temático (chamado pela porta da casa). */
  enter(themeId, label?) {
    if (this.active) return;
    this._buildRoom();
    const theme = interiorTheme(themeId);
    this._floorMat.color.setHex(theme.floor);
    for (const m of this._wallMats) m.color.setHex(theme.wall);
    this._lampMat.emissive.setHex(theme.accent);
    this.game.inDungeon = true;
    this.active = {
      themeId: theme.id, theme,
      returnPos: { ...(this.game.groupCenter ?? { x: 0, z: 0 }) },
      npcId: null,
    };
    this._teleport(ROOM.x, ROOM.z - ROOM_R + 3);
    this.active.npcId = this._spawnNpc(theme);
    this.active.props = this._buildProps(theme); // móveis temáticos (ADR 0104)
    this.active.kitchenId = theme.kitchen ? this._buildKitchen() : null; // caldeirão (E19.6)
    this.game.renderer.setBiomeMood?.(INDOOR_MOOD); // sela a sala (fundo escuro)
    this.game.emit('objective', { text: `${theme.name} — ${label ?? theme.role}` });
    this.game.emit('interiorEntered', { themeId: theme.id });
  }

  /**
   * Móveis temáticos (ADR 0104): balcão/prateleiras nas lojas, mesas/barris/
   * lareira na taverna, tapete/trono/estante nos salões. Grupo próprio,
   * removido na saída. Coordenadas relativas à sala (ROOM).
   */
  _buildProps(theme) {
    const g = new THREE.Group();
    const mat = (c, emissive = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, emissive, emissiveIntensity: emissive ? 1 : 0 });
    const box = (w, h, d, x, y, z, c, em = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, em));
      m.position.set(ROOM.x + x, y, ROOM.z + z); m.castShadow = true; g.add(m); return m;
    };
    const wood = 0x5a4028, wood2 = 0x6b4a33, stone = 0x6a6a72, acc = theme.accent;
    const nz = -ROOM_R + 6; // linha do NPC
    if (theme.service === 'shop') {
      // Balcão à frente do NPC + prateleiras na parede do fundo + engradados.
      box(4.2, 0.9, 0.9, 0, 0.45, nz + 1.6, wood2);
      box(4.4, 0.15, 1.05, 0, 0.95, nz + 1.6, wood);
      for (const sx of [-2.4, 2.4]) box(0.4, 2.4, 3.5, sx, 1.2, nz + 0.4, wood); // prateleiras laterais
      for (const [sx, sy] of [[-2.4, 1.6], [-2.4, 2.2], [2.4, 1.6], [2.4, 2.2]]) box(0.5, 0.4, 0.5, sx, sy, nz + 0.4, acc, acc);
      box(0.8, 0.8, 0.8, -3.0, 0.4, nz + 3.5, wood); box(0.8, 0.8, 0.8, 3.0, 0.4, nz + 3.5, wood2); // engradados
      if (theme.id === 'weapons') { box(1.2, 1.6, 1.2, 3.2, 0.8, nz, stone); box(1.4, 0.3, 1.4, 3.2, 1.75, nz, 0x2a2a2a); } // bigorna/forja
    } else if (theme.service === 'rest') {
      // Mesas + banquetas + barris + lareira acesa no canto.
      for (const [tx, tz] of [[-3, nz + 3], [3, nz + 3.5]]) {
        box(1.8, 0.2, 1.8, tx, 1.0, tz, wood2); box(0.3, 1.0, 0.3, tx, 0.5, tz, wood);
        for (const [ox, oz] of [[-1.2, 0], [1.2, 0], [0, -1.2], [0, 1.2]]) box(0.5, 0.55, 0.5, tx + ox, 0.28, tz + oz, wood);
      }
      box(0.8, 1.0, 0.8, -3.2, 0.5, nz - 0.5, wood2); box(0.8, 1.0, 0.8, 3.4, 0.5, nz - 0.6, wood); // barris
      // Lareira no canto (brasa emissiva + luz).
      box(2.0, 0.4, 1.2, ROOM_R - 2.2 - ROOM.x, 0.2, -ROOM_R + 1.6, stone);
      box(1.0, 0.6, 0.7, ROOM_R - 2.2 - ROOM.x, 0.5, -ROOM_R + 1.6, 0xff8a3a, 0xff7a2a);
      this.game.lightPool?.register(ROOM.x + ROOM_R - 2.2, 0.8, ROOM.z - ROOM_R + 1.6, 0xff7a2a, 22, 0.6);
    } else {
      // Salão/liderança: tapete, cadeira alta atrás do NPC, estante e estandarte.
      box(3.2, 0.06, 3.6, 0, 0.12, nz + 1.6, acc);        // tapete na cor do tema
      box(1.0, 1.8, 0.5, 0, 0.9, nz - 0.9, wood2);        // encosto da cadeira
      box(1.1, 0.3, 1.0, 0, 0.55, nz - 0.7, wood);        // assento
      box(2.4, 2.2, 0.5, -ROOM_R + 1.4 - ROOM.x * 0, 1.1, nz + 0.5, wood); // estante lateral (parede)
      box(0.9, 1.8, 0.08, 0, 3.3, -ROOM_R + 0.5, acc, acc); // estandarte na parede do fundo
    }
    this.game.renderer.add(g);
    return g;
  }

  /**
   * Estação de cozinha dentro do interior (E19.6): um caldeirão fumegante num
   * canto da sala com o interativo 'kitchen'. Cozinhar deixa de ficar exposto
   * na praça — passa a acontecer na taverna e no salão comunal. A entidade é
   * destruída na saída (como o NPC e os móveis).
   */
  _buildKitchen() {
    const { game } = this;
    // Canto dos fundos à esquerda (a lareira da taverna ocupa o canto direito).
    const kx = ROOM.x - ROOM_R + 2.4, kz = ROOM.z - ROOM_R + 2.4;
    const g = this._cauldronMesh();
    g.position.set(kx, 0, kz);
    game.renderer.add(g);
    game.lightPool?.register(kx, 1.6, kz, 0xff7a2a, 20, 0.5);
    const id = game.world.createEntity();
    game.world.add(id, C.Transform, Transform(kx, kz));
    game.world.add(id, C.Collider, Collider(0.85, true));
    game.world.add(id, C.Interactable, { kind: 'kitchen', prompt: '🍲 E — Cozinhar', range: 3, used: false });
    this.active.kitchenMesh = g;
    return id;
  }

  /** Malha voxel de um caldeirão fumegante (relativa à origem do grupo). */
  _cauldronMesh() {
    const g = new THREE.Group();
    const box = (w, h, d, color, y, opts: any = {}) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...opts }));
      m.position.y = y; g.add(m); return m;
    };
    box(1.4, 0.4, 1.4, 0x6b6b73, 0.2); // base de pedra
    box(0.5, 0.7, 0.5, 0x2a2a30, 0.55); // tripé/haste
    box(1.15, 0.7, 1.15, 0x33333a, 1.05); // panela de ferro
    box(1.25, 0.16, 1.25, 0x22222a, 1.42); // borda
    box(1.0, 0.12, 1.0, 0xff8a3a, 1.46, { emissive: 0xff6a2a, emissiveIntensity: 0.8 }); // sopa
    for (let i = 0; i < 3; i++) {
      box(0.22, 0.22, 0.22, 0xffffff, 1.9 + i * 0.4, { transparent: true, opacity: 0.28 - i * 0.07 });
    }
    return g;
  }

  _spawnNpc(theme) {
    const { game } = this;
    const g = buildVoxelGroup(makeVillagerSpec({ robe: theme.robe, trim: theme.trim, elder: theme.service === 'talk' }));
    const nx = ROOM.x, nz = ROOM.z - ROOM_R + 6;
    g.position.set(nx, 0, nz);
    game.renderer.add(g);
    const id = game.world.createEntity();
    game.world.add(id, C.Transform, Transform(nx, nz, Math.PI)); // olha para a entrada (sul)
    game.world.add(id, C.Velocity, Velocity(0, 0, 1));
    game.world.add(id, C.Renderable, { object3d: g, baseScale: 1 });
    game.world.add(id, C.Collider, Collider(0.55, true));
    let inter: any;
    if (theme.service === 'shop') {
      const shopId = 'interior:' + theme.id;
      game._interiorBias = game._interiorBias ?? {};
      game._interiorBias[shopId] = theme.shopBias ?? null;
      inter = { kind: 'merchant', shopId, prompt: `E — ${theme.npc}`, range: 3, used: false, lines: theme.lines };
    } else if (theme.service === 'rest') {
      inter = { kind: 'tavern', prompt: `E — ${theme.npc}`, range: 3, used: false, lines: theme.lines };
    } else {
      inter = { kind: 'villager', prompt: `E — ${theme.npc}`, range: 3, used: false, lines: theme.lines };
    }
    // Rixa das famílias (ADR 0095): afiliação + fragmento do codex ao conversar.
    inter.family = theme.family;
    inter.loreId = theme.loreId;
    inter.npc = theme.id; // chave p/ triggers de side quest (ADR 0096)
    game.world.add(id, C.Interactable, inter);
    return id;
  }

  /** Taverna (ADR 0094): descansar cura o grupo, passa a noite e salva; a
   * refeição concede "bem alimentado" (bônus de dano temporário). */
  rest() {
    if (!this.active) return;
    for (const [id, pc, hp] of this.game.world.query(C.PlayerControlled, C.Health)) {
      if (hp.dead) continue;
      pc.downed = false;
      healEntity(this.game, id, hp.max * TAVERN.restHeal);
    }
    this.game.meal = { mul: 1 + TAVERN.mealDmg, expire: TAVERN.mealDuration };
    if (this.game.dayNight) { this.game.dayNight.time = 0.08; this.game.dayNight.weather = null; }
    this.game.emit('objective', { text: '🍲 Descansado e bem alimentado! (+dano por um tempo)' });
    this.game.emit('rested', {});
  }

  exit() {
    const a = this.active;
    if (!a) return;
    if (a.npcId != null && this.game.world.entities.has(a.npcId)) this.game.world.destroyEntity(a.npcId);
    if (a.kitchenId != null && this.game.world.entities.has(a.kitchenId)) this.game.world.destroyEntity(a.kitchenId);
    if (a.kitchenMesh) this.game.renderer.remove?.(a.kitchenMesh); // remove o caldeirão (E19.6)
    if (a.props) this.game.renderer.remove?.(a.props); // remove os móveis (ADR 0104)
    this._teleport(a.returnPos.x, a.returnPos.z);
    this.game.inDungeon = false;
    this.active = null;
    // Restaura o clima do bioma de retorno (a sala havia escurecido a cena).
    const biome = biomeAt(a.returnPos.x, a.returnPos.z);
    this.game.renderer.setBiomeMood?.(this.game.purity?.effectiveDef?.(biome) ?? BIOMES[biome]);
    this.game.emit('objective', { text: this.game.story?.objective?.() ?? '' });
  }

  update(dt) {
    // Tique do bônus de refeição (vale dentro e fora dos interiores).
    const meal = this.game.meal;
    if (meal && meal.expire > 0) {
      meal.expire -= dt;
      if (meal.expire <= 0) { this.game.meal = null; this.game.emit('objective', { text: 'O efeito da refeição passou.' }); }
    }
  }
}
