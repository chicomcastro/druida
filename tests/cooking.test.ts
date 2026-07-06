import { describe, it, expect } from 'vitest';
import {
  INGREDIENTS, DROP_INGREDIENTS, forageOf, addIngredient, ingredientCount,
  hasIngredients, consumeIngredients, pouchList,
} from '../src/gameplay/ingredients.js';
import {
  RECIPES, recipeById, recipesAreValid, craftXpForLevel, craftLevel,
  gainCraftXp, canCook, cook,
} from '../src/gameplay/recipes.js';

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
});

describe('Receitas & nível de Craft (ADR 0135)', () => {
  it('toda receita produz uma comida existente', () => {
    expect(recipesAreValid()).toBe(true);
    expect(RECIPES.length).toBeGreaterThan(0);
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
