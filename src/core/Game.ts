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
import { BlockGround } from '../world/BlockGround.js';
import { TerrainFeatures } from '../world/TerrainFeatures.js';
import { LightPool } from './render/LightPool.js';
import { SettlementManager } from '../world/SettlementManager.js';
import { PurityManager } from '../world/PurityManager.js';
import { DayNightManager } from '../world/DayNightManager.js';
import { PoiManager } from '../world/PoiManager.js';
import { EventManager } from '../world/EventManager.js';
import { DungeonManager } from '../world/DungeonManager.js';
import { InteriorManager } from '../world/InteriorManager.js';
import { FaunaManager } from '../world/FaunaManager.js';
import { HazardManager } from '../world/HazardManager.js';
import { buildLandmarks } from '../world/landmarks.js';
import { StoryManager } from '../gameplay/story.js';
import { Hud } from '../ui/Hud.js';
import { Menus } from '../ui/Menus.js';
import { Minimap } from '../ui/Minimap.js';
import { WorldMap } from '../ui/WorldMap.js';
import { Tutorial } from '../ui/Tutorial.js';
import { TouchControls, isTouchDevice } from '../ui/TouchControls.js';
import { DamageNumbers } from '../ui/DamageNumbers.js';
import { AudioManager } from './audio/AudioManager.js';
import { BALANCE } from '../data/balance.js';
import { BIOMES } from '../data/biomes.js';
import { createPlayer } from '../entities/factories.js';
import { ABILITIES } from '../gameplay/abilities/index.js';
import { generateItem } from '../gameplay/loot.js';
import { applyEquipment, equippedItems, armorPieces } from '../gameplay/equip.js';
import { sumMod } from '../gameplay/modifiers.js';
import { comboMul } from '../gameplay/combo.js';
import { skillBonus } from '../gameplay/skills.js';
import { applyDamage } from '../gameplay/combat.js';
import { bindGameEvents } from './gameEvents.js';
import { spawnEnemyByKey as _spawnEnemyByKey, spawnBossFight as _spawnBossFight, spawnMiniBoss as _spawnMiniBoss, spawnBossByKey as _spawnBossByKey, scaleEnemy, registerEliteEffects } from '../gameplay/spawn.js';
import { partyEssence as _partyEssence, spendEssence as _spendEssence, giveItem as _giveItem, rerollShop as _rerollShop, setActiveShop as _setActiveShop } from '../gameplay/economy.js';
import { useConsumable as _useConsumable, useHotbarSlot as _useHotbarSlot } from '../gameplay/consumables.js';
import { QuestManager } from '../gameplay/quests.js';
import { SideQuestManager } from '../gameplay/sidequests.js';
import { registerBoonHooks } from '../gameplay/boons.js';
import { registerReputationHooks } from '../gameplay/reputation.js';
import { Telemetry } from '../gameplay/telemetry.js';

/**
 * Orquestra mundo, render, input, sistemas e estado de jogo. Expõe helpers
 * usados pelos sistemas (x/z, dano, Seiva, spawn, agenda). Ver docs/adr.
 */
