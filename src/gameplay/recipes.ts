import { consumeIngredients, hasIngredients } from './ingredients.js';
import { FOOD_BASES, generateFood } from './consumables.js';

/**
 * Receitas de cozinha (E19). Cada receita transforma ingredientes da despensa
 * em uma **comida** (consumível de buff, ADR 0134). Cozinhar dá XP de Craft; o
 * nível de Craft destrava receitas melhores (E19.2 traz a bancada/UI).
 */

export interface Recipe {
  id: string;
  name: string;
  /** Chave em FOOD_BASES do resultado. */
  food: keyof typeof FOOD_BASES;
  /** Ingredientes consumidos: { ingredienteId: quantidade }. */
  inputs: Record<string, number>;
  /** Nível de Craft mínimo para cozinhar. */
  level: number;
  /** XP de Craft ganho ao cozinhar. */
  xp: number;
}

export const RECIPES: Recipe[] = [
  { id: 'r_jerky', name: 'Carne Seca', food: 'jerky', inputs: { carne_crua: 2, pimenta: 1 }, level: 1, xp: 10 },
  { id: 'r_herbtea', name: 'Chá de Ervas', food: 'herbtea', inputs: { erva: 2, mel: 1 }, level: 1, xp: 10 },
  { id: 'r_stew', name: 'Ensopado Quente', food: 'stew', inputs: { cenoura: 1, cogumelo: 1, carne_crua: 1 }, level: 2, xp: 16 },
];

const RECIPE_INDEX: Record<string, Recipe> = {};
for (const r of RECIPES) RECIPE_INDEX[r.id] = r;

export function recipeById(id: string): Recipe | undefined {
  return RECIPE_INDEX[id];
}

/** Toda receita produz uma comida existente (guarda de sanidade/teste). */
export function recipesAreValid(): boolean {
  return RECIPES.every((r) => !!FOOD_BASES[r.food]);
}

// --- Nível de Craft --------------------------------------------------------

export function ensureCraft(game): { xp: number; level: number } {
  const p = game.progress || (game.progress = {});
  p.craft = p.craft ?? { xp: 0, level: 1 };
  return p.craft;
}

/** XP total acumulado necessário para alcançar um nível (curva suave). */
export function craftXpForLevel(level: number): number {
  return Math.round(40 * (level - 1) * level / 2); // 0, 40, 120, 240, ...
}

export function craftLevel(game): number {
  return ensureCraft(game).level;
}

/** Adiciona XP de Craft e sobe de nível conforme a curva. Devolve nível novo. */
export function gainCraftXp(game, amount: number): number {
  const c = ensureCraft(game);
  c.xp += amount;
  let leveled = false;
  while (c.xp >= craftXpForLevel(c.level + 1)) { c.level++; leveled = true; }
  if (leveled) game.emit?.('craftLevelUp', { level: c.level });
  return c.level;
}

export function canCook(game, recipe: Recipe): boolean {
  return craftLevel(game) >= recipe.level && hasIngredients(game, recipe.inputs);
}

/**
 * Cozinha uma receita: consome ingredientes, dá XP de Craft e devolve a comida
 * gerada (ou null se não deu). A UI/estação (E19.2) coloca a comida na mochila.
 */
export function cook(game, recipeId: string, foodLevel = 1) {
  const r = RECIPE_INDEX[recipeId];
  if (!r) return null;
  if (craftLevel(game) < r.level) return null;
  if (!consumeIngredients(game, r.inputs)) return null;
  gainCraftXp(game, r.xp);
  const food = generateFood(r.food, foodLevel);
  game.emit?.('cooked', { recipeId, food });
  return food;
}
