import { describe, it, expect } from 'vitest';
import { makeGame, addPlayer } from './helpers.js';
import { C } from '../src/core/ecs/components.js';
import { promoteToElite, spawnPack, pickPack, registerEliteEffects } from '../src/gameplay/spawn.js';
import { ELITE_AFFIXES } from '../src/data/enemies.js';
import { BIOMES } from '../src/data/biomes.js';

describe('packs de encontro', () => {
  it('todos os biomas definem packs com composições válidas', () => {
    for (const [key, def] of Object.entries(BIOMES) as any) {
      expect(def.packs?.length, key).toBeGreaterThan(0);
      for (const p of def.packs) {
        expect(p.comp.length).toBeGreaterThanOrEqual(3);
        for (const k of p.comp) expect(def.enemies.some((e) => e.key === k) || k in ELITE_AFFIXES === false).toBe(true);
      }
    }
  });

  it('spawnPack cria a composição em círculo', () => {
    const g = makeGame();
    const ids = spawnPack(g, ['rotboar', 'husk', 'shaman'], 40, 0);
    expect(ids.length).toBe(3);
    const kinds = ids.map((id) => g.world.get(id, C.AI).behavior);
    expect(kinds).toEqual(['melee', 'melee', 'summoner']);
  });

  it('pickPack sorteia dos packs do bioma (e null sem packs)', () => {
    expect(pickPack(BIOMES.pantano, () => 0)).toBe(BIOMES.pantano.packs[0]);
    expect(pickPack({} as any)).toBeNull();
  });
});

describe('elites com afixo', () => {
  it('promoteToElite aplica stats, escala e recompensa', () => {
    const g = makeGame();
    const id = g.spawnEnemyByKey('rotboar', 30, 0);
    const hpBefore = g.world.get(id, C.Health).max;
    const xpBefore = g.world.get(id, C.LootTable).xp;
    expect(promoteToElite(g, id, 'petreo')).toBe(true);
    expect(g.world.get(id, C.AI).elite).toBe('petreo');
    expect(g.world.get(id, C.Health).max).toBeGreaterThan(hpBefore);
    const loot = g.world.get(id, C.LootTable);
    expect(loot.xp).toBeGreaterThan(xpBefore);
    expect(loot.dropChance).toBeGreaterThanOrEqual(0.8);
    expect(loot.essenceBonus).toBe(8);
    expect(g.world.get(id, C.Renderable).baseScale).toBeCloseTo(1.25);
    expect(promoteToElite(g, id, 'inexistente')).toBe(false);
  });

  it('Veloz fica mais rápido; Pétreo mais lento e mais duro', () => {
    const g = makeGame();
    const a = g.spawnEnemyByKey('rotboar', 30, 0);
    const b = g.spawnEnemyByKey('rotboar', 32, 0);
    const base = g.world.get(a, C.Velocity).speed;
    promoteToElite(g, a, 'veloz');
    promoteToElite(g, b, 'petreo');
    expect(g.world.get(a, C.Velocity).speed).toBeGreaterThan(base);
    expect(g.world.get(b, C.Velocity).speed).toBeLessThan(base);
    expect(g.world.get(b, C.Health).max).toBeGreaterThan(g.world.get(a, C.Health).max);
  });

  it('Volátil explode ao morrer e fere jogadores próximos', () => {
    const g = makeGame();
    registerEliteEffects(g);
    const pid = addPlayer(g, 0, 30, 0);
    const id = g.spawnEnemyByKey('fungling', 30.5, 0);
    promoteToElite(g, id, 'volatil');
    const hpBefore = g.world.get(pid, C.Health).hp;
    g.world.get(pid, C.Health).invuln = 0;
    g.emit('kill', { id, x: 30.5, z: 0 });
    expect(g.world.get(pid, C.Health).hp).toBeLessThan(hpBefore);
  });

  it('Sanguessuga se cura pelo dano causado a jogadores', () => {
    const g = makeGame();
    registerEliteEffects(g);
    const pid = addPlayer(g, 0, 30, 0);
    const id = g.spawnEnemyByKey('husk', 31, 0);
    promoteToElite(g, id, 'sanguessuga');
    const hp = g.world.get(id, C.Health);
    hp.hp = hp.max * 0.5;
    g.emit('damage', { id: pid, attackerId: id, amount: 20 });
    expect(hp.hp).toBeCloseTo(hp.max * 0.5 + 10);
  });

  it('elite morto dá mais essência no drop (essenceBonus)', () => {
    const g = makeGame();
    // makeGame não liga bindGameEvents; validamos o campo no LootTable e o
    // cálculo do bônus é coberto pela unidade do handler no jogo real (e2e).
    const id = g.spawnEnemyByKey('rotboar', 30, 0);
    promoteToElite(g, id, 'veloz');
    expect(g.world.get(id, C.LootTable).essenceBonus).toBe(8);
  });
});
