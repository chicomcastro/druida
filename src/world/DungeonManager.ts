import * as THREE from 'three';
import { C, Transform, Collider } from '../core/ecs/components.js';
import { dist, makeRng } from '../utils/math.js';
import { createEnemy, createLootOrb } from '../entities/factories.js';
import { generateItem } from '../gameplay/loot.js';
import { biomeAt } from './WorldManager.js';
import { BIOMES } from '../data/biomes.js';

/**
 * Masmorras: POIs instanciados. Entrar teletransporta o grupo para uma arena
 * isolada (longe do mundo aberto), enfrenta ondas e dá recompensa garantida
 * (Único na primeira limpeza). Enquanto dentro, o mundo aberto/spawner/eventos
 * ficam suspensos (`game.inDungeon`). Ver ADR 0022.
 */
const ARENA = { x: 0, z: 1000 };
const ARENA_R = 18;
const WAVES = 3;
const POOL = ['rotboar', 'husk', 'shaman', 'fungling', 'shadecrow'];

export class DungeonManager {
  game: any;
  entrances: any[];
  cleared: Set<string>;
  active: any;
  _arenaBuilt: boolean;
  rng: any;

  constructor(game) {
    this.game = game;
    this.cleared = new Set();
    this.active = null;
    this._arenaBuilt = false;
    this.rng = makeRng((game.seed ^ 0x1b56c4e9) >>> 0);
    this.entrances = this._generate(game.seed ?? 1337);
    // Se o grupo for derrotado dentro da masmorra, sai (evita travar com o
    // mundo aberto suspenso).
    game.on('wipe', () => { if (this.active) this._exit(); });
  }

  _generate(seed) {
    const rng = makeRng((seed ^ 0x2545f491) >>> 0);
    const out = [];
    const rings = [{ rmin: 70, rmax: 100 }, { rmin: 130, rmax: 200 }];
    let n = 0;
    for (const r of rings) {
      // Reamostra se cair dentro de um assentamento (zona segura).
      let x = 0, z = 0;
      for (let tries = 0; tries < 8; tries++) {
        const ang = rng.range(0.5, Math.PI * 2 - 0.5);
        const rad = rng.range(r.rmin, r.rmax);
        x = Math.sin(ang) * rad;
        z = Math.cos(ang) * rad;
        if (!this.game.settlements?.isSafe(x, z, 12)) break;
      }
      out.push({ id: `dgn${n++}`, x, z });
    }
    return out;
  }

