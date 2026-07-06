import { describe, it, expect } from 'vitest';
import { World } from '../src/core/ecs/World.js';
import { C, Transform, Health, Faction, Collider, StatusEffects, Factions } from '../src/core/ecs/components.js';
import { applyDamage, meleeArc, applyStatus } from '../src/gameplay/combat.js';
import { generateItem, RARITIES } from '../src/gameplay/loot.js';
import { grantXp, xpForLevel } from '../src/gameplay/progression.js';
import { makeRng, weightedPick } from '../src/utils/math.js';
import { StoryManager } from '../src/gameplay/story.js';
import { Sap } from '../src/core/ecs/components.js';
import { applyEquipment } from '../src/gameplay/equip.js';
import { serialize, apply, setupAutosave } from '../src/gameplay/save.js';
import { bindGameEvents } from '../src/core/gameEvents.js';
import { partyEssence, spendEssence, giveItem, rerollShop, sellIngredient, INGREDIENT_SELL } from '../src/gameplay/economy.js';
import { addIngredient, ingredientCount } from '../src/gameplay/ingredients.js';
import * as THREE from 'three';
import { buildMesh } from '../src/entities/meshes.js';
import { MODELS, modelUrl } from '../src/entities/modelRegistry.js';
import { _setModelForTest, _resetModels } from '../src/entities/modelLoader.js';
import { buildVoxelModel, MODEL_SPECS, SHOWCASE_GROUPS } from '../src/entities/voxelModels.js';
import { animateBody } from '../src/systems/animation.js';
import { SpatialHash } from '../src/utils/SpatialHash.js';
import { PoiManager } from '../src/world/PoiManager.js';
import { EventManager } from '../src/world/EventManager.js';
import { DungeonManager } from '../src/world/DungeonManager.js';
import { keyLabel, loadBindings, DEFAULT_BINDINGS } from '../src/core/input/bindings.js';
import { buildOrb } from '../src/entities/meshes.js';

function stubGame(): any {
  const world = new World();
  const events = [];
  return { world, events, emit: (e, p) => events.push({ e, p }) };
}

function spawnEnemy(world, x, z, hp = 30) {
  const id = world.createEntity();
  world.add(id, C.Transform, Transform(x, z));
  world.add(id, C.Health, Health(hp));
  world.add(id, C.Faction, Faction(Factions.ENEMY));
  world.add(id, C.Collider, Collider(0.5));
  world.add(id, C.StatusEffects, StatusEffects());
  world.add(id, C.Tint, { flash: 0 });
  world.add(id, C.LootTable, { xp: 6, dropChance: 0 });
  return id;
}

describe('ECS World', () => {
  it('cria, consulta e destrói entidades', () => {
    const w = new World();
    const a = w.createEntity();
    w.add(a, C.Transform, Transform(1, 2));
    w.add(a, C.Health, Health(10));
    expect([...w.query(C.Transform, C.Health)].length).toBe(1);
    w.destroyEntity(a);
    w.flushDestroyed();
    expect([...w.query(C.Transform)].length).toBe(0);
  });

  it('event bus entrega e desinscreve', () => {
    const w = new World();
    let n = 0;
    const off = w.on('x', () => n++);
    w.emit('x'); w.emit('x');
    off();
    w.emit('x');
    expect(n).toBe(2);
  });
});

