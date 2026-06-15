import { describe, it, expect } from 'vitest';
import { World } from '../src/core/ecs/World.js';
import { C, Transform, Health, Faction, Collider, StatusEffects, Factions } from '../src/core/ecs/components.js';
import { applyDamage, meleeArc, applyStatus } from '../src/gameplay/combat.js';
import { generateItem, RARITIES } from '../src/gameplay/loot.js';
import { grantXp, xpForLevel } from '../src/gameplay/progression.js';
import { makeRng, weightedPick } from '../src/utils/math.js';

function stubGame() {
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
  it('XP suficiente sobe de nível e concede pontos de encanto', () => {
    const g = stubGame();
    g.progress = { xp: 0, level: 1, enchantPoints: 0 };
    grantXp(g, xpForLevel(1) + xpForLevel(2));
    expect(g.progress.level).toBe(3);
    expect(g.progress.enchantPoints).toBe(2);
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
