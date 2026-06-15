import { GameLoop } from './GameLoop.js';
import { Renderer } from './render/Renderer.js';
import { IsoCamera } from './render/IsoCamera.js';
import { InputManager } from './input/InputManager.js';
import { World } from './ecs/World.js';
import { C } from './ecs/components.js';

import { playerControlSystem } from '../systems/playerControl.js';
import { aiSystem } from '../systems/ai.js';
import { movementSystem } from '../systems/movement.js';
import { projectileSystem } from '../systems/projectiles.js';
import { statusSystem } from '../systems/status.js';
import { druidSystem } from '../systems/druid.js';
import { pickupSystem } from '../systems/pickups.js';
import { coopSystem } from '../systems/coop.js';
import { spawnerSystem } from '../systems/spawner.js';
import { interactionSystem } from '../systems/interaction.js';
import { bossSystem } from '../systems/boss.js';
import { renderSyncSystem } from '../systems/render.js';
import { VfxManager } from '../systems/vfx.js';

import { WorldManager } from '../world/WorldManager.js';
import { buildLandmarks } from '../world/landmarks.js';
import { StoryManager } from '../gameplay/story.js';
import { Hud } from '../ui/Hud.js';
import { BIOMES } from '../data/biomes.js';
import { ENEMIES, BOSSES } from '../data/enemies.js';
import { createPlayer, createEnemy, createLootOrb } from '../entities/factories.js';
import { ABILITIES } from '../gameplay/abilities/index.js';
import { FORMS } from '../gameplay/forms.js';
import { generateItem, rollDrops } from '../gameplay/loot.js';
import { grantXp } from '../gameplay/progression.js';
import { applyEquipment } from '../gameplay/equip.js';
import { applyDamage } from '../gameplay/combat.js';

/**
 * Orquestra mundo, render, input, sistemas e estado de jogo. Expõe helpers
 * usados pelos sistemas (x/z, dano, Seiva, spawn, agenda). Ver docs/adr.
 */