describe('Combate', () => {
  it('dano reduz vida e mata, emitindo kill', () => {
    const g = stubGame();
    const e = spawnEnemy(g.world, 0, 0, 20);
    applyDamage(g, e, 5);
    expect(g.world.get(e, C.Health).hp).toBe(15);
    applyDamage(g, e, 100);
    expect(g.world.get(e, C.Health).dead).toBe(true);
    expect(g.events.some((ev) => ev.e === 'kill')).toBe(true);
  });

  it('invulnerabilidade bloqueia dano', () => {
    const g = stubGame();
    const e = spawnEnemy(g.world, 0, 0, 20);
    g.world.get(e, C.Health).invuln = 1;
    applyDamage(g, e, 5);
    expect(g.world.get(e, C.Health).hp).toBe(20);
    applyDamage(g, e, 5, { ignoreInvuln: true });
    expect(g.world.get(e, C.Health).hp).toBe(15);
  });

  it('meleeArc acerta apenas alvos no arco frontal', () => {
    const g = stubGame();
    const attacker = g.world.createEntity();
    g.world.add(attacker, C.Transform, Transform(0, 0, 0));
    const front = spawnEnemy(g.world, 0, 2); // à frente (+z)
    const back = spawnEnemy(g.world, 0, -2); // atrás
    const hits = meleeArc(g, attacker, { angle: 0, range: 2.5, arc: 0.9, damage: 10, team: Factions.PLAYER });
    expect(hits).toBe(1);
    expect(g.world.get(front, C.Health).hp).toBe(20);
    expect(g.world.get(back, C.Health).hp).toBe(30);
  });

  it('meleeArc emite meleeSwing com a cor do golpe (feedback elemental)', () => {
    const g = stubGame();
    const attacker = g.world.createEntity();
    g.world.add(attacker, C.Transform, Transform(0, 0, 0));
    meleeArc(g, attacker, { angle: 0, range: 2, arc: 1, damage: 5, team: Factions.PLAYER, color: 0xff7a3a });
    const ev = g.events.find((e) => e.e === 'meleeSwing');
    expect(ev).toBeTruthy();
    expect(ev.p.color).toBe(0xff7a3a);
  });

  it('status são acumulados pelo maior valor', () => {
    const g = stubGame();
    const e = spawnEnemy(g.world, 0, 0);
    applyStatus(g.world, e, { burn: 2 });
    applyStatus(g.world, e, { burn: 5 });
    applyStatus(g.world, e, { burn: 3 });
    expect(g.world.get(e, C.StatusEffects).burn).toBe(5);
  });
});

describe('Loot', () => {
  it('gera item válido com slots de encantamento por raridade', () => {
    for (let i = 0; i < 50; i++) {
      const it = generateItem(5);
      expect(['weapon', 'armor', 'artifact']).toContain(it.type);
      expect(RARITIES[it.rarity]).toBeTruthy();
      expect(it.enchants.length).toBeLessThanOrEqual(RARITIES[it.rarity].slots);
    }
  });

  it('armas têm estilo; forceStyle define melee/ranged (melee inclui alcance/arco)', () => {
    const melee: any = generateItem(3, 'weapon', 1, null, 'melee');
    expect(melee.style).toBe('melee');
    expect(melee.range).toBeGreaterThan(0);
    expect(melee.arc).toBeGreaterThan(0);
    const ranged: any = generateItem(3, 'weapon', 1, null, 'ranged');
    expect(ranged.style).toBe('ranged');
    expect(ranged.range).toBeUndefined();
  });

  it('melee é o padrão: a maioria das armas sorteadas é corpo-a-corpo', () => {
    let meleeCount = 0;
    for (let i = 0; i < 200; i++) {
      const w: any = generateItem(3, 'weapon', i + 1);
      if (w.style === 'melee') meleeCount++;
    }
    expect(meleeCount).toBeGreaterThan(120); // bem acima de 50% (chance ranged ~20%)
  });
});

describe('Progressão', () => {
  it('xpForLevel usa a curva de balanceamento central', () => {
    expect(xpForLevel(1)).toBe(38);
    expect(xpForLevel(4)).toBe(Math.round(38 * Math.pow(4, 1.5)));
  });

  it('XP suficiente sobe de nível e concede pontos de encanto', () => {
    const g = stubGame();
    g.progress = { xp: 0, level: 1, enchantPoints: 0 };
    grantXp(g, xpForLevel(1) + xpForLevel(2));
    expect(g.progress.level).toBe(3);
    expect(g.progress.enchantPoints).toBe(2);
  });
});