export class Game {
  // Subsistemas (tipados como any por ora — endurecer depois; ADR 0021).
  world: any; renderer: any; camera: any; input: any; vfx: any; audio: any;
  hud: any; menus: any; minimap: any; worldMap: any; tutorial: any; dmgNumbers: any;
  worldManager: any; blockGround: any; terrain: any; lightPool: any; settlements: any; purity: any; quests: any; sideQuests: any; dayNight: any; telemetry: any; poi: any; events: any; dungeon: any; interiors: any; fauna: any; hazards: any; story: any; loop: any;
  inDungeon: boolean;
  meal: any; // bônus temporário da refeição da taverna (ADR 0094)
  // Estado.
  seed: number;
  progress: { xp: number; level: number; enchantPoints: number };
  groupCenter: { x: number; z: number };
  groupSpread: number;
  checkpoint: { x: number; z: number };
  sharedChest: any[];
  shopStock: any[] | null;
  lore: { found: Set<string> };
  boons: Record<string, string>;
  reputation: Record<string, number>;
  systems: Array<(g: any, dt: number) => void>;
  dt: number;
  paused: boolean;
  hitStop: number;
  menuMain: boolean;
  _assignedPads: Set<number>;
  _scheduled: Array<{ t: number; fn: () => void }>;
  _sanctCrystals?: any[];
  constructor(canvas) {
    this.world = new World();
    this.renderer = new Renderer(canvas);
    this.camera = new IsoCamera();
    this.input = new InputManager(this.camera);
    this.vfx = new VfxManager(this);
    this.audio = new AudioManager(this);

    this.seed = (Math.random() * 1e9) >>> 0;
    this.progress = { xp: 0, level: 1, enchantPoints: 0 };
    this.groupCenter = { x: 0, z: 0 };
    this.groupSpread = 0;
    this.checkpoint = { x: 0, z: -6 };
    this.sharedChest = []; // baú compartilhado (itens)
    this.shopStock = null; // estoque do mercador (lazy)
    this.lore = { found: new Set() }; // codex de lore descoberta
    this.boons = {}; // dons dos santuários escolhidos (ADR 0050)
    this.reputation = {}; // reputação por vila (ADR 0108)
    this._scheduled = [];
    this._assignedPads = new Set();
    this.dt = 1 / 60;
    this.paused = false;
    this.hitStop = 0;

    bindGameEvents(this);
    registerEliteEffects(this); // afixos Volátil/Sanguessuga (ADR 0045)
    registerBoonHooks(this); // dons dos santuários (ADR 0050)
    registerReputationHooks(this); // reputação por vila (ADR 0108)

    this.inDungeon = false;
    this.lightPool = new LightPool(this); // luzes pontuais com culling (ADR 0065)
    this.worldManager = new WorldManager(this);
    this.blockGround = new BlockGround(this); // chão de blocos MCD (ADR 0063)
    // Assentamentos antes dos POIs/masmorras: eles geram posições evitando as vilas.
    this.settlements = new SettlementManager(this);
    this.terrain = new TerrainFeatures(this); // falésias nas bordas de bioma (ADR 0064)
    this.poi = new PoiManager(this);
    this.events = new EventManager(this);
    this.dungeon = new DungeonManager(this);
    this.interiors = new InteriorManager(this); // interiores das casas (ADR 0094)
    this.fauna = new FaunaManager(this); // fauna ambiente por bioma (ADR 0098)
    this.hazards = new HazardManager(this); // perigos ambientais por bioma (ADR 0099)
    this.story = new StoryManager(this);
    this.purity = new PurityManager(this); // mundo cura conforme a campanha (ADR 0044)
    this.quests = new QuestManager(this); // missões locais das vilas (ADR 0047)
    this.sideQuests = new SideQuestManager(this); // side quests por triggers (ADR 0096)
    this.dayNight = new DayNightManager(this); // ciclo dia/noite + clima (ADR 0049)
    this.telemetry = new Telemetry(this); // contadores locais p/ balance (ADR 0051)
    this.hud = new Hud(this);
    this.menus = new Menus(this);
    this.minimap = new Minimap(this);
    this.worldMap = new WorldMap(this);
    this.tutorial = new Tutorial(this);
    this.dmgNumbers = new DamageNumbers(this); // números de dano flutuantes (ADR 0056)
    if (isTouchDevice()) this.input.touch = new TouchControls(this); // tablet/mobile (ADR 0053)
    this.menuMain = false;
    buildLandmarks(this);
    this.dungeon.buildEntrances();

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
      (g, dt) => g.lightPool.update(dt), // N luzes mais próximas acesas (ADR 0065)
      (g, dt) => g.dayNight.update(dt),
      (g, dt) => g.telemetry.update(dt),
      (g, dt) => g.settlements.update(dt),
      (g) => g.story.update(),
      (g) => g.purity.update(),
      (g) => g.poi.update(),
      (g, dt) => g.events.update(dt),
      (g, dt) => g.dungeon.update(dt),
      (g, dt) => g.interiors.update(dt),
      (g, dt) => g.fauna.update(dt),
      (g, dt) => g.hazards.update(dt),
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
    // Equipamento inicial: arma corpo-a-corpo (foco do jogo).
    this.equip(id, generateItem(1, 'weapon', 100 + index, null, 'melee'));
    this.equip(id, generateItem(1, 'artifact', 200 + index), 0);
    this.equip(id, { ...staticArtifact('root_spikes', 'Espinhos de Raiz') }, 1);
  }

