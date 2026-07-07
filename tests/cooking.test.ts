import { describe, it, expect } from 'vitest';
import {
  INGREDIENTS, DROP_INGREDIENTS, forageOf, addIngredient, ingredientCount,
  hasIngredients, consumeIngredients, pouchList,
} from '../src/gameplay/ingredients.js';
import {
  RECIPES, recipeById, recipesAreValid, craftXpForLevel, craftLevel,
  gainCraftXp, canCook, cook, ingredientCoverage,
} from '../src/gameplay/recipes.js';
import { FOOD_BASES } from '../src/gameplay/consumables.js';

function makeGame(): any {
  return { progress: {}, emit: () => {} };
}

describe('Despensa de ingredientes (ADR 0135, E19.1)', () => {
  it('add/count/consume respeitam a quantidade', () => {
    const g = makeGame();
    addIngredient(g, 'carne_crua', 3);
    expect(ingredientCount(g, 'carne_crua')).toBe(3);
    expect(hasIngredients(g, { carne_crua: 2 })).toBe(true);
    expect(hasIngredients(g, { carne_crua: 4 })).toBe(false);
    expect(consumeIngredients(g, { carne_crua: 2 })).toBe(true);
    expect(ingredientCount(g, 'carne_crua')).toBe(1);
    expect(consumeIngredients(g, { carne_crua: 5 })).toBe(false); // não consome parcial
    expect(ingredientCount(g, 'carne_crua')).toBe(1);
  });

  it('ignora ingrediente inexistente e lista só os possuídos', () => {
    const g = makeGame();
    addIngredient(g, 'nao_existe', 5);
    addIngredient(g, 'erva', 2);
    expect(ingredientCount(g, 'nao_existe')).toBe(0);
    expect(pouchList(g).map((p) => p.def.id)).toEqual(['erva']);
  });

  it('DROP_INGREDIENTS são de fonte drop; forageOf filtra por bioma', () => {
    expect(DROP_INGREDIENTS.every((i) => i.source === 'drop')).toBe(true);
    const clareira = forageOf('clareira').map((i) => i.id);
    expect(clareira).toContain('erva');
    expect(clareira).not.toContain('peixe'); // peixe é do pântano
  });

  it('save antigo migra couro/pena → sebo/ovo sem perder itens (ADR 0156)', () => {
    // Despensa de um save anterior à renomeação, incluindo sebo já existente.
    const g: any = { progress: { ingredients: { couro: 3, pena: 2, sebo: 1, carne_crua: 4 } }, emit: () => {} };
    expect(ingredientCount(g, 'sebo')).toBe(4); // 1 + 3 migrados
    expect(ingredientCount(g, 'ovo')).toBe(2);
    expect(ingredientCount(g, 'carne_crua')).toBe(4); // intactos
    // Ids antigos somem após a migração.
    expect(g.progress.ingredients.couro).toBeUndefined();
    expect(g.progress.ingredients.pena).toBeUndefined();
  });
});

describe('Receitas & nível de Craft (ADR 0135)', () => {
  it('toda receita produz uma comida existente', () => {
    expect(recipesAreValid()).toBe(true);
    expect(RECIPES.length).toBeGreaterThan(0);
  });

  it('nenhum ingrediente é órfão: todo ingrediente serve ≥2 pratos (ADR 0156)', () => {
    const cov = ingredientCoverage();
    const orphans = Object.entries(cov).filter(([, n]) => n < 2).map(([id, n]) => `${id}:${n}`);
    expect(orphans, `ingredientes usados em <2 receitas: ${orphans.join(', ')}`).toEqual([]);
  });

  it('as receitas cobrem os três tipos de buff em três tiers (ADR 0156)', () => {
    const foods = RECIPES.map((r) => FOOD_BASES[r.food]);
    for (const kind of ['dmg', 'speed', 'taken'] as const) {
      const tiers = foods.filter((f) => f.kind === kind).map((f) => f.pct).sort((a, b) => a - b);
      expect(tiers.length, `linha ${kind}`).toBeGreaterThanOrEqual(3);
      // Tiers estritamente crescentes: comida mais rara é mais forte.
      for (let i = 1; i < tiers.length; i++) expect(tiers[i]).toBeGreaterThan(tiers[i - 1]);
    }
    // O prato mais forte de cada linha exige nível de Craft maior que o mais fraco.
    const byLevel = [...RECIPES].sort((a, b) => a.level - b.level);
    expect(byLevel[0].level).toBe(1);
    expect(byLevel[byLevel.length - 1].level).toBeGreaterThanOrEqual(3);
  });

  it('curva de XP é crescente e gainCraftXp sobe de nível', () => {
    expect(craftXpForLevel(1)).toBe(0);
    expect(craftXpForLevel(2)).toBeGreaterThan(craftXpForLevel(1));
    const g = makeGame();
    expect(craftLevel(g)).toBe(1);
    gainCraftXp(g, craftXpForLevel(2));
    expect(craftLevel(g)).toBe(2);
  });

  it('canCook exige nível e ingredientes', () => {
    const g = makeGame();
    const stew = recipeById('r_stew')!; // level 2
    addIngredient(g, 'cenoura', 1); addIngredient(g, 'cogumelo', 1); addIngredient(g, 'carne_crua', 1);
    expect(canCook(g, stew)).toBe(false); // falta nível
    gainCraftXp(g, craftXpForLevel(2));
    expect(canCook(g, stew)).toBe(true);
  });

  it('cook consome ingredientes, dá XP e devolve a comida', () => {
    const g = makeGame();
    addIngredient(g, 'erva', 2); addIngredient(g, 'mel', 1);
    const food = cook(g, 'r_herbtea');
    expect(food).toBeTruthy();
    expect((food as any).effect).toBe('buff');
    expect(ingredientCount(g, 'erva')).toBe(0);
    expect(ingredientCount(g, 'mel')).toBe(0);
    expect(g.progress.craft.xp).toBeGreaterThan(0);
    // sem ingredientes, não cozinha
    expect(cook(g, 'r_herbtea')).toBe(null);
  });
});