describe('Campanha (StoryManager)', () => {
  function storyGame() {
    const world = new World();
    const events = [];
    const game: any = {
      world,
      events,
      groupCenter: { x: 0, z: 0 },
      on: (e, fn) => world.on(e, fn),
      emit: (e, p) => { events.push({ e, p }); world.emit(e, p); },
      spawnMiniBoss: () => {},
      spawnBossFight: () => {},
    };
    const pid = world.createEntity();
    world.add(pid, C.Form, { current: 'humanoid', list: ['humanoid'] });
    return { game, world, pid, events };
  }

  it('avança do diálogo ao confronto final e desbloqueia formas', () => {
    const { game, world, pid, events } = storyGame();
    const story = new StoryManager(game);
    expect(story.current().id).toBe('talk');

    story.onInteract({ kind: 'npc' }, 0);
    expect(story.current().id).toBe('purify_clearing');

    for (let i = 0; i < 8; i++) game.emit('kill', { id: 99, x: 0, z: 0 });
    expect(story.current().id).toBe('find_wolf');

    story.onInteract({ kind: 'sanctuary', form: 'wolf' }, 0);
    expect(world.get(pid, C.Form).list).toContain('wolf');
    expect(story.current().id).toBe('find_bear');

    story.onInteract({ kind: 'sanctuary', form: 'bear' }, 0);
    expect(world.get(pid, C.Form).list).toContain('bear');
    expect(story.current().id).toBe('slay_miniboss');

    game.emit('kill', { id: 50, x: 0, z: 0, bossName: 'Árvore-Carniça' });
    expect(story.current().id).toBe('find_raven');

    story.onInteract({ kind: 'sanctuary', form: 'raven' }, 0);
    story.onInteract({ kind: 'sanctuary', form: 'frog' }, 0);
    expect(story.current().id).toBe('confront');

    game.emit('kill', { id: 1, x: 0, z: 0, bossName: 'O Apodrecedor' });
    expect(story.current().id).toBe('victory');
    expect(events.some((ev) => ev.e === 'victory')).toBe(true);
  });

  it('santuário fora de ordem não desbloqueia', () => {
    const { game, world, pid } = storyGame();
    const story = new StoryManager(game);
    story.onInteract({ kind: 'npc' }, 0); // -> purify_clearing
    story.onInteract({ kind: 'sanctuary', form: 'frog' }, 0); // ainda não é a hora
    expect(world.get(pid, C.Form).list).not.toContain('frog');
    expect(story.current().id).toBe('purify_clearing');
  });
});

describe('Save/Load', () => {
  function saveGame() {
    const world = new World();
    const game: any = {
      world,
      seed: 7,
      groupCenter: { x: 42, z: -18 },
      checkpoint: { x: 0, z: -6 },
      progress: { xp: 10, level: 5, enchantPoints: 0 },
      story: { step: 3, kills: 2, _spawned: { miniboss: true } },
      worldManager: { explored: new Set(['0,0', '1,-5']) },
      sharedChest: [{ type: 'armor', name: 'Manto Guardado', rarity: 'rare', armor: 0.1, enchants: [] }],
      lore: { found: new Set(['l1', 'l3']) },
      equip(id, item, slot = null) {
        const lo = world.get(id, C.Loadout);
        const eq = world.get(id, C.Equipment);
        if (item.type === 'weapon') { lo.weapon = item; eq.weapon = item; }
        else if (item.type === 'armor') { lo.armor = item; eq.armor = item; }
        else { const s = slot ?? 0; lo.artifacts[s] = item; eq.artifacts[s] = item; }
        applyEquipment(game, id);
      },
    };
    const pid = world.createEntity();
    world.add(pid, C.PlayerControlled, { index: 0, color: 0xffe08a });
    world.add(pid, C.Transform, Transform(0, -4));
    world.add(pid, C.Health, Health(120));
    world.add(pid, C.Sap, Sap(100));
    world.add(pid, C.Form, { current: 'humanoid', list: ['humanoid', 'wolf', 'bear'] });
    world.add(pid, C.Loadout, { weapon: null, armor: null, artifacts: [null, null, null], enchantPoints: 4 });
    world.add(pid, C.Equipment, { weapon: null, armor: null, artifacts: [null, null, null] });
    world.add(pid, C.Inventory, { items: [], essence: 25 });
    return { game, world, pid };
  }

  it('serializa e restaura progresso, história e jogador', () => {
    const { game, world, pid } = saveGame();
    game.equip(pid, { type: 'weapon', name: 'Cajado Teste', element: 'fire', damage: 14, rarity: 'rare', enchants: [] });
    game.reputation = { vau_palafitas: 3 }; // reputação por vila (ADR 0108)
    const data = JSON.parse(JSON.stringify(serialize(game)));

    // "Novo" jogo, depois aplica o save.
    const fresh = saveGame();
    fresh.game.progress = { xp: 0, level: 1, enchantPoints: 0 };
    fresh.game.story = { step: 0, kills: 0, _spawned: {} };
    fresh.game.groupCenter = { x: 0, z: 0 };
    fresh.game.checkpoint = { x: 0, z: 0 };
    fresh.game.worldManager.explored = new Set();
    fresh.game.sharedChest = [];
    fresh.game.lore = { found: new Set() };
    const ok = apply(fresh.game, data);

    expect(ok).toBe(true);
    expect(fresh.game.progress.level).toBe(5);
    expect(fresh.game.story.step).toBe(3);
    expect(fresh.world.get(fresh.pid, C.Form).list).toContain('bear');
    expect(fresh.world.get(fresh.pid, C.Inventory).essence).toBe(25);
    expect(fresh.game.sharedChest).toHaveLength(1);
    expect(fresh.game.sharedChest[0].name).toBe('Manto Guardado');
    expect(fresh.game.lore.found.has('l3')).toBe(true);
    expect(fresh.game.reputation.vau_palafitas).toBe(3);
    expect(fresh.world.get(fresh.pid, C.Loadout).weapon.name).toBe('Cajado Teste');
    expect(fresh.game.worldManager.explored.has('1,-5')).toBe(true);
  });

  it('persiste e restaura a posição do grupo (reaparece onde salvou)', () => {
    const { game } = saveGame();
    const data = JSON.parse(JSON.stringify(serialize(game)));
    expect(data.groupCenter).toEqual({ x: 42, z: -18 });

    const fresh = saveGame();
    fresh.game.groupCenter = { x: 0, z: 0 };
    apply(fresh.game, data);

    expect(fresh.game.groupCenter).toEqual({ x: 42, z: -18 });
    // P1 (index 0) é reposicionado ao redor do centro salvo.
    const tr = fresh.world.get(fresh.pid, C.Transform);
    expect(tr.x).toBe(42 - 1.5);
    expect(tr.z).toBe(-18);
  });
});