  equip(id, item, slot = null) {
    const loadout = this.world.get(id, C.Loadout);
    const eq = this.world.get(id, C.Equipment);
    if (item.type === 'weapon') { loadout.weapon = item; eq.weapon = item; }
    else if (item.type === 'armor') {
      // Roteia pela peça anatômica (ADR 0087); tolera armadura legada sem slot.
      const s = item.slot ?? 'body';
      loadout.armor[s] = item; eq.armor[s] = item;
    }
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
    let mul = 1 + (this.progress.level - 1) * BALANCE.player.levelDamageScale;
    const eq = this.world.get(id, C.Equipment);
    const fero = eq?.weapon?.enchants?.find((e) => e.id === 'ferocidade');
    if (fero) mul += 0.25 * fero.level;
    mul *= 1 + sumMod(equippedItems(eq), 'might') / 100; // afixo Potência (ADR 0088)
    const pc = this.world.get(id, C.PlayerControlled);
    if (pc?.combo) mul *= comboMul(pc.combo); // bônus de combo (ADR 0092)
    mul *= 1 + skillBonus(this, id, 'dmg') / 100; // talentos de dano (ADR 0093)
    if (this.meal && this.meal.expire > 0) mul *= this.meal.mul; // refeição da taverna (ADR 0094)
    if (Object.values(this.boons ?? {}).includes('cacada')) mul *= 1.1; // Dom Instinto de Caça (Lobo)
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

  // Spawn/escala de inimigos vivem em gameplay/spawn.ts; aqui só delegamos
  // (mantém a API usada por sistemas/managers/testes). Ver ADR 0033.
  spawnEnemyByKey(key, x, z) { return _spawnEnemyByKey(this, key, x, z); }
  spawnBossFight(x, z) { return _spawnBossFight(this, x, z); }
  spawnMiniBoss(x, z, overrides?) { return _spawnMiniBoss(this, x, z, overrides); }
  spawnBossByKey(key, x, z) { return _spawnBossByKey(this, key, x, z); }
  _scaleEnemy(def) { return scaleEnemy(this, def); }

  /** Fast-travel ao hub (atalho do recall). */
  recallToHub() {
    return this.fastTravelTo(0, -6, 'Círculo do Carvalho');
  }

  /** Fast-travel a um ponto, bloqueado se há inimigos por perto do grupo. */
  fastTravelTo(x, z, label = 'destino') {
    const c = this.groupCenter ?? { x: 0, z: 0 };
    for (const [, tr, fac, hp] of this.world.query(C.Transform, C.Faction, C.Health)) {
      if (fac.team !== 'enemy' || hp.dead) continue;
      const dx = tr.x - c.x, dz = tr.z - c.z;
      if (dx * dx + dz * dz < 20 * 20) {
        this.emit('objective', { text: 'A floresta não abre caminho com inimigos à espreita!' });
        return false;
      }
    }
    let i = 0;
    for (const [, tr, pc, hp] of this.world.query(C.Transform, C.PlayerControlled, C.Health)) {
      tr.x = x + (i % 2 ? 1.5 : -1.5);
      tr.z = z + Math.floor(i / 2) * 1.5;
      if (!pc.downed && !hp.dead) hp.invuln = Math.max(hp.invuln, 0.5);
      i++;
    }
    this.groupCenter = { x, z };
    this.emit('objective', { text: `🍃 O vento te levou: ${label}.` });
    this.emit('fastTravel', { x, z, label });
    this.emit('vfxRing', { x, z, radius: 3, color: 0x9fe06a });
    return true;
  }

  regionLevel() {
    const b = BIOMES[this.worldManager?.currentBiome ?? 'clareira'];
    return Math.max(1, Math.round((this.progress.level + (b?.level ?? 1)) / 2));
  }

  currentBiomeName() {
    return BIOMES[this.worldManager?.currentBiome ?? 'clareira']?.name ?? '';
  }
  // Economia (essência do grupo + estoque do mercador) vive em
  // gameplay/economy.ts; aqui só delegamos. Ver ADR 0033/0016.
  partyEssence() { return _partyEssence(this); }
  spendEssence(amount) { return _spendEssence(this, amount); }
  giveItem(item) { return _giveItem(this, item); }
  rerollShop() { return _rerollShop(this); }
  setActiveShop(key) { return _setActiveShop(this, key); }
  useConsumable(id, item) { return _useConsumable(this, id, item); }
  /** Usa a poção da posição `slot` (0..8) da hotbar do jogador `pIndex`. */
  useHotbarSlot(slot, pIndex = 0) {
    for (const [id, pc] of this.world.query(C.PlayerControlled)) {
      if (pc.index === pIndex) return _useHotbarSlot(this, id, slot);
    }
    return false;
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
    // Hit-stop: desacelera a simulação por instantes após impactos fortes.
    if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.08; }
    this.dt = dt;
    this.gatherInput();
    for (const sys of this.systems) sys(this, dt);

    // Callbacks agendados.
    for (let i = this._scheduled.length - 1; i >= 0; i--) {
      const s = this._scheduled[i];
      s.t -= dt;
      if (s.t <= 0) { s.fn(); this._scheduled.splice(i, 1); }
    }

    this._cleanupDestroyed();
    this.world.flushDestroyed();
    this.input.endFrame();
  }

