import { describe, it, expect } from 'vitest';
import { ensureBuffs, applyBuff, tickBuffs, buffMul, activeBuffs } from '../src/gameplay/buffs.js';
import { generateFood, FOOD_BASES, useConsumable } from '../src/gameplay/consumables.js';

function makeGame(): any {
  return { buffs: [], emit: () => {} };
}

describe('Buffs temporários (ADR 0134, E18.3)', () => {
  it('applyBuff adiciona e buffMul multiplica por tipo', () => {
    const g = makeGame();
    applyBuff(g, { id: 'a', kind: 'dmg', mul: 1.2, remaining: 10, total: 10, name: 'A', icon: '🍖', color: 0 });
    expect(buffMul(g, 'dmg')).toBeCloseTo(1.2);
    expect(buffMul(g, 'speed')).toBe(1); // nenhum do tipo
  });

  it('mesmo id renova (não empilha)', () => {
    const g = makeGame();
    applyBuff(g, { id: 'food:dmg', kind: 'dmg', mul: 1.2, remaining: 5, total: 10, name: 'A', icon: '🍖', color: 0 });
    applyBuff(g, { id: 'food:dmg', kind: 'dmg', mul: 1.2, remaining: 10, total: 10, name: 'A', icon: '🍖', color: 0 });
    expect(activeBuffs(g).length).toBe(1);
    expect(activeBuffs(g)[0].remaining).toBe(10);
    expect(buffMul(g, 'dmg')).toBeCloseTo(1.2); // não vira 1.44
  });

  it('tickBuffs decai e remove ao expirar', () => {
    const g = makeGame();
    applyBuff(g, { id: 'a', kind: 'speed', mul: 1.2, remaining: 1, total: 1, name: 'A', icon: '🍵', color: 0 });
    tickBuffs(g, 0.6);
    expect(activeBuffs(g).length).toBe(1);
    tickBuffs(g, 0.6);
    expect(activeBuffs(g).length).toBe(0);
    expect(buffMul(g, 'speed')).toBe(1);
  });

  it('tipos diferentes coexistem', () => {
    const g = makeGame();
    applyBuff(g, { id: 'd', kind: 'dmg', mul: 1.2, remaining: 5, total: 5, name: '', icon: '', color: 0 });
    applyBuff(g, { id: 't', kind: 'taken', mul: 0.8, remaining: 5, total: 5, name: '', icon: '', color: 0 });
    expect(buffMul(g, 'dmg')).toBeCloseTo(1.2);
    expect(buffMul(g, 'taken')).toBeCloseTo(0.8);
  });
});

describe('Comida (ADR 0134)', () => {
  it('generateFood cria consumível de buff com os campos certos', () => {
    const food = generateFood('jerky', 1) as any;
    expect(food.type).toBe('consumable');
    expect(food.effect).toBe('buff');
    expect(food.buff.kind).toBe('dmg');
    expect(food.name).toBe(FOOD_BASES.jerky.name);
  });

  it('useConsumable de comida aplica o buff (dmg → mul > 1; taken → mul < 1)', () => {
    const g: any = { buffs: [], emit: () => {}, world: { get: () => null } };
    const jerky = generateFood('jerky', 1);
    expect(useConsumable(g, 1, jerky)).toBe(true);
    expect(buffMul(g, 'dmg')).toBeGreaterThan(1);

    const stew = generateFood('stew', 1);
    expect(useConsumable(g, 1, stew)).toBe(true);
    expect(buffMul(g, 'taken')).toBeLessThan(1);
  });
});