describe('Autosave', () => {
  function fakeGame() {
    const handlers: Record<string, Array<(p: any) => void>> = {};
    let saves = 0;
    return {
      handlers, get saves() { return saves; },
      menuMain: false,
      on(ev: string, fn: (p: any) => void) { (handlers[ev] ??= []).push(fn); },
      emit(ev: string, p: any) { (handlers[ev] ?? []).forEach((fn) => fn(p)); if (ev === 'saved') saves++; },
      // serialize() lê estes campos; valores mínimos válidos.
      world: new World(), seed: 1, progress: {}, story: { step: 0, kills: 0, _spawned: {} },
      groupCenter: { x: 0, z: 0 }, checkpoint: { x: 0, z: 0 },
    } as any;
  }

  it('agenda e faz flush ao disparar um marco do jogo', async () => {
    const game = fakeGame();
    setupAutosave(game);
    // Registra listeners para todos os eventos de autosave.
    expect(game.handlers.levelUp?.length).toBe(1);
    expect(game.handlers.campPurified?.length).toBe(1);

    game.emit('levelUp', { level: 2 });
    expect(game.saves).toBe(0); // debounced
    await new Promise((r) => setTimeout(r, 1600));
    expect(game.saves).toBe(1); // flush emitiu 'saved'
  });

  it('não agenda enquanto está no menu principal', async () => {
    const game = fakeGame();
    game.menuMain = true;
    setupAutosave(game);
    game.emit('storyStep', { step: 1 });
    await new Promise((r) => setTimeout(r, 1600));
    expect(game.saves).toBe(0);
  });
});

