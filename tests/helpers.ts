import { World } from '../src/core/ecs/World.js';
import { Game } from '../src/core/Game.js';
import { createPlayer } from '../src/entities/factories.js';

/**
 * Harness headless: monta um objeto "game" com a mesma superfície de helpers do
 * Game real (reaproveitando os métodos do prototype) mas com renderer/câmera
 * stub, para exercitar os sistemas sem WebGL/DOM. Game.ts/render/ui ficam fora
 * da métrica de cobertura (cobertos pelo e2e) — ver ADR 0031.
 */
const scene = () => ({ add() {}, remove() {} });

export function makeGame() {
  const world = new World();
  const events: any[] = [];
  const renderer: any = { add() {}, remove() {}, scene: scene(), setBiomeMood() {} };
  const camera: any = { addShake() {}, follow() {}, screenToGround: () => ({ x: 0, z: 0 }) };
  const input: any = {
    connectedPads: () => [],
    assignPad() {},
    getPlayerInput: () => ({ moveX: 0, moveZ: 0, aimX: 0, aimZ: 1, hasAim: false, attack: false, dodge: false, artifact: [false, false, false], switchForm: 0, interact: false }),
    endFrame() {},
  };

  const game: any = {
    world,
    renderer,
    camera,
    input,
    events,
    // Managers stub (testes podem sobrescrever para espionar).
    story: { onInteract() {}, objective: () => 'obj', update() {}, step: 0 },
    menus: { openShop() {}, openStash() {} },
    dungeon: { enter() {}, claimReward() {} },
    progress: { xp: 0, level: 1, enchantPoints: 0 },
    groupCenter: { x: 0, z: 0 },
    groupSpread: 0,
    checkpoint: { x: 0, z: -6 },
    dt: 1 / 60,
    hitStop: 0,
    paused: false,
    inDungeon: false,
    sharedChest: [],
    shopStock: null,
    lore: { found: new Set<string>() },
    _scheduled: [],
    _assignedPads: new Set<number>(),
  };

  game.on = (e: string, fn: any) => world.on(e, fn);
  game.emit = (e: string, p?: any) => { events.push({ e, p }); world.emit(e, p); };

  // Reaproveita os helpers reais do Game (lógica de verdade, sem o construtor).
  for (const m of [
    'x', 'z', 'dmgMul', 'gainSap', 'spendSap', 'aoeDamageAt', 'schedule',
    'abilityCooldown', 'spawnEnemyByKey', 'spawnBossFight', 'spawnMiniBoss',
    '_scaleEnemy', 'regionLevel', 'currentBiomeName', 'partyEssence',
    'spendEssence', 'giveItem', 'rerollShop', 'equip', 'setupNewPlayer',
    'fastTravelTo', 'recallToHub', '_cleanupDestroyed',
  ]) {
    game[m] = (Game.prototype as any)[m];
  }

  // Processa os callbacks agendados (game.schedule) como o loop faria.
  game.tickScheduled = (dt: number) => {
    for (let i = game._scheduled.length - 1; i >= 0; i--) {
      const s = game._scheduled[i];
      s.t -= dt;
      if (s.t <= 0) { s.fn(); game._scheduled.splice(i, 1); }
    }
  };

  return game;
}

/** Adiciona um jogador equipado (createPlayer + setupNewPlayer reais). */
export function addPlayer(game: any, index = 0, x = 0, z = 0) {
  const id = createPlayer(game.world, game.renderer, { index, x, z });
  game.setupNewPlayer(id, index);
  return id;
}
