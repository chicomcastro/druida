import { describe, it, expect } from 'vitest';
import { generateItem, ARMOR_SLOTS, emptyArmor, RARITY_MODS } from '../src/gameplay/loot.js';
import { MODIFIERS, rollModifiers, sumMod, modValue } from '../src/gameplay/modifiers.js';
import { makeRng } from '../src/utils/math.js';

describe('Itens RPG — armadura anatômica (ADR 0087)', () => {
  it('armadura sempre tem uma das 4 peças anatômicas', () => {
    for (let i = 0; i < 40; i++) {
      const a: any = generateItem(3, 'armor', i + 1);
      expect(ARMOR_SLOTS).toContain(a.slot);
    }
  });

  it('forceSlot fixa a peça gerada', () => {
    for (const slot of ARMOR_SLOTS) {
      const a: any = generateItem(5, 'armor', 7, 'rare', null, slot);
      expect(a.slot).toBe(slot);
    }
  });

  it('emptyArmor devolve as 4 peças nulas', () => {
    const set = emptyArmor();
    expect(Object.keys(set).sort()).toEqual(['body', 'boots', 'head', 'legs']);
    expect(ARMOR_SLOTS.every((s) => set[s] === null)).toBe(true);
  });
});

describe('Itens RPG — famílias de arma (ADR 0088)', () => {
  it('armas melee têm família válida', () => {
    for (let i = 0; i < 40; i++) {
      const w: any = generateItem(2, 'weapon', i + 1, null, 'melee');
      expect(['axe', 'scythe', 'claws']).toContain(w.family);
    }
  });
  it('cajado ranged é da família staff', () => {
    const w: any = generateItem(2, 'weapon', 3, null, 'ranged');
    expect(w.family).toBe('staff');
  });
});

describe('Modificadores (ADR 0088)', () => {
  it('comum não rola afixo, raro rola 1, único 2', () => {
    expect(RARITY_MODS.common).toBe(0);
    const common: any = generateItem(3, 'weapon', 1, 'common');
    const rare: any = generateItem(3, 'weapon', 1, 'rare');
    const uniq: any = generateItem(3, 'weapon', 1, 'unique');
    expect(common.mods.length).toBe(0);
    expect(rare.mods.length).toBe(1);
    expect(uniq.mods.length).toBe(2);
  });

  it('afixos respeitam o tipo do item', () => {
    const rng = makeRng(42);
    const mods = rollModifiers('armor', 2, 5, rng);
    for (const m of mods) expect(MODIFIERS[m.id].types).toContain('armor');
  });

  it('magnitude escala com o nível', () => {
    const def = MODIFIERS.might;
    expect(modValue(def, 10)).toBeGreaterThan(modValue(def, 1));
  });

  it('sumMod agrega o mesmo afixo em vários itens', () => {
    const items = [
      { mods: [{ id: 'might', value: 10 }] },
      { mods: [{ id: 'might', value: 5 }, { id: 'lifesteal', value: 3 }] },
      null,
    ];
    expect(sumMod(items as any, 'might')).toBe(15);
    expect(sumMod(items as any, 'lifesteal')).toBe(3);
    expect(sumMod(items as any, 'thorns')).toBe(0);
  });
});
