/**
 * Ingredientes & despensa (E19.1 — Culinária). Ingredientes são recursos
 * empilháveis (não itens de grade): caem de inimigos, são coletados no mundo
 * (forrageamento, E19.3) ou comprados (E19.4), e viram comida na cozinha (E19.2).
 *
 * Ficam numa "despensa" em `game.progress.ingredients` (contagem por id), que
 * persiste no save junto do resto do progresso.
 */

export interface IngredientDef {
  id: string;
  name: string;
  icon: string;
  /** Biomas onde dropa/forrageia (vazio = qualquer lugar). */
  biomes: string[];
  /** Fonte principal — 'drop' (inimigos) ou 'forage' (coleta no chão). */
  source: 'drop' | 'forage';
}

export const INGREDIENTS: Record<string, IngredientDef> = {
  // Drops de inimigos: as três partes comestíveis das feras corrompidas. Antes
  // couro/pena eram "órfãos" (não entravam em receita nenhuma); viraram sebo/ovo
  // — ingredientes de cozinha de verdade, usados em ≥2 pratos (ADR 0156).
  carne_crua: { id: 'carne_crua', name: 'Carne Crua', icon: '🥩', biomes: [], source: 'drop' },
  sebo: { id: 'sebo', name: 'Sebo', icon: '🧈', biomes: [], source: 'drop' },
  ovo: { id: 'ovo', name: 'Ovo Selvagem', icon: '🥚', biomes: [], source: 'drop' },
  // Forrageáveis: as chaves de bioma DEVEM casar com as de `biomeAt`
  // (clareira/pantano/bosque_cinza/picos) — antes 'cinza'/'degelo' não batiam e
  // esses biomas ficavam sem forrageamento nenhum (ADR 0158). Cada bioma jogável
  // tem ≥2 forrageáveis (guardado por teste).
  erva: { id: 'erva', name: 'Erva Silvestre', icon: '🌿', biomes: ['clareira', 'picos'], source: 'forage' },
  cenoura: { id: 'cenoura', name: 'Cenoura Selvagem', icon: '🥕', biomes: ['clareira'], source: 'forage' },
  cogumelo: { id: 'cogumelo', name: 'Cogumelo', icon: '🍄', biomes: ['clareira', 'pantano', 'bosque_cinza'], source: 'forage' },
  peixe: { id: 'peixe', name: 'Peixe', icon: '🐟', biomes: ['pantano'], source: 'forage' },
  junco: { id: 'junco', name: 'Raiz de Junco', icon: '🥬', biomes: ['pantano'], source: 'forage' },
  baga_gelada: { id: 'baga_gelada', name: 'Baga Gelada', icon: '🫐', biomes: ['picos'], source: 'forage' },
  pimenta: { id: 'pimenta', name: 'Pimenta das Cinzas', icon: '🌶️', biomes: ['bosque_cinza'], source: 'forage' },
  mel: { id: 'mel', name: 'Mel Silvestre', icon: '🍯', biomes: ['clareira', 'pantano'], source: 'forage' },
};

/** Ingredientes que fazem sentido cair de um inimigo (source 'drop'). */
export const DROP_INGREDIENTS = Object.values(INGREDIENTS).filter((i) => i.source === 'drop');

/** Ingredientes forrageáveis de um bioma (para nós de coleta — E19.3). */
export function forageOf(biome: string): IngredientDef[] {
  return Object.values(INGREDIENTS).filter((i) => i.source === 'forage' && (i.biomes.length === 0 || i.biomes.includes(biome)));
}

// --- Despensa --------------------------------------------------------------

/** Ingredientes renomeados (ADR 0156): saves antigos migram sem perder itens. */
const RENAMED: Record<string, string> = { couro: 'sebo', pena: 'ovo' };

export function ensurePouch(game): Record<string, number> {
  const p = game.progress || (game.progress = {});
  p.ingredients = p.ingredients ?? {};
  for (const [old, neu] of Object.entries(RENAMED)) {
    if (p.ingredients[old] != null) {
      p.ingredients[neu] = (p.ingredients[neu] ?? 0) + p.ingredients[old];
      delete p.ingredients[old];
    }
  }
  return p.ingredients;
}

export function ingredientCount(game, id: string): number {
  return ensurePouch(game)[id] ?? 0;
}

export function addIngredient(game, id: string, n = 1): void {
  if (!INGREDIENTS[id]) return;
  const pouch = ensurePouch(game);
  pouch[id] = (pouch[id] ?? 0) + n;
  game.emit?.('ingredientGained', { id, n, total: pouch[id] });
}

/** Tem todos os ingredientes de uma receita? `inputs` = { id: qtd }. */
export function hasIngredients(game, inputs: Record<string, number>): boolean {
  const pouch = ensurePouch(game);
  return Object.entries(inputs).every(([id, q]) => (pouch[id] ?? 0) >= q);
}

/** Consome os ingredientes (só se houver todos). Devolve true no sucesso. */
export function consumeIngredients(game, inputs: Record<string, number>): boolean {
  if (!hasIngredients(game, inputs)) return false;
  const pouch = ensurePouch(game);
  for (const [id, q] of Object.entries(inputs)) pouch[id] -= q;
  return true;
}

/** Lista {def, count} dos ingredientes possuídos (para UI). */
export function pouchList(game): { def: IngredientDef; count: number }[] {
  const pouch = ensurePouch(game);
  return Object.keys(pouch)
    .filter((id) => pouch[id] > 0 && INGREDIENTS[id])
    .map((id) => ({ def: INGREDIENTS[id], count: pouch[id] }));
}