export class Game {
  constructor(canvas) {
    this.world = new World();
    this.renderer = new Renderer(canvas);
    this.camera = new IsoCamera();
    this.input = new InputManager(this.camera);
    this.vfx = new VfxManager(this);

    this.seed = (Math.random() * 1e9) >>> 0;
    this.progress = { xp: 0, level: 1, enchantPoints: 0 };
    this.groupCenter = { x: 0, z: 0 };
    this.groupSpread = 0;
    this.checkpoint = { x: 0, z: -6 };
    this._scheduled = [];
    this._assignedPads = new Set();
    this.dt = 1 / 60;
    this.paused = false;

    this._bindEvents();

    this.worldManager = new WorldManager(this);
    this.story = new StoryManager(this);
    this.hud = new Hud(this);
    buildLandmarks(this);

    this.systems = [
      coopSystem,        // joins, queda/revive, centróide do grupo
      playerControlSystem,
      interactionSystem, // prompts e ativação de NPC/santuários
      aiSystem,
      bossSystem,        // fases e golpes de chefe/mini-chefe
      druidSystem,       // seiva, formas, cooldowns, invocações
      movementSystem,    // integra + colisão
      projectileSystem,
      statusSystem,
      pickupSystem,
      spawnerSystem,
      (g, dt) => g.worldManager.update(dt),
      (g) => g.story.update(),
      (g, dt) => g.vfx.update(dt),
      idleRegenSystem,
    ];

    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: (alpha) => this.render(alpha),
    });
  }

  start() {
    this.loop.start();
  }

  // --- Event wiring --------------------------------------------------------
  on(event, fn) { return this.world.on(event, fn); }
  emit(event, payload) { this.world.emit(event, payload); }

  _bindEvents() {
    this.on('kill', (e) => {
      // XP + essência + drops.
      const def = e.loot ?? {};
      grantXp(this, def.xp ?? ENEMIES[e.killKind]?.xp ?? 6);
      const essence = Math.max(1, Math.round(1 + Math.random() * 3));
      createLootOrb(this.world, this.renderer, { x: e.x + 0.4, z: e.z, item: { essence, rarityColor: 0x9fe06a } });
      for (const item of rollDrops(def, this.regionLevel(), Math.random)) {
        createLootOrb(this.world, this.renderer, { x: e.x - 0.5 + Math.random(), z: e.z + Math.random() - 0.5, item });
      }
    });

    this.on('itemPickup', (e) => {
      // Auto-equipa se o slot estiver vazio (qualidade de vida no protótipo).
      const loadout = this.world.get(e.id, C.Loadout);
      const eq = this.world.get(e.id, C.Equipment);
      if (e.item.type === 'weapon' && !loadout.weapon) this.equip(e.id, e.item);
      else if (e.item.type === 'armor' && !loadout.armor) this.equip(e.id, e.item);
      else if (e.item.type === 'artifact') {
        const slot = loadout.artifacts.findIndex((a) => !a);
        if (slot >= 0) this.equip(e.id, e.item, slot);
      }
    });

    this.on('formSwap', (e) => {
      // Encantamento Metamorfo: onda de dano ao trocar de forma.
      const loadout = this.world.get(e.id, C.Loadout);
      if (loadout?.armor?.enchants?.some((x) => x.id === 'metamorfo' && x.level > 0)) {
        this.aoeDamageAt(e.x, e.z, 3, 14, e.id);
        this.emit('vfxRing', { x: e.x, z: e.z, radius: 3, color: 0xb6ff8a });
      }
    });

  }

  // --- Player setup --------------------------------------------------------
  spawnInitialPlayers() {
    const id = createPlayer(this.world, this.renderer, { index: 0, x: 0, z: -4 });
    this.setupNewPlayer(id, 0);
    return id;
  }

  setupNewPlayer(id, index) {
    const loadout = this.world.get(id, C.Loadout);
    const form = this.world.get(id, C.Form);
    form.list = ['humanoid', 'wolf']; // começa com Lobo desbloqueado
    // Equipamento inicial.
    this.equip(id, generateItem(1, 'weapon', 100 + index));
    this.equip(id, generateItem(1, 'artifact', 200 + index), 0);
    this.equip(id, { ...staticArtifact('root_spikes', 'Espinhos de Raiz') }, 1);
  }

  equip(id, item, slot = null) {
    const loadout = this.world.get(id, C.Loadout);
    const eq = this.world.get(id, C.Equipment);
    if (item.type === 'weapon') { loadout.weapon = item; eq.weapon = item; }
    else if (item.type === 'armor') { loadout.armor = item; eq.armor = item; }
    else if (item.type === 'artifact') {
      const s = slot ?? loadout.artifacts.findIndex((a) => !a);
      const idx = s < 0 ? 2 : s;
      loadout.artifacts[idx] = item; eq.artifacts[idx] = item;
    }
    applyEquipment(this, id);
  }

  // --- Helpers usados pelos sistemas --------------------------------------
  x(id) { return this.world.get(id, C.Transform)?.x ?? 0; }
  z(id) { return this.world.get(id, C.Transform)?.z ?? 0; }

  dmgMul(id) {
    let mul = 1 + (this.progress.level - 1) * 0.05;
    const eq = this.world.get(id, C.Equipment);
    const fero = eq?.weapon?.enchants?.find((e) => e.id === 'ferocidade');
    if (fero) mul += 0.25 * fero.level;
    return mul;
  }

  gainSap(id, n) {
    const sap = this.world.get(id, C.Sap);
    if (sap) sap.value = Math.min(sap.max, sap.value + n);
  }
  spendSap(id, n) {
    const sap = this.world.get(id, C.Sap);
    if (!sap || sap.value < n) return false;
    sap.value -= n;
    return true;
  }

  aoeDamageAt(x, z, radius, dmg, attackerId) {
    const r2 = radius * radius;
    for (const [tid, tr, fac, hp] of this.world.query(C.Transform, C.Faction, C.Health)) {
      if (fac.team !== 'enemy' || hp.dead) continue;
      const dx = tr.x - x, dz = tr.z - z;
      if (dx * dx + dz * dz <= r2) {
        applyDamage(this, tid, dmg, { attackerId, fromX: x, fromZ: z });
      }
    }
  }

  schedule(delay, fn) { this._scheduled.push({ t: delay, fn }); }

  abilityCooldown(abilityId) { return ABILITIES[abilityId]?.cooldown ?? 0; }

  spawnEnemyByKey(key, x, z) {
    const def = ENEMIES[key] ?? BOSSES[key];
    if (!def) return;
    const scaled = this._scaleEnemy(def);
    const id = createEnemy(this.world, this.renderer, scaled, { x, z });
    this.world.get(id, C.LootTable).xp = scaled.xp;
    return id;
  }

  spawnBossFight(x, z) {
    const id = this.spawnEnemyByKey('rotlord', x, z);
    const boss = this.world.get(id, C.Boss);
    if (boss) boss.name = BOSSES.rotlord.name;
    this.emit('objective', { text: `${BOSSES.rotlord.name} ergue-se da podridão!` });
    return id;
  }

  spawnMiniBoss(x, z) {
    const def = {
      name: 'Árvore-Carniça', mesh: 'husk', behavior: 'melee', boss: true,
      hp: 420, speed: 1.6, damage: 16, radius: 1.3, scale: 1.8,
      aggroRange: 30, attackRange: 2.6, attackCooldown: 1.8, xp: 120,
      loot: { dropChance: 1 },
    };
    const scaled = this._scaleEnemy(def);
    const id = createEnemy(this.world, this.renderer, scaled, { x, z });
    this.world.get(id, C.LootTable).xp = scaled.xp;
    const boss = this.world.get(id, C.Boss);
    if (boss) { boss.name = def.name; boss.miniBoss = true; }
    return id;
  }

  _scaleEnemy(def) {
    const lvl = this.progress.level;
    const players = Math.max(1, [...this.world.query(C.PlayerControlled)].length);
    const hpMul = (1 + (lvl - 1) * 0.18) * (0.65 + players * 0.45);
    const dmgMul = 1 + (lvl - 1) * 0.08;
    return { ...def, hp: Math.round(def.hp * hpMul), damage: Math.round(def.damage * dmgMul) };
  }

  regionLevel() {
    const b = BIOMES[this.worldManager?.currentBiome ?? 'clareira'];
    return Math.max(1, Math.round((this.progress.level + (b?.level ?? 1)) / 2));
  }

  currentBiomeName() {
    return BIOMES[this.worldManager?.currentBiome ?? 'clareira']?.name ?? '';
  }
  partyEssence() {
    let e = 0;
    for (const [, inv] of this.world.query(C.Inventory)) e += inv.essence;
    return e;
  }

  // --- Loop ---------------------------------------------------------------
  gatherInput() {
    for (const [id, pc, intent] of this.world.query(C.PlayerControlled, C.Intent)) {
      const inp = this.input.getPlayerInput(pc.index);
      intent.moveX = inp.moveX;
      intent.moveZ = inp.moveZ;
      intent.aimX = inp.aimX;
      intent.aimZ = inp.aimZ;
      intent.hasAim = inp.hasAim;
      intent.aimIsWorldPoint = inp.aimIsWorldPoint;
      intent.attack = inp.attack;
      intent.dodge = inp.dodge;
      intent.artifact = inp.artifact;
      intent.switchForm = inp.switchForm;
      intent.interact = inp.interact;
    }
  }

  update(dt) {
    if (this.paused) { this.input.endFrame(); return; }
    this.dt = dt;
    this.gatherInput();
    for (const sys of this.systems) sys(this, dt);

    // Callbacks agendados.
    for (let i = this._scheduled.length - 1; i >= 0; i--) {
      const s = this._scheduled[i];
      s.t -= dt;
      if (s.t <= 0) { s.fn(); this._scheduled.splice(i, 1); }
    }

    this.world.flushDestroyed();
    this.input.endFrame();
  }

  render(alpha) {
    renderSyncSystem(this, alpha);
    if (this._sanctCrystals) {
      const t = performance.now() / 1000;
      for (const c of this._sanctCrystals) {
        c.rotation.y = t;
        c.position.y = 3.1 + Math.sin(t * 2) * 0.12;
      }
    }
    this.camera.follow(this.groupCenter, this.groupSpread, this.dt);
    this.renderer.render(this.camera.cam);
    this.hud.update();
  }
}

function staticArtifact(ability, name) {
  return { uid: -Math.floor(Math.random() * 1e6), type: 'artifact', name, ability, rarity: 'common', rarityColor: 0xd6d6d6, level: 1, enchants: [], power: 1 };
}

/** Encantamento Fotossíntese: regenera vida ao ficar parado. */
function idleRegenSystem(game, dt) {
  for (const [id, vel, hp, eq] of game.world.query(C.Velocity, C.Health, C.Equipment)) {
    if (hp.dead) continue;
    const moving = Math.hypot(vel.vx, vel.vz) > 0.5;
    const foto = eq.armor?.enchants?.find((e) => e.id === 'fotossintese' && e.level > 0);
    if (!moving && foto) hp.hp = Math.min(hp.max, hp.hp + (4 + foto.level * 3) * dt);
  }
}