  /**
   * Remove e libera os meshes das entidades prestes a serem destruídas
   * (projéteis, inimigos, loot, invocações). Sem isso os Object3D ficariam
   * órfãos na cena (vazamento visual e de memória).
   */
  _cleanupDestroyed() {
    for (const id of this.world._toDestroy) {
      const r = this.world.get(id, C.Renderable);
      if (!r?.object3d) continue;
      this.renderer.remove(r.object3d);
      r.object3d.traverse((o) => {
        if (o.isMesh && !o.userData.shared) { // recursos compartilhados não são descartados
          o.geometry?.dispose?.();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
          else o.material?.dispose?.();
        }
      });
    }
  }

  render(alpha) {
    renderSyncSystem(this, alpha);
    const t = performance.now() / 1000;
    if (this._sanctCrystals) {
      for (const c of this._sanctCrystals) {
        c.rotation.y = t;
        c.position.y = 3.1 + Math.sin(t * 2) * 0.12;
      }
    }
    this.blockGround.update(); // grade de blocos segue o grupo (ADR 0063)
    this.settlements.animate(t); // lanternas/chamas das vilas pulsam
    // Masmorra não tem céu: o domo esconde (o vazio além das muralhas é o
    // background escuro do tema, não um horizonte com brilho).
    if (this.renderer.sky) this.renderer.sky.visible = !this.inDungeon;
    this.camera.follow(this.groupCenter, this.groupSpread, this.dt);
    this.renderer.updateSun(this.groupCenter); // sombras acompanham o grupo
    this.renderer.followSky?.(this.groupCenter);
    // Hora do mundo escurece a cena (suspensa na masmorra — céu não existe lá).
    if (!this.inDungeon) this.renderer.applyDayNight(this.dayNight.nightAmount(), this.dayNight.weather ? 0.8 : 1);
    this.renderer.render(this.camera.cam);
    this.hud.update();
    this.minimap.update();
    this.dmgNumbers.update(this.dt);
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
    let foto = null;
    for (const p of armorPieces(eq)) {
      const e = p.enchants?.find((x) => x.id === 'fotossintese' && x.level > 0);
      if (e && (!foto || e.level > foto.level)) foto = e;
    }
    if (!moving && foto) hp.hp = Math.min(hp.max, hp.hp + (4 + foto.level * 3) * dt);
  }
}