describe('Game events (bindGameEvents)', () => {
  function makeGame() {
    const world = new World();
    const handlers: Record<string, Array<(p: any) => void>> = {};
    const game: any = {
      world,
      renderer: { add() {}, remove() {} },
      camera: { shake: 0, addShake(n: number) { this.shake += n; } },
      hitStop: 0,
      progress: { xp: 0, level: 1, enchantPoints: 0 },
      regionLevel: () => 1,
      aoe: [] as any[],
      aoeDamageAt(x: number, z: number, r: number, d: number, id: number) { this.aoe.push({ x, z, r, d, id }); },
      equip(id: number, item: any, slot: number | null = null) {
        const lo = world.get(id, C.Loadout);
        if (item.type === 'weapon') lo.weapon = item;
        else if (item.type === 'armor') lo.armor = item;
        else { const s = slot ?? lo.artifacts.findIndex((a: any) => !a); lo.artifacts[s < 0 ? 2 : s] = item; }
      },
      on(ev: string, fn: (p: any) => void) { (handlers[ev] ??= []).push(fn); },
      emit(ev: string, p: any) { (handlers[ev] ?? []).forEach((fn) => fn(p)); },
    };
    bindGameEvents(game);
    return { game, world };
  }

  it('kill concede XP e cria orbe de essência', () => {
    const { game, world } = makeGame();
    game.emit('kill', { x: 1, z: 2, killKind: 'rotboar', loot: { xp: 5 } });
    expect(game.progress.xp).toBe(5);
    expect([...world.query(C.Pickup)].length).toBeGreaterThanOrEqual(1);
  });

  it('kill de chefe aplica screen shake e hit-stop', () => {
    const { game } = makeGame();
    game.emit('kill', { x: 0, z: 0, bossName: 'O Apodrecedor', loot: { xp: 1 } });
    expect(game.camera.shake).toBeGreaterThan(0);
    expect(game.hitStop).toBeGreaterThan(0);
  });

  it('itemPickup auto-equipa em slot vazio e remove da mochila', () => {
    const { game, world } = makeGame();
    const id = world.createEntity();
    world.add(id, C.Loadout, { weapon: null, armor: null, artifacts: [null, null, null], enchantPoints: 0 });
    const weapon = { type: 'weapon', name: 'Teste' };
    world.add(id, C.Inventory, { items: [weapon], essence: 0 });
    game.emit('itemPickup', { id, item: weapon });
    expect(world.get(id, C.Loadout).weapon).toBe(weapon);
    expect(world.get(id, C.Inventory).items).toHaveLength(0);
  });

  it('damage relevante em jogador gera screen shake', () => {
    const { game, world } = makeGame();
    const id = world.createEntity();
    world.add(id, C.PlayerControlled, { index: 0 });
    game.emit('damage', { id, amount: 12 });
    expect(game.camera.shake).toBeGreaterThan(0);
  });

  it('formSwap com Metamorfo dispara onda de dano', () => {
    const { game, world } = makeGame();
    const id = world.createEntity();
    world.add(id, C.Loadout, { weapon: null, armor: { enchants: [{ id: 'metamorfo', level: 1 }] }, artifacts: [null, null, null], enchantPoints: 0 });
    game.emit('formSwap', { id, x: 3, z: 4 });
    expect(game.aoe).toHaveLength(1);
  });
});

describe('Economia (essência + mercador)', () => {
  function makeGame(essences: number[]) {
    const world = new World();
    essences.forEach((e, i) => {
      const id = world.createEntity();
      world.add(id, C.PlayerControlled, { index: i });
      world.add(id, C.Inventory, { items: [], essence: e });
    });
    return { world, game: { world, regionLevel: () => 1, shopStock: null } as any };
  }

  it('partyEssence soma a essência de todas as mochilas', () => {
    const { game } = makeGame([10, 5, 3]);
    expect(partyEssence(game)).toBe(18);
  });

  it('spendEssence deduz em ordem e falha se insuficiente', () => {
    const { game } = makeGame([10, 5]);
    expect(spendEssence(game, 12)).toBe(true);
    expect(partyEssence(game)).toBe(3);
    expect(spendEssence(game, 99)).toBe(false);
    expect(partyEssence(game)).toBe(3); // inalterado quando falha
  });

  it('giveItem adiciona à mochila do P1', () => {
    const { game, world } = makeGame([0, 0]);
    const item = { type: 'weapon', name: 'X' };
    expect(giveItem(game, item)).toBe(true);
    const p1 = [...world.query(C.PlayerControlled, C.Inventory)].find((t: any) => t[1].index === 0);
    expect(world.get(p1![0], C.Inventory).items).toContain(item);
  });

  it('sellIngredient consome 1 da despensa e credita essência ao P1', () => {
    const { game, world } = makeGame([0, 0]);
    addIngredient(game, 'erva', 2);
    expect(sellIngredient(game, 'erva')).toBe(true);
    expect(ingredientCount(game, 'erva')).toBe(1);
    const p1 = [...world.query(C.PlayerControlled, C.Inventory)].find((t: any) => t[1].index === 0);
    expect(world.get(p1![0], C.Inventory).essence).toBe(INGREDIENT_SELL);
    game.progress.ingredients.erva = 0;
    expect(sellIngredient(game, 'erva')).toBe(false); // sem estoque, não vende
  });

  it('rerollShop gera estoque com preço (equip + poções + ingredientes + comida)', () => {
    const { game } = makeGame([0]);
    const stock = rerollShop(game);
    // 5 equipamentos + 2 poções + 3 ingredientes + 1 comida (ADR 0104/0138).
    expect(stock).toHaveLength(11);
    expect(stock.every((s: any) => s.price > 0)).toBe(true);
    expect(stock.every((s: any) => s.item || s.ingredient)).toBe(true); // item OU ingrediente
    expect(stock.some((s: any) => s.ingredient)).toBe(true);
    expect(game.shopStock).toBe(stock);
  });
});

