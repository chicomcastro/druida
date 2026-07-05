import * as THREE from 'three';
import { C, Transform, Collider, Velocity } from '../core/ecs/components.js';
import { buildVoxelGroup, makeVillagerSpec } from '../entities/voxelModels.js';
import { healEntity } from '../gameplay/combat.js';
import { interiorTheme, TAVERN } from '../data/interiors.js';

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
      const wall = new THREE.Mesh(new THREE.BoxGeometry(sw, 4, sd), mat);
      wall.position.set(ROOM.x + lx, 2, ROOM.z + lz);
      wall.castShadow = true;
      this.game.renderer.add(wall);
      this._wallMats.push(mat);
      const id = this.game.world.createEntity();
      this.game.world.add(id, C.Transform, Transform(ROOM.x + lx, ROOM.z + lz));
      this.game.world.add(id, C.Collider, Collider(Math.max(sw, sd) / 2, true));
    }
    // Lâmpadas de canto (emissivo recolorido por tema).
    this._lampMat = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb46a, emissiveIntensity: 1.1 });
    for (const [lx, lz] of [[-ROOM_R + 1.2, -ROOM_R + 1.2], [ROOM_R - 1.2, -ROOM_R + 1.2]]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), this._lampMat);
      lamp.position.set(ROOM.x + lx, 2.6, ROOM.z + lz);
      this.game.renderer.add(lamp);
      this.game.lightPool?.register(ROOM.x + lx, 2.6, ROOM.z + lz, 0xffb46a, 20, 0.3);
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
    this.game.emit('objective', { text: `${theme.name} — ${label ?? theme.role}` });
    this.game.emit('interiorEntered', { themeId: theme.id });
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
    this._teleport(a.returnPos.x, a.returnPos.z);
    this.game.inDungeon = false;
    this.active = null;
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
