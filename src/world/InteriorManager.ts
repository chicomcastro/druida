import * as THREE from 'three';
import { C, Transform, Collider, Velocity } from '../core/ecs/components.js';
import { buildVoxelGroup, makeVillagerSpec, VillagerLook } from '../entities/voxelModels.js';
import { healEntity } from '../gameplay/combat.js';
import { interiorTheme, TAVERN } from '../data/interiors.js';
import { biomeAt } from './WorldManager.js';
import { BIOMES } from '../data/biomes.js';

/**
 * Paletas de aldeões por vila (E31). As pessoas dentro do interior refletem o
 * assentamento: cores de túnica coerentes com a vila (verdes na Clareira, azuis
 * de água no Vau, marrons de lenha em Cinzafolha, tons frios no Degelo). Os
 * NOMES vêm do elenco real da vila (SettlementManager.list), então quem está no
 * salão são moradores de verdade, não figurantes genéricos.
 */
const PATRON_LOOKS: Record<string, VillagerLook[]> = {
  druida: [
    { robe: 0x5a8f5f, trim: 0x6b4a2f },
    { robe: 0x6fae8f, trim: 0xe0a93a, female: true },
    { robe: 0x3f7a58, trim: 0x8a6b3a, beard: true },
    { robe: 0x7a9a5a, trim: 0x5a4633, hood: false },
    { robe: 0x4f8a6a, trim: 0xcfe0a0, female: true, hood: false },
    { robe: 0x6b8f4a, trim: 0x8a6b3a },
  ],
  palafitas: [
    { robe: 0x3f6a86, trim: 0xbfe0ea, beard: true },
    { robe: 0x5a6e3a, trim: 0xd8e0a8, female: true },
    { robe: 0x3f6a5a, trim: 0x8ad0ff },
    { robe: 0x4a7e86, trim: 0xcfe0ea, hood: false },
    { robe: 0x4f7a6a, trim: 0xbfe0ea, female: true, hood: false },
    { robe: 0x3a5e74, trim: 0xaecfe0 },
  ],
  lenhadores: [
    { robe: 0x6b4a2f, trim: 0xc89a5a, beard: true },
    { robe: 0x8a4a28, trim: 0xffb46a, female: true },
    { robe: 0x8a5a3a, trim: 0x3a2d22 },
    { robe: 0x7a5a3a, trim: 0xd0a060, hood: false },
    { robe: 0x9a5a2a, trim: 0xffcf8a, female: true, hood: false },
    { robe: 0x6b4a2f, trim: 0xc89a5a },
  ],
  degelo: [
    { robe: 0x4a6e86, trim: 0xdff0ff, beard: true },
    { robe: 0x8a7a5a, trim: 0xefe6cf, female: true },
    { robe: 0x6e7e8e, trim: 0xcabf9a },
    { robe: 0x5a7080, trim: 0xdfe6ef, hood: false },
    { robe: 0x7a8494, trim: 0xefe6cf, female: true, hood: false },
    { robe: 0x4a6e86, trim: 0xdff0ff },
  ],
};

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
  _rot: number; // cursor de rodízio dos comensais (E32)

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
      // Barreira como FILEIRA de colisores pequenos ao longo da parede. Um único
      // colisor circular de raio = metade do comprimento (bug do playtest, ADR
      // 0162) tinha raio = ROOM_R e enchia a sala, prendendo o jogador num
      // quadradinho central sem conseguir andar nem sair.
      const horiz = sw > sd;
      const len = horiz ? sw : sd;
      const n = Math.max(2, Math.round(len / 1.2));
      for (let k = 0; k <= n; k++) {
        const t = k / n - 0.5;
        const cid = this.game.world.createEntity();
        this.game.world.add(cid, C.Transform, Transform(
          ROOM.x + lx + (horiz ? t * len : 0),
          ROOM.z + lz + (horiz ? 0 : t * len),
        ));
        this.game.world.add(cid, C.Collider, Collider(0.7, true));
      }
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
    const returnPos = { ...(this.game.groupCenter ?? { x: 0, z: 0 }) };
    // Vila de origem (ADR 0163): a porta guarda onde estávamos; o tema da vila
    // decide a decoração de sotaque do interior (rede no Vau, toras em Cinzafolha…).
    const village = this.game.settlements?.settlementAt?.(returnPos.x, returnPos.z)?.theme ?? 'druida';
    this.active = { themeId: theme.id, theme, returnPos, npcId: null, village, patrons: [], residents: [], seats: [] };
    this._teleport(ROOM.x, ROOM.z - ROOM_R + 3);
    this.active.npcId = this._spawnNpc(theme);
    this.active.props = this._buildProps(theme, village); // móveis temáticos + sotaque da vila (ADR 0104/0163)
    this.active.kitchenId = theme.kitchen ? this._buildKitchen() : null; // caldeirão (E19.6)
    // Cozinheiro na taverna (E21.2): um 2º NPC que vende comida pronta e ingredientes.
    this.active.cookId = theme.service === 'rest' ? this._spawnCook() : null;
    this._populateInterior(theme, village); // moradores reais vivendo o interior (E31/E32)
    this.game.renderer.setBiomeMood?.(INDOOR_MOOD); // sela a sala (fundo escuro)
    this.game.emit('objective', { text: `${theme.name} — ${label ?? theme.role}` });
    this.game.emit('interiorEntered', { themeId: theme.id });
  }

  /**
   * Disposição do interior (E31): onde ficam as MESAS e os LUGARES dos aldeões.
   * Usada tanto por `_buildProps` (constrói mesas/banquetas/comida) quanto por
   * `_populatePatrons` (senta as pessoas), pra móvel e gente ficarem alinhados.
   * Coordenadas locais à sala. Cada lugar olha ~+z (sul) → o rosto fica virado
   * pra câmera isométrica (SE), então os OLHOS aparecem (bug do playtest).
   */
  _layout(theme) {
    const nz = -ROOM_R + 6;
    if (theme.id === 'hall') {
      // Salão Comunal: banquete — várias mesas fartas e a vila reunida comendo.
      return {
        tables: [[-3.2, 0.6], [3.2, 0.6], [0, 3.8]],
        patrons: [
          { x: -4.1, z: -0.7, rot: 0.3, sit: true }, { x: -2.3, z: -0.7, rot: -0.2, sit: true, serving: true },
          { x: 4.1, z: -0.7, rot: 0.3, sit: true }, { x: 2.3, z: -0.7, rot: -0.2, sit: true },
          { x: -0.9, z: 2.5, rot: 0.15, sit: true }, { x: 0.9, z: 2.5, rot: -0.15, sit: true, serving: true },
        ],
      };
    }
    if (theme.service === 'rest') {
      // Taverna: fregueses comendo às mesas; a taverneira/cozinheiro servem.
      return {
        tables: [[-3.2, nz + 3], [3.2, nz + 3.4]],
        patrons: [
          { x: -4.1, z: nz + 1.9, rot: 0.3, sit: true }, { x: -2.3, z: nz + 1.9, rot: -0.25, sit: true },
          { x: 3.2, z: nz + 2.3, rot: 0.0, sit: true, serving: true },
        ],
      };
    }
    if (theme.service === 'talk') {
      // Liderança/moradia: dois moradores conversando; uma mesinha de canto.
      return {
        tables: [[3.0, nz + 3.4]],
        patrons: [
          { x: -2.4, z: nz + 3.2, rot: 0.45 }, { x: 3.0, z: nz + 2.2, rot: -0.2, sit: true },
        ],
      };
    }
    // Loja: dois fregueses dando uma olhada nas prateleiras/balcão.
    return {
      tables: [],
      patrons: [
        { x: 2.7, z: nz + 3.6, rot: -0.5 }, { x: -2.6, z: nz + 4.0, rot: 0.5 },
      ],
    };
  }

  /**
   * Móveis temáticos (ADR 0104 / E31): balcão e prateleiras nas lojas; mesas
   * fartas de comida e bebida na taverna; mesão de banquete no salão comunal;
   * tapete/trono nos salões. Além disso TODO interior ganha quadros na parede,
   * jarros, um tapete e um vaso — pra sala parecer habitada, não um galpão.
   * Grupo próprio, removido na saída. Coordenadas relativas à sala (ROOM).
   */
  _buildProps(theme, village = 'druida') {
    const g = new THREE.Group();
    const mat = (c, emissive = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, emissive, emissiveIntensity: emissive ? 1 : 0 });
    const box = (w, h, d, x, y, z, c, em = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, em));
      m.position.set(ROOM.x + x, y, ROOM.z + z); m.castShadow = true; g.add(m); return m;
    };
    const wood = 0x5a4028, wood2 = 0x6b4a33, stone = 0x6a6a72, acc = theme.accent;
    const nz = -ROOM_R + 6; // linha do NPC
    const layout = this._layout(theme);

    // --- Móveis reutilizáveis ------------------------------------------------
    const stool = (x, z) => { box(0.5, 0.42, 0.5, x, 0.21, z, wood); box(0.56, 0.1, 0.56, x, 0.46, z, wood2); };
    const jar = (x, z, c = 0xb98a4a) => { box(0.3, 0.44, 0.3, x, 0.22, z, c); box(0.18, 0.16, 0.18, x, 0.52, z, 0x8a6a3a); };
    const plant = (x, z) => { box(0.42, 0.4, 0.42, x, 0.2, z, wood2); box(0.5, 0.5, 0.5, x, 0.66, z, 0x4c7a34); box(0.34, 0.34, 0.34, x, 1.0, z, 0x5faa4a); };
    // Mesa farta: tampo + 4 pés + travessa de assado, pão e canecas de bebida.
    const feastTable = (tx, tz) => {
      box(2.1, 0.16, 1.3, tx, 0.92, tz, wood2);                       // tampo
      for (const [ox, oz] of [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]]) box(0.16, 0.9, 0.16, tx + ox, 0.46, tz + oz, wood);
      box(0.8, 0.1, 0.8, tx - 0.3, 1.02, tz, 0x9a7a4a);              // travessa
      box(0.5, 0.26, 0.5, tx - 0.3, 1.18, tz, 0x8a5a2a);            // assado
      box(0.36, 0.18, 0.5, tx + 0.5, 1.05, tz + 0.2, 0xc89a5a);     // pão
      for (const [ox, oz] of [[0.2, -0.35], [0.6, -0.2], [-0.55, 0.35]]) {  // canecas de bebida
        box(0.16, 0.24, 0.16, tx + ox, 1.06, tz + oz, 0x6b4a2f);
        box(0.17, 0.05, 0.17, tx + ox, 1.2, tz + oz, 0xf0e6cf);      // espuma/topo
      }
    };
    // Quadro na parede: moldura de madeira + tela colorida (cena da vila).
    const artColors = [acc, 0x4c7a34, 0x3f6a86, 0xb85a3a];
    const paintN = (x, art) => { box(1.1, 0.86, 0.08, x, 2.65, -ROOM_R + 0.32, wood2); box(0.86, 0.62, 0.05, x, 2.65, -ROOM_R + 0.4, art); };
    const paintW = (z, art) => { box(0.08, 0.86, 1.1, -ROOM_R + 0.32, 2.65, z, wood2); box(0.05, 0.62, 0.86, -ROOM_R + 0.4, 2.65, z, art); };

    // Quadros nas paredes do fundo (norte) e esquerda (oeste) — visíveis na iso.
    paintN(-3.2, artColors[0]); paintN(3.2, artColors[1]);
    paintW(-2.5, artColors[2]); paintW(2.5, artColors[3]);
    // Tapete central quente sob a cena e um vaso de planta perto da porta.
    box(4.6, 0.05, 4.4, 0, 0.05, nz + 2.6, 0x5a3a2a);
    plant(ROOM_R - 1.6, ROOM_R - 1.6);

    // Mesas + banquetas de quem senta (comida sobre as mesas).
    for (const [tx, tz] of layout.tables) feastTable(tx, tz);
    for (const p of layout.patrons) if (p.sit) stool(p.x, p.z);

    if (theme.service === 'shop') {
      // Balcão à frente do NPC + prateleiras na parede do fundo + engradados.
      box(4.2, 0.9, 0.9, 0, 0.45, nz + 1.6, wood2);
      box(4.4, 0.15, 1.05, 0, 0.95, nz + 1.6, wood);
      jar(-1.4, nz + 1.5, 0xa8c0d0); jar(1.4, nz + 1.5, 0xc0a060); // jarros no balcão
      for (const sx of [-2.4, 2.4]) box(0.4, 2.4, 3.5, sx, 1.2, nz + 0.4, wood); // prateleiras laterais
      for (const [sx, sy] of [[-2.4, 1.6], [-2.4, 2.2], [2.4, 1.6], [2.4, 2.2]]) box(0.5, 0.4, 0.5, sx, sy, nz + 0.4, acc, acc);
      box(0.8, 0.8, 0.8, -3.0, 0.4, nz + 3.5, wood); box(0.8, 0.8, 0.8, 3.0, 0.4, nz + 3.5, wood2); // engradados
      // Assinatura por TIPO de casa (E32): cada ofício marca a loja além do balcão.
      if (theme.id === 'weapons' || theme.shopBias === 'weapon') {
        box(1.2, 1.6, 1.2, 3.2, 0.8, nz, stone); box(1.4, 0.3, 1.4, 3.2, 1.75, nz, 0x2a2a2a); // bigorna/forja
        for (const wy of [0.6, 1.2, 1.8]) box(0.1, 0.1, 1.2, 3.6, wy, nz + 1.2, 0x9a9a9a); // rack de lâminas
      } else if (theme.shopBias === 'armor') {
        box(0.7, 1.6, 0.5, 3.2, 0.8, nz, 0x8a8f9a); box(0.9, 0.5, 0.6, 3.2, 1.5, nz, 0x9aa0ac); // manequim de armadura
      } else if (theme.shopKind === 'garden') {
        for (const gx of [-3.2, -2.2, 3.2]) { box(1.0, 0.4, 0.7, gx, 0.2, nz + 3.6, wood2); box(0.9, 0.3, 0.6, gx, 0.5, nz + 3.6, 0x5a8f3f); } // canteiros/mudas
        box(0.5, 0.6, 0.5, 3.0, 0.3, nz, 0xcaa060); // saco de sementes
      } else if (theme.shopKind === 'food') {
        box(1.2, 0.9, 0.8, 3.2, 0.45, nz, wood); box(1.3, 0.16, 0.9, 3.2, 0.95, nz, 0x9a7a4a); // banca de quitutes
        box(0.4, 0.3, 0.4, 3.0, 1.15, nz, 0x8a5a2a); box(0.4, 0.3, 0.4, 3.4, 1.15, nz, 0xc89a5a);
      } else { // mercado geral: fardos e ânforas variados
        box(0.6, 0.7, 0.6, 3.2, 0.35, nz, 0x7a5a3a); jar(3.0, nz + 0.2, 0xb98a4a); jar(3.5, nz + 0.1, 0xa8c0d0);
      }
    } else if (theme.service === 'rest') {
      // Barris + lareira acesa no canto (mesas fartas já vieram do layout).
      box(0.8, 1.0, 0.8, -3.2, 0.5, nz - 0.5, wood2); box(0.8, 1.0, 0.8, 3.4, 0.5, nz - 0.6, wood); // barris
      jar(-4.4, nz - 0.4, 0xb0783a); jar(4.6, nz - 0.5, 0xa8c0d0);
      box(2.0, 0.4, 1.2, ROOM_R - 2.2 - ROOM.x, 0.2, -ROOM_R + 1.6, stone);
      box(1.0, 0.6, 0.7, ROOM_R - 2.2 - ROOM.x, 0.5, -ROOM_R + 1.6, 0xff8a3a, 0xff7a2a);
      this.game.lightPool?.register(ROOM.x + ROOM_R - 2.2, 0.8, ROOM.z - ROOM_R + 1.6, 0xff7a2a, 22, 0.6);
    } else if (theme.id === 'hall') {
      // Salão comunal: caldeirão já é a cozinha; aqui só estandarte + barris de
      // bebida pros que se servem, além do mesão de banquete (layout).
      box(0.9, 2.0, 0.08, 0, 3.4, -ROOM_R + 0.5, acc, acc); // estandarte
      box(0.9, 1.1, 0.9, ROOM_R - 2.4, 0.55, nz + 0.2, wood2); // barril de bebida
      box(0.95, 0.14, 0.95, ROOM_R - 2.4, 1.18, nz + 0.2, 0xd8a24a); // tampa/concha
    } else {
      // Salão/liderança e moradia: cadeira alta atrás do NPC, estante, estandarte.
      box(1.0, 1.8, 0.5, 0, 0.9, nz - 0.9, wood2);        // encosto da cadeira
      box(1.1, 0.3, 1.0, 0, 0.55, nz - 0.7, wood);        // assento
      box(2.4, 2.2, 0.5, -ROOM_R + 1.4, 1.1, nz + 0.5, wood); // estante lateral (parede)
      for (const jy of [1.4, 1.9]) box(0.3, 0.44, 0.3, -ROOM_R + 1.4, jy, nz + 0.3, 0xb98a4a); // jarros na estante
      box(0.9, 1.8, 0.08, 0, 3.3, -ROOM_R + 0.5, acc, acc); // estandarte na parede do fundo
    }
    // Sotaque da vila (ADR 0163): um cantinho decorado com a cara do assentamento,
    // no canto dianteiro-esquerdo, perto da porta. Cada vila deixa sua marca.
    const dx = -ROOM_R + 2, dz = ROOM_R - 3;
    if (village === 'palafitas') {
      box(1.0, 1.0, 0.9, dx, 0.5, dz, 0x3f6a5a);            // barril de peixe
      box(0.9, 0.12, 0.9, dx, 1.05, dz, 0x8ad0ff, 0x2a5a7a); // peixe/água
      box(0.1, 1.6, 0.1, dx + 1.1, 0.8, dz, 0x6a8a4a);       // junco alto
      box(0.1, 1.4, 0.1, dx + 1.3, 0.7, dz + 0.2, 0x7a9a5a);
    } else if (village === 'lenhadores') {
      box(1.6, 0.5, 0.5, dx, 0.3, dz, 0x6b4a33);            // toras empilhadas
      box(1.6, 0.5, 0.5, dx, 0.8, dz, 0x5a4028);
      box(0.9, 0.7, 0.9, dx + 1.4, 0.35, dz, 0x7a5a3a);      // toco de rachar
      box(0.1, 0.7, 0.5, dx + 1.4, 0.9, dz, 0x9a9a9a);       // machado fincado
    } else if (village === 'degelo') {
      box(1.4, 0.12, 1.0, dx, 0.14, dz, 0x8a7458);          // pele estendida
      box(1.0, 0.8, 1.0, dx + 1.3, 0.4, dz, 0x9fdcff, 0x2a6a9a); // bloco de gelo
    } else {
      box(0.7, 0.7, 0.7, dx, 0.35, dz, 0x5a4028);           // cesto de ervas
      box(0.7, 0.4, 0.7, dx, 0.75, dz, 0x6cba5a);           // maço de ervas verde
      box(0.14, 1.1, 0.14, dx + 1.1, 0.55, dz, 0x6b4a33);   // muda em vaso
      box(0.5, 0.5, 0.5, dx + 1.1, 1.15, dz, 0x4c7a34);
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
    // Vira o rosto pra câmera isométrica (SE): o modelo tem os olhos em +z, então
    // rot ~+z/+x deixa o rosto (e os olhos) visíveis. O Math.PI antigo virava de
    // costas — daí a impressão de "NPC sem olhos" no playtest (E31).
    game.world.add(id, C.Transform, Transform(nx, nz, 0.35));
    game.world.add(id, C.Velocity, Velocity(0, 0, 1));
    game.world.add(id, C.Renderable, { object3d: g, baseScale: 1 });
    game.world.add(id, C.Collider, Collider(0.55, true));
    let inter: any;
    if (theme.service === 'shop') {
      const shopId = 'interior:' + theme.id;
      game._interiorBias = game._interiorBias ?? {};
      game._interiorBias[shopId] = theme.shopBias ?? null;
      game._interiorKind = game._interiorKind ?? {};
      game._interiorKind[shopId] = theme.shopKind ?? null; // categoria de estoque (E21.2/E21.3)
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

  /**
   * Cozinheiro da taverna (E21.2): vive na taverna e vende comida pronta e
   * ingredientes (categoria de loja 'food'). Fica ao lado da taverneira, à
   * direita da sala; destruído na saída.
   */
  _spawnCook() {
    const { game } = this;
    const g = buildVoxelGroup(makeVillagerSpec({ robe: 0xb85a3a, trim: 0xe8d8b0 }));
    const nx = ROOM.x + 3.4, nz = ROOM.z - ROOM_R + 6;
    g.position.set(nx, 0, nz);
    game.renderer.add(g);
    const id = game.world.createEntity();
    game.world.add(id, C.Transform, Transform(nx, nz, 0.35)); // rosto pra câmera (E31)
    game.world.add(id, C.Velocity, Velocity(0, 0, 1));
    game.world.add(id, C.Renderable, { object3d: g, baseScale: 1 });
    game.world.add(id, C.Collider, Collider(0.55, true));
    const shopId = 'interior:cook';
    game._interiorKind = game._interiorKind ?? {};
    game._interiorKind[shopId] = 'food';
    game._interiorBias = game._interiorBias ?? {};
    game._interiorBias[shopId] = null;
    game.world.add(id, C.Interactable, {
      kind: 'merchant', shopId, prompt: '🍲 E — Cozinheiro', range: 3, used: false,
      lines: ['Caldo quente e um farnel pra estrada? Tenho do bom.'],
    });
    return id;
  }

  /**
   * Popula o interior com os MORADORES REAIS da vila (E32). Cada assento do
   * `_layout` recebe um aldeão de verdade — a mesma entidade que perambula lá
   * fora, recolhida via `settlements.checkoutResident` (some da multidão externa,
   * nunca em dois lugares). A escolha respeita a rotina: no salão à noite entra
   * quem tem objetivo `hall`; no posto de dia, quem trabalha; etc. Se não há
   * SettlementManager (testes), cai em figurantes efêmeros (`_spawnPatron`).
   */
  _populateInterior(theme, village) {
    const seats = this._layout(theme).patrons.map((p) => ({ ...p, occupant: null, state: 'seated', _to: null, _refill: 0 }));
    this.active.seats = seats;
    const hasSM = !!this.game.settlements?.residentPool;
    for (const seat of seats) {
      const rec = hasSM ? this._nextResident(theme, village) : null;
      if (rec) this._occupyResident(seat, rec, true);
      else if (!hasSM) this._occupyPatron(seat, village, true); // fallback sem vila (testes)
      // hasSM mas pool esgotado → assento vazio (todo mundo dentro é real)
    }
    this.active._turn = 9 + seats.length; // primeiro rodízio
  }

  /** Objetivos de rotina preferidos por tipo de casa (quem "estaria" ali). */
  _prefGoals(theme) {
    if (theme.id === 'hall') return ['hall', 'roam', 'work'];
    if (theme.service === 'rest') return ['roam', 'hall', 'work'];
    if (theme.service === 'shop') return ['work', 'roam', 'hall'];
    return ['roam', 'home', 'hall']; // liderança / moradia
  }

  /** Próximo morador livre da vila, priorizando quem a rotina põe neste lugar. */
  _nextResident(theme, village) {
    const pool = this.game.settlements?.residentPool?.(village) ?? [];
    if (!pool.length) return null;
    const pref = this._prefGoals(theme);
    const rank = (g) => { const i = pref.indexOf(g); return i < 0 ? 99 : i; };
    pool.sort((a, b) => rank(a.goal) - rank(b.goal));
    return pool[0].rec;
  }

  _seatWorld(seat) { return { x: ROOM.x + seat.x, z: ROOM.z + seat.z }; }
  _door() { return { x: ROOM.x, z: ROOM.z + ROOM_R - 1.4 }; }
  _seatGesture(seat, id) { return seat.serving ? 'serve' : (id % 2 ? 'drink' : 'eat'); }

  /** Aplica a pose sentada (altura + gesto de comer/beber/servir + rosto à câmera). */
  _applySeatPose(seat, id) {
    const w = this._seatWorld(seat);
    const tr = this.game.world.get(id, C.Transform);
    const vel = this.game.world.get(id, C.Velocity);
    const r = this.game.world.get(id, C.Renderable);
    if (tr) { tr.x = w.x; tr.z = w.z; tr.rot = seat.rot ?? 0.35; }
    if (vel) { vel.vx = 0; vel.vz = 0; }
    if (r) { r.yOffset = seat.sit ? -0.34 : 0; r.idleGesture = this._seatGesture(seat, id); }
  }

  /** Recolhe um morador real ao assento (sentado agora, ou chegando pela porta). */
  _occupyResident(seat, rec, seated) {
    const w = seated ? this._seatWorld(seat) : this._door();
    if (!this.game.settlements.checkoutResident(rec, w.x, w.z, seated ? (seat.rot ?? 0.35) : 0, seated && !!seat.sit)) return;
    seat.occupant = { kind: 'resident', rec, id: rec.id };
    this.active.residents.push(rec);
    if (seated) this._applySeatPose(seat, rec.id);
    else { seat._to = this._seatWorld(seat); seat.state = 'arriving'; }
  }

  /** Figurante efêmero (fallback quando não há vila): mesmo visual/pose. */
  _occupyPatron(seat, village, seated) {
    const looks = PATRON_LOOKS[village] ?? PATRON_LOOKS.druida;
    const i = this.active.patrons.length;
    const look = looks[i % looks.length];
    const g = buildVoxelGroup(makeVillagerSpec({ ...look, elder: !!look.elder }));
    const w = seated ? this._seatWorld(seat) : this._door();
    g.position.set(w.x, 0, w.z);
    this.game.renderer.add(g);
    const id = this.game.world.createEntity();
    this.game.world.add(id, C.Transform, Transform(w.x, w.z, seated ? (seat.rot ?? 0.35) : 0));
    this.game.world.add(id, C.Velocity, Velocity(0, 0, 1));
    this.game.world.add(id, C.Renderable, { object3d: g, baseScale: 1 });
    this.game.world.add(id, C.Collider, Collider(0.45, true));
    const line = seat.serving ? 'Serve-te, viajante — tem fartura hoje.' : 'Bom caldo, esse. Senta que sobra.';
    this.game.world.add(id, C.Interactable, { kind: 'villager', prompt: 'E — Morador', range: 2.2, used: false, lines: [line] });
    seat.occupant = { kind: 'patron', id };
    this.active.patrons.push(id);
    if (seated) this._applySeatPose(seat, id);
    else { seat._to = this._seatWorld(seat); seat.state = 'arriving'; }
  }

  /**
   * Tique de vida do interior (E32): move quem está chegando/saindo (deixa o
   * `movementSystem` integrar a velocidade), repõe assentos vazios e, de tempos
   * em tempos, manda um comensal embora (rodízio: gente vai e vem, como pedido).
   */
  _interiorTick(dt) {
    const a = this.active;
    if (!a?.seats) return;
    for (const seat of a.seats) {
      if (seat.state === 'arriving' || seat.state === 'leaving') this._stepMove(seat, dt);
      else if (seat.state === 'empty') { seat._refill -= dt; if (seat._refill <= 0) this._fillSeat(seat); }
    }
    a._turn -= dt;
    if (a._turn <= 0) {
      a._turn = 12 + (a.seats.length % 5);
      const busy = a.seats.some((s) => s.state !== 'seated');
      const occ = a.seats.filter((s) => s.occupant && s.state === 'seated');
      if (!busy && occ.length > 1) this._leaveSeat(occ[(this._rot = (this._rot ?? 0) + 1) % occ.length]);
    }
  }

  /** Faz o ocupante se levantar e caminhar até a porta (vai embora). */
  _leaveSeat(seat) {
    seat.state = 'leaving';
    seat._to = this._door();
    const r = this.game.world.get(seat.occupant.id, C.Renderable);
    if (r) { r.yOffset = 0; r.idleGesture = null; }
  }

  /** Chama um novo morador (ou figurante) pra ocupar um assento vago. */
  _fillSeat(seat) {
    const rec = this.game.settlements?.residentPool ? this._nextResident(this.active.theme, this.active.village) : null;
    if (rec) this._occupyResident(seat, rec, false);
    else if (!this.game.settlements?.residentPool) this._occupyPatron(seat, this.active.village, false);
    else { seat.state = 'empty'; seat._refill = 4; } // vila esgotada: tenta de novo depois
  }

  /** Passo de caminhada (velocidade; o movementSystem integra e colide). */
  _stepMove(seat, dt) {
    const occ = seat.occupant;
    if (!occ) { seat.state = 'empty'; seat._refill = 2; return; }
    const tr = this.game.world.get(occ.id, C.Transform);
    const vel = this.game.world.get(occ.id, C.Velocity);
    const r = this.game.world.get(occ.id, C.Renderable);
    if (!tr) { seat.occupant = null; seat.state = 'empty'; seat._refill = 2; return; }
    const dx = seat._to.x - tr.x, dz = seat._to.z - tr.z, d = Math.hypot(dx, dz);
    if (d < 0.35) {
      if (vel) { vel.vx = 0; vel.vz = 0; }
      if (seat.state === 'leaving') {
        this._despawnOccupant(occ);
        seat.occupant = null; seat.state = 'empty'; seat._refill = 1.5 + (occ.id % 3);
      } else { // arriving
        this._applySeatPose(seat, occ.id); seat.state = 'seated';
      }
      return;
    }
    if (vel) { vel.vx = (dx / d) * 1.6; vel.vz = (dz / d) * 1.6; }
    tr.rot = Math.atan2(dx, dz);
    if (r) { r.idleGesture = null; if (r.yOffset) r.yOffset = 0; } // de pé enquanto anda
  }

  /** Tira o ocupante de cena: morador real volta pra vila; figurante é destruído. */
  _despawnOccupant(occ) {
    if (occ.kind === 'resident') {
      this.game.settlements?.checkinResident?.(occ.rec);
      const i = this.active.residents.indexOf(occ.rec);
      if (i >= 0) this.active.residents.splice(i, 1);
    } else {
      if (this.game.world.entities.has(occ.id)) this.game.world.destroyEntity(occ.id);
      const i = this.active.patrons.indexOf(occ.id);
      if (i >= 0) this.active.patrons.splice(i, 1);
    }
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
    if (a.cookId != null && this.game.world.entities.has(a.cookId)) this.game.world.destroyEntity(a.cookId); // cozinheiro (E21.2)
    for (const pid of a.patrons ?? []) { // figurantes efêmeros (E31/E32)
      if (this.game.world.entities.has(pid)) this.game.world.destroyEntity(pid);
    }
    for (const rec of a.residents ?? []) this.game.settlements?.checkinResident?.(rec); // moradores reais voltam à vila (E32)
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
    if (this.active) this._interiorTick(dt); // vida do interior: rodízio + caminhadas (E32)
  }
}
