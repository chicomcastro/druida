import { describe, it, expect } from 'vitest';
import { generateConsumable, useConsumable, CONSUMABLE_BASES } from '../src/gameplay/consumables.js';

function stubGame(hp = 50, hpMax = 100, sap = 20, sapMax = 100) {
  const state: any = { hp: { hp, max: hpMax, dead: false }, sap: { value: sap, max: sapMax } };
  return {
    _events: [] as any[],
    world: { get: (_id: number, comp: any) => (comp === 'Health' ? state.hp : comp === 'Sap' ? state.sap : null) },
    gainSap(_id: number, n: number) { state.sap.value = Math.min(state.sap.max, state.sap.value + n); },
    emit(ev: string, p: any) { this._events.push({ ev, p }); },
    _state: state,
  };
}

// combat.healEntity usa game.world.get(id,'Health') e game.emit — nosso stub cobre.
describe('Consumíveis (ADR 0089)', () => {
  it('poção de cura restaura vida e é consumida', () => {
    const g: any = stubGame(50, 100);
    const pot = generateConsumable('heal_s', 1);
    expect(pot.type).toBe('consumable');
    expect(useConsumable(g, 1, pot)).toBe(true);
    expect(g._state.hp.hp).toBeGreaterThan(50);
  });

  it('não desperdiça cura com vida cheia', () => {
    const g: any = stubGame(100, 100);
    expect(useConsumable(g, 1, generateConsumable('heal_s', 1))).toBe(false);
  });

  it('poção de seiva restaura Seiva', () => {
    const g: any = stubGame(100, 100, 10, 100);
    expect(useConsumable(g, 1, generateConsumable('sap_s', 1))).toBe(true);
    expect(g._state.sap.value).toBeGreaterThan(10);
  });

  it('magnitude escala com o nível', () => {
    expect(generateConsumable('heal_l', 5).magnitude).toBeGreaterThan(generateConsumable('heal_l', 1).magnitude);
  });

  it('todas as bases geram consumível válido', () => {
    for (const kind of Object.keys(CONSUMABLE_BASES) as any[]) {
      const c = generateConsumable(kind, 1);
      expect(c.type).toBe('consumable');
      expect(c.magnitude).toBeGreaterThan(0);
    }
  });
});
