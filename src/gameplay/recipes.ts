import { consumeIngredients, hasIngredients, INGREDIENTS } from './ingredients.js';
import { FOOD_BASES, generateFood } from './consumables.js';

/**
 * Receitas de cozinha (E19, ampliadas no E24). Cada receita transforma
 * ingredientes da despensa em uma **comida** (consumível de buff, ADR 0134).
 * Cozinhar dá XP de Craft; o nível de Craft destrava receitas melhores.
 *
 * Regra de design (ADR 0156): TODO ingrediente entra em ≥2 receitas (nada de
 * ingrediente órfão) e cada linha de buff tem três tiers — os pratos mais
 * fortes usam ingredientes mais raros e exigem mais nível de Craft. O teste
 * `cooking.test` trava regressões via `ingredientCoverage()`.
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
  // DANO (assados) — carne + pimenta/sebo/cogumelo. Tier sobe: mais forte, mais raro.
  { id: 'r_jerky', name: 'Carne Seca', food: 'jerky', inputs: { carne_crua: 2, pimenta: 1 }, level: 1, xp: 10 },
  { id: 'r_skewer', name: 'Espetinho da Caça', food: 'skewer', inputs: { carne_crua: 2, cogumelo: 1, sebo: 1 }, level: 2, xp: 18 },
  { id: 'r_roast', name: 'Assado das Brasas', food: 'roast', inputs: { carne_crua: 2, pimenta: 2, sebo: 1 }, level: 3, xp: 30 },
  // VELOCIDADE (leves) — erva/mel/peixe/ovo/junco/baga.
  { id: 'r_herbtea', name: 'Chá de Ervas', food: 'herbtea', inputs: { erva: 2, mel: 1 }, level: 1, xp: 10 },
  { id: 'r_fishpie', name: 'Torta de Peixe', food: 'fishpie', inputs: { peixe: 2, ovo: 1, junco: 1 }, level: 2, xp: 18 },
  { id: 'r_icejam', name: 'Geleia Gélida', food: 'icejam', inputs: { baga_gelada: 2, mel: 2, ovo: 1 }, level: 3, xp: 30 },
  // DEFESA (sopas/caldos) — cenoura/junco/cogumelo/peixe/baga/erva/ovo.
  { id: 'r_soup', name: 'Sopa de Raízes', food: 'soup', inputs: { cenoura: 2, junco: 1 }, level: 1, xp: 10 },
  { id: 'r_stew', name: 'Ensopado Quente', food: 'stew', inputs: { cenoura: 1, cogumelo: 1, carne_crua: 1 }, level: 2, xp: 16 },
  { id: 'r_broth', name: 'Caldo do Inverno', food: 'broth', inputs: { peixe: 1, baga_gelada: 1, ovo: 1, erva: 1 }, level: 3, xp: 30 },
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

/**
 * Quantas receitas usam cada ingrediente (ADR 0156). Base do teste que garante
 * que nenhum ingrediente é órfão e que todo ingrediente serve ≥2 pratos.
 */
export function ingredientCoverage(): Record<string, number> {
  const cov: Record<string, number> = {};
  for (const id of Object.keys(INGREDIENTS)) cov[id] = 0;
  for (const r of RECIPES) {
    for (const id of Object.keys(r.inputs)) cov[id] = (cov[id] ?? 0) + 1;
  }
  return cov;
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