  /** Cria as entradas como interativos no mundo (chamado pelo bootstrap). */
  buildEntrances() {
    for (const e of this.entrances) {
      const g = new THREE.Group();
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.35, 8, 16), new THREE.MeshStandardMaterial({ color: 0x4a2a5a, emissive: 0x6a2a7a, emissiveIntensity: 0.5 }));
      arch.position.y = 1.4; arch.rotation.x = Math.PI / 2;
      const portal = new THREE.Mesh(new THREE.CircleGeometry(1.2, 16), new THREE.MeshStandardMaterial({ color: 0x140d16, emissive: 0x2a0d3a, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
      portal.position.y = 1.4;
      g.add(arch); g.add(portal);
      g.position.set(e.x, 0, e.z);
      this.game.renderer.add(g);
      const id = this.game.world.createEntity();
      this.game.world.add(id, C.Transform, Transform(e.x, e.z));
      this.game.world.add(id, C.Collider, Collider(1.2, true));
      this.game.world.add(id, C.Interactable, { kind: 'dungeon', entranceId: e.id, prompt: 'E — Entrar na Masmorra', range: 3.5, used: false });
    }
  }

  _buildArena() {
    if (this._arenaBuilt) return;
    this._arenaBuilt = true;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R, 32), new THREE.MeshStandardMaterial({ color: 0x241825 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(ARENA.x, 0.02, ARENA.z);
    floor.receiveShadow = true;
    this.game.renderer.add(floor);
    // Muralhas (colisores estáticos) contendo a arena.
    const segments = 20;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const x = ARENA.x + Math.sin(a) * ARENA_R;
      const z = ARENA.z + Math.cos(a) * ARENA_R;
      const w = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4, 2.4), new THREE.MeshStandardMaterial({ color: 0x2a1d2e }));
      w.position.set(x, 2, z); w.castShadow = true;
      this.game.renderer.add(w);
      const id = this.game.world.createEntity();
      this.game.world.add(id, C.Transform, Transform(x, z));
      this.game.world.add(id, C.Collider, Collider(1.4, true));
    }
  }

  _teleport(x, z) {
    let i = 0;
    for (const [, tr, pc, hp] of this.game.world.query(C.Transform, C.PlayerControlled, C.Health)) {
      tr.x = x + (i % 2 ? 1.5 : -1.5);
      tr.z = z + Math.floor(i / 2) * 1.5 - 6;
      if (!pc.downed && !hp.dead) hp.invuln = Math.max(hp.invuln, 1);
      i++;
    }
    this.game.groupCenter = { x, z };
  }

  enter(entranceId) {
    if (this.active) return;
    const ent = this.entrances.find((e) => e.id === entranceId);
    if (!ent) return;
    this._buildArena();
    this.game.inDungeon = true;
    this.active = { entranceId, returnPos: { ...(this.game.groupCenter ?? { x: 0, z: 0 }) }, wave: -1, enemies: [], phase: 'fighting', timer: 0.5, rewardId: 0 };
    this._teleport(ARENA.x, ARENA.z);
    this.game.renderer.setBiomeMood({ background: 0x140d16, fogNear: 20, fogFar: 55 });
    this.game.emit('objective', { text: '🏛️ Masmorra: sobreviva às ondas!' });
  }

  _spawnWave() {
    const a = this.active;
    a.wave++;
    const count = 4 + a.wave * 2 + this.game.progress.level;
    a.enemies = [];
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const r = ARENA_R - 3;
      const key = POOL[Math.floor(this.rng() * POOL.length)];
      const id = this.game.spawnEnemyByKey(key, ARENA.x + Math.sin(ang) * r, ARENA.z + Math.cos(ang) * r);
      if (id) a.enemies.push(id);
    }
    this.game.emit('objective', { text: `Onda ${a.wave + 1}/${WAVES}` });
  }

  _aliveCount() {
    let n = 0;
    for (const id of this.active.enemies) {
      if (this.game.world.entities.has(id) && !this.game.world.get(id, C.Health)?.dead) n++;
    }
    return n;
  }

  claimReward() {
    const a = this.active;
    if (!a || a.phase !== 'reward') return;
    const lvl = this.game.regionLevel() + 2;
    const first = !this.cleared.has(a.entranceId);
    createLootOrb(this.game.world, this.game.renderer, { x: ARENA.x, z: ARENA.z - 5, item: generateItem(lvl, null, null, first ? 'unique' : null) });
    createLootOrb(this.game.world, this.game.renderer, { x: ARENA.x + 1, z: ARENA.z - 5, item: generateItem(lvl) });
    createLootOrb(this.game.world, this.game.renderer, { x: ARENA.x - 1, z: ARENA.z - 5, item: { essence: 30 + lvl * 3, rarityColor: 0x9fe06a } });
    this.cleared.add(a.entranceId);
    a.phase = 'done';
    a.timer = 2.5; // tempo para pegar o loot antes de sair
    this.game.emit('objective', { text: 'Masmorra purificada! Saindo…' });
    this.game.camera?.addShake(0.5);
  }

  _exit() {
    const a = this.active;
    // Remove inimigos restantes e o baú de recompensa.
    for (const id of a.enemies) if (this.game.world.entities.has(id)) this.game.world.destroyEntity(id);
    if (a.rewardId && this.game.world.entities.has(a.rewardId)) this.game.world.destroyEntity(a.rewardId);
    this._teleport(a.returnPos.x, a.returnPos.z);
    this.game.inDungeon = false;
    this.active = null;
    // Restaura o clima do bioma de retorno (a masmorra havia escurecido a
    // cena), respeitando o overlay de purificação (ADR 0044).
    const biome = biomeAt(a.returnPos.x, a.returnPos.z);
    this.game.worldManager.currentBiome = biome;
    this.game.renderer.setBiomeMood(this.game.purity?.effectiveDef(biome) ?? BIOMES[biome]);
    this.game.emit('objective', { text: this.game.story.objective?.() ?? '' });
  }

  _spawnRewardChest() {
    const id = this.game.world.createEntity();
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xc8a23a, emissive: 0xffd56a, emissiveIntensity: 0.4 }));
    box.position.y = 0.5;
    g.add(box);
    g.position.set(ARENA.x, 0, ARENA.z);
    this.game.renderer.add(g);
    this.game.world.add(id, C.Transform, Transform(ARENA.x, ARENA.z));
    this.game.world.add(id, C.Renderable, { object3d: g, baseScale: 1 });
    this.game.world.add(id, C.Collider, Collider(0.6, true));
    this.game.world.add(id, C.Interactable, { kind: 'dungeon_reward', prompt: 'E — Abrir o baú', range: 3, used: false });
    return id;
  }

  update(dt) {
    const a = this.active;
    if (!a) return;
    a.timer -= dt;
    if (a.phase === 'fighting') {
      if (a.wave < 0 || (this._aliveCount() === 0 && a.timer <= 0)) {
        if (a.wave + 1 < WAVES) { a.timer = 1.2; this._spawnWave(); }
        else { a.phase = 'reward'; a.rewardId = this._spawnRewardChest(); this.game.emit('objective', { text: 'Ondas vencidas! Abra o baú.' }); }
      }
    } else if (a.phase === 'done' && a.timer <= 0) {
      this._exit();
    }
  }
}
