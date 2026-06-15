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
import { serialize, apply } from '../src/gameplay/save.js';
import { SpatialHash } from '../src/utils/SpatialHash.js';

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
    world.add(pid, C.Form, { current: 'humanoid', list: ['humanoid', 'wolf'] });
    return { game, world, pid, events };
  }

  it('avança do diálogo ao confronto final e desbloqueia formas', () => {
    const { game, world, pid, events } = storyGame();
    const story = new StoryManager(game);
    expect(story.current().id).toBe('talk');

    story.onInteract({ kind: 'npc' }, 0);
    expect(story.current().id).toBe('purify_clearing');

    for (let i = 0; i < 8; i++) game.emit('kill', { id: 99, x: 0, z: 0 });
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
      progress: { xp: 10, level: 5, enchantPoints: 0 },
      story: { step: 3, kills: 2, _spawned: { miniboss: true } },
      worldManager: { explored: new Set(['0,0', '1,-5']) },
      sharedChest: [{ type: 'armor', name: 'Manto Guardado', rarity: 'rare', armor: 0.1, enchants: [] }],
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
    const data = JSON.parse(JSON.stringify(serialize(game)));

    // "Novo" jogo, depois aplica o save.
    const fresh = saveGame();
    fresh.game.progress = { xp: 0, level: 1, enchantPoints: 0 };
    fresh.game.story = { step: 0, kills: 0, _spawned: {} };
    fresh.game.worldManager.explored = new Set();
    fresh.game.sharedChest = [];
    const ok = apply(fresh.game, data);

    expect(ok).toBe(true);
    expect(fresh.game.progress.level).toBe(5);
    expect(fresh.game.story.step).toBe(3);
    expect(fresh.world.get(fresh.pid, C.Form).list).toContain('bear');
    expect(fresh.world.get(fresh.pid, C.Inventory).essence).toBe(25);
    expect(fresh.game.sharedChest).toHaveLength(1);
    expect(fresh.game.sharedChest[0].name).toBe('Manto Guardado');
    expect(fresh.world.get(fresh.pid, C.Loadout).weapon.name).toBe('Cajado Teste');
    expect(fresh.game.worldManager.explored.has('1,-5')).toBe(true);
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