describe('POIs (acampamentos)', () => {
  it('ativa ao aproximar, limpa ao matar os guardas e fica purificado', () => {
    const world = new World();
    const game: any = {
      world, seed: 1,
      groupCenter: { x: 0, z: 0 },
      renderer: { add() {}, remove() {} },
      camera: { addShake() {} },
      regionLevel: () => 1,
      on: (e, fn) => world.on(e, fn),
      emit: (e, p) => world.emit(e, p),
      spawnEnemyByKey: (key, x, z) => {
        const id = world.createEntity();
        world.add(id, C.Health, Health(10));
        world.add(id, C.Faction, Faction(Factions.ENEMY));
        world.add(id, C.Transform, Transform(x, z));
        return id;
      },
    };
    const poi = new PoiManager(game);
    poi.camps = [{ id: 't', x: 0, z: 0, biome: 'clareira', active: false, cleared: false, remaining: 0, mesh: null }];

    poi.update();
    expect(poi.camps[0].active).toBe(true);
    const members = [...world.query(C.CampMember)].map((t) => t[0]);
    expect(members.length).toBe(poi.camps[0].remaining);
    expect(members.length).toBeGreaterThan(0);

    for (const id of members) game.emit('kill', { id });
    expect(poi.camps[0].cleared).toBe(true);
    expect(poi.cleared.has('t')).toBe(true);
  });
});

describe('Eventos dinâmicos', () => {
  it('Espírito do Tesouro solta loot extra ao ser abatido', () => {
    const world = new World();
    const game: any = {
      world, seed: 3, groupCenter: { x: 0, z: 0 },
      renderer: { add() {}, remove() {} },
      camera: { addShake() {} },
      regionLevel: () => 1,
      progress: { level: 1 },
      on: (e, fn) => world.on(e, fn),
      emit: (e, p) => world.emit(e, p),
      _scaleEnemy: (d) => d,
      spawnEnemyByKey: () => 0,
    };
    const ev = new EventManager(game);
    ev._treasure({ x: 0, z: 0 });
    const bounty = [...world.query(C.Bounty)];
    expect(bounty.length).toBe(1);
    const bountyId = bounty[0][0];

    const before = [...world.query(C.Pickup)].length;
    game.emit('kill', { id: bountyId, x: 0, z: 0 });
    const after = [...world.query(C.Pickup)].length;
    expect(after).toBeGreaterThan(before);
  });
});

describe('Masmorra', () => {
  it('progride pelas ondas, dá recompensa e sai restaurando o mundo', () => {
    const world = new World();
    const game: any = {
      world, seed: 5, inDungeon: false,
      groupCenter: { x: 50, z: 50 },
      progress: { level: 2 },
      regionLevel: () => 2,
      renderer: { add() {}, remove() {}, setBiomeMood() {} },
      camera: { addShake() {} },
      story: { objective: () => 'obj' },
      worldManager: { currentBiome: 'pantano' },
      emit: () => {},
      on: () => {},
      spawnEnemyByKey: (key, x, z) => {
        const id = world.createEntity();
        world.add(id, C.Health, Health(5));
        world.add(id, C.Faction, Faction(Factions.ENEMY));
        world.add(id, C.Transform, Transform(x, z));
        return id;
      },
      // Onda final invoca o mini-chefe temático (ADR 0048).
      spawnMiniBoss: (x, z, overrides: any = {}) => {
        const id = world.createEntity();
        world.add(id, C.Health, Health(50));
        world.add(id, C.Faction, Faction(Factions.ENEMY));
        world.add(id, C.Transform, Transform(x, z));
        world.add(id, C.Boss, { name: overrides.name ?? 'mini', phase: 1, miniBoss: true });
        return id;
      },
      // Temas com `boss` invocam um chefe pleno (ADR 0101).
      spawnBossByKey: (key, x, z) => {
        const id = world.createEntity();
        world.add(id, C.Health, Health(80));
        world.add(id, C.Faction, Faction(Factions.ENEMY));
        world.add(id, C.Transform, Transform(x, z));
        world.add(id, C.Boss, { name: key, phase: 1 });
        return id;
      },
    };
    // Um jogador para o teleporte.
    const pid = world.createEntity();
    world.add(pid, C.PlayerControlled, { index: 0, color: 0xffe08a, downed: false });
    world.add(pid, C.Health, Health(100));
    world.add(pid, C.Transform, Transform(50, 50));

    const dgn = new DungeonManager(game);
    const eid = dgn.entrances[0].id;
    dgn.enter(eid);
    expect(game.inDungeon).toBe(true);

    let guard = 0;
    while (dgn.active && dgn.active.phase === 'fighting' && guard++ < 12) {
      dgn.update(2);
      for (const id of dgn.active.enemies) {
        const hp = world.get(id, C.Health);
        if (hp) hp.dead = true;
      }
    }
    expect(dgn.active.phase).toBe('reward');

    const before = [...world.query(C.Pickup)].length;
    dgn.claimReward();
    expect([...world.query(C.Pickup)].length).toBeGreaterThan(before);
    expect(dgn.cleared.has(eid)).toBe(true);

    dgn.update(3); // timer da fase 'done' -> sai
    expect(game.inDungeon).toBe(false);
    expect(dgn.active).toBe(null);
  });
});

describe('Bindings (rebind)', () => {
  it('keyLabel encurta os códigos de tecla', () => {
    expect(keyLabel('KeyW')).toBe('W');
    expect(keyLabel('Digit5')).toBe('5');
    expect(keyLabel('Space')).toBe('Espaço');
    expect(keyLabel('ArrowUp')).toBe('Up');
    expect(keyLabel('')).toBe('—');
  });

  it('loadBindings retorna o mapa padrão completo (sem storage)', () => {
    const b = loadBindings();
    for (const k of Object.keys(DEFAULT_BINDINGS)) {
      expect(Array.isArray(b[k])).toBe(true);
    }
    expect(b.attack).toContain('KeyJ');
  });
});

describe('Orbe (projétil/loot) — recursos compartilhados', () => {
  it('reusa geometria por raio e material por cor, e marca como shared', () => {
    const a = buildOrb(0xff0000, 0.35);
    const b = buildOrb(0xff0000, 0.35);
    expect(a.geometry).toBe(b.geometry); // mesma geometria (mesmo raio)
    expect(a.material).toBe(b.material); // mesmo material (mesma cor)
    expect(a.userData.shared).toBe(true);

    const c = buildOrb(0x00ff00, 0.35);
    expect(c.material).not.toBe(a.material); // cor diferente -> material próprio
    expect(c.geometry).toBe(a.geometry); // mesmo raio -> geometria compartilhada
  });
});

describe('Modelos (.glb pipeline)', () => {
  it('registry vazia por padrão (mantém voxels + bundle enxuto)', () => {
    expect(Object.keys(MODELS).length).toBe(0);
  });

  it('modelUrl monta o caminho em assets/models', () => {
    expect(modelUrl('wolf.glb')).toContain('assets/models/wolf.glb');
  });

  it('buildMesh cai no voxel procedural quando não há modelo', () => {
    _resetModels();
    const g: any = buildMesh('wolf');
    expect(g.userData.kind).toBe('wolf');
    expect(g.children.length).toBeGreaterThan(0); // grupo de caixas
  });

  it('buildVoxelModel monta partes nomeadas e buildMesh as usa', () => {
    _resetModels();
    const g: any = buildVoxelModel('druid');
    expect(g).toBeTruthy();
    expect(g.userData.gait).toBe('biped');
    // Partes nomeadas para animação (cabeça/torso/braços/pernas/arma).
    for (const p of ['head', 'torso', 'armR', 'legL', 'weapon']) {
      expect(g.userData.parts[p]).toBeTruthy();
    }
    // A arma é aninhada sob o braço direito (segue o movimento).
    expect(g.userData.parts.weapon.parent).toBe(g.userData.parts.armR);
    // buildMesh (sem .glb) entrega o modelo voxel com as partes.
    const m: any = buildMesh('wolf');
    expect(m.userData.kind).toBe('wolf');
    expect(m.userData.parts.head).toBeTruthy();
  });

  it('todos os kinds da vitrine têm spec', () => {
    for (const grp of SHOWCASE_GROUPS) {
      for (const kind of grp.kinds) expect(MODEL_SPECS[kind]).toBeTruthy();
    }
  });

  it('animateBody: andar move pernas em oposição; ataque lança o braço direito', () => {
    const mkPart = () => ({ rotation: { x: 0, y: 0, z: 0 } });
    const body: any = {
      position: { y: 0 },
      userData: { gait: 'biped', parts: { torso: mkPart(), legL: mkPart(), legR: mkPart(), armL: mkPart(), armR: mkPart(), head: mkPart(), weapon: mkPart() } },
    };
    const p = body.userData.parts;
    // Andando: pernas defasadas (sinais opostos), braços também.
    animateBody(body, 0.1, { moving: true, speed: 4, attack: 0, gait: 'biped' });
    expect(Math.sign(p.legL.rotation.x)).toBe(-Math.sign(p.legR.rotation.x));
    expect(p.legL.rotation.x).not.toBe(0);
    // Atacando: braço direito vai à frente (rotação negativa em x).
    animateBody(body, 0.016, { moving: false, speed: 0, attack: 1, gait: 'biped' });
    expect(p.armR.rotation.x).toBeLessThan(0);
    // Tomando dano (flinch): cabeça e tronco recuam (x positivo).
    animateBody(body, 0.016, { moving: false, speed: 0, attack: 0, react: 1, gait: 'biped' });
    expect(p.head.rotation.x).toBeGreaterThan(0);
    expect(p.torso.rotation.x).toBeGreaterThan(0);
  });

  it('animateBody: quadrúpede cruza as patas; ave bate as asas', () => {
    const mkPart = () => ({ rotation: { x: 0, y: 0, z: 0 } });
    const quad: any = { position: { y: 0 }, userData: { gait: 'quadruped', parts: { legFL: mkPart(), legFR: mkPart(), legBL: mkPart(), legBR: mkPart(), tail: mkPart() } } };
    animateBody(quad, 0.1, { moving: true, speed: 4, attack: 0, gait: 'quadruped' });
    const q = quad.userData.parts;
    expect(Math.sign(q.legFL.rotation.x)).toBe(Math.sign(q.legBR.rotation.x)); // diagonal em fase
    expect(Math.sign(q.legFL.rotation.x)).toBe(-Math.sign(q.legFR.rotation.x)); // lados opostos

    const bird: any = { position: { y: 0 }, userData: { gait: 'bird', parts: { wingL: mkPart(), wingR: mkPart() } } };
    animateBody(bird, 0.1, { moving: true, speed: 3, attack: 0, gait: 'bird' });
    const w = bird.userData.parts;
    expect(w.wingL.rotation.z).toBe(-w.wingR.rotation.z); // asas espelhadas
  });

  it('buildMesh usa o modelo carregado (clone) quando disponível', () => {
    _resetModels();
    const fake = new THREE.Group();
    fake.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
    _setModelForTest('wolf', fake);
    const a: any = buildMesh('wolf');
    const b: any = buildMesh('wolf');
    expect(a.userData.kind).toBe('wolf');
    expect(a).not.toBe(fake); // é um clone
    expect(a).not.toBe(b);    // clones independentes
    _resetModels();
  });
});

describe('SpatialHash', () => {
  it('retorna vizinhos próximos e exclui distantes', () => {
    const g = new SpatialHash(4);
    g.insert(1, 0, 0);
    g.insert(2, 1, 1);
    g.insert(3, 100, 100);
    const near = g.queryRadius(0, 0, 2);
    expect(near).toContain(1);
    expect(near).toContain(2);
    expect(near).not.toContain(3);
  });

  it('clear esvazia o índice', () => {
    const g = new SpatialHash(4);
    g.insert(1, 0, 0);
    g.clear();
    expect(g.queryRadius(0, 0, 5)).toEqual([]);
  });
});

describe('Utils', () => {
  it('makeRng é determinístico para a mesma seed', () => {
    const a = makeRng(42), b = makeRng(42);
    expect(a()).toBe(b());
    expect(a.int(0, 100)).toBe(b.int(0, 100));
  });

  it('weightedPick respeita pesos (favorece o maior)', () => {
    const rng = makeRng(1);
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 1000; i++) counts[weightedPick([{ key: 'a', weight: 9 }, { key: 'b', weight: 1 }], rng).key]++;
    expect(counts.a).toBeGreaterThan(counts.b);
  });
});
