/**
 * Plantação (E20 — Farming). A vila tem uma plantaçãozinha: em vez de só
 * forragear no mundo (E19.3), o jogador pode **semear** um canteiro, esperar a
 * cultura **crescer** e **colher** o ingrediente. Fecha o ciclo da culinária —
 * uma fonte renovável e planejável de ingredientes vegetais, ao lado do
 * forrageamento (achado) e do mercador (comprado).
 *
 * Tudo em data e em funções puras (testável). O estado — sementes na despensa e
 * o que cada canteiro tem plantado — vive em `game.progress`, então persiste no
 * save junto do resto do progresso. O relógio de crescimento é acumulado por
 * canteiro (segundos), não a hora absoluta do mundo (que reinicia por sessão).
 */

import { addIngredient, INGREDIENTS } from './ingredients.js';

export interface CropDef {
  id: string;
  /** Nome da cultura madura. */
  name: string;
  /** Nome da semente (na loja/despensa). */
  seedName: string;
  /** Ícone da cultura/produto (o mesmo do ingrediente colhido). */
  icon: string;
  /** Ícone da semente. */
  seedIcon: string;
  /** Ingrediente produzido ao colher (id em INGREDIENTS). */
  yields: string;
  /** Quantidade colhida por canteiro maduro. */
  yieldQty: number;
  /** Segundos até amadurecer (~7 min = 1 dia; culturas levam 1–2 min). */
  growTime: number;
  /** Preço da semente no mercador (E20.3). */
  price: number;
}

/**
 * Culturas plantáveis: as hortaliças que fazem sentido num quintal de vila
 * (as demais continuam só forrageáveis/dropáveis). Cada uma rende o ingrediente
 * homônimo da despensa (E19.1).
 */
export const CROPS: Record<string, CropDef> = {
  erva: { id: 'erva', name: 'Erva Silvestre', seedName: 'Semente de Erva', icon: '🌿', seedIcon: '🌱', yields: 'erva', yieldQty: 2, growTime: 60, price: 2 },
  cenoura: { id: 'cenoura', name: 'Cenoura', seedName: 'Semente de Cenoura', icon: '🥕', seedIcon: '🌱', yields: 'cenoura', yieldQty: 2, growTime: 90, price: 3 },
  cogumelo: { id: 'cogumelo', name: 'Cogumelo', seedName: 'Esporo de Cogumelo', icon: '🍄', seedIcon: '🌰', yields: 'cogumelo', yieldQty: 3, growTime: 120, price: 3 },
};

/** Toda cultura precisa render um ingrediente conhecido (guarda de dados). */
export function cropsAreValid(): boolean {
  return Object.values(CROPS).every((c) => !!INGREDIENTS[c.yields] && c.growTime > 0 && c.yieldQty > 0);
}

export const cropById = (id: string): CropDef | undefined => CROPS[id];

// --- Sementes (despensa) ---------------------------------------------------

export function ensureSeeds(game): Record<string, number> {
  const p = game.progress || (game.progress = {});
  p.seeds = p.seeds ?? {};
  return p.seeds;
}

export function seedCount(game, cropId: string): number {
  return ensureSeeds(game)[cropId] ?? 0;
}

export function addSeed(game, cropId: string, n = 1): void {
  if (!CROPS[cropId]) return;
  const seeds = ensureSeeds(game);
  seeds[cropId] = (seeds[cropId] ?? 0) + n;
  game.emit?.('seedGained', { id: cropId, n, total: seeds[cropId] });
}

export function hasSeed(game, cropId: string): boolean {
  return seedCount(game, cropId) > 0;
}

/** Consome 1 semente (só se houver). Devolve true no sucesso. */
export function consumeSeed(game, cropId: string): boolean {
  const seeds = ensureSeeds(game);
  if ((seeds[cropId] ?? 0) <= 0) return false;
  seeds[cropId] -= 1;
  return true;
}

/** Lista {crop, count} das sementes possuídas (para UI). */
export function seedList(game): { crop: CropDef; count: number }[] {
  const seeds = ensureSeeds(game);
  return Object.keys(seeds)
    .filter((id) => seeds[id] > 0 && CROPS[id])
    .map((id) => ({ crop: CROPS[id], count: seeds[id] }));
}

/** Sementes iniciais (uma vez): dá o que semear na primeira visita ao canteiro. */
export function grantStarterSeeds(game): void {
  const p = game.progress || (game.progress = {});
  if (p._starterSeeds) return;
  p._starterSeeds = true;
  addSeed(game, 'erva', 3);
  addSeed(game, 'cenoura', 2);
}

// --- Canteiros -------------------------------------------------------------

export interface PlotState { crop: string; growth: number }

export function ensurePlots(game): Record<string, PlotState> {
  const p = game.progress || (game.progress = {});
  p.plots = p.plots ?? {};
  return p.plots;
}

/** Estado de um canteiro (ou null se vazio). */
export function plotState(game, plotId: string): PlotState | null {
  return ensurePlots(game)[plotId] ?? null;
}

/** Planta uma cultura num canteiro vazio, consumindo 1 semente. */
export function plantPlot(game, plotId: string, cropId: string): boolean {
  if (!CROPS[cropId]) return false;
  const plots = ensurePlots(game);
  if (plots[plotId]) return false; // já ocupado
  if (!consumeSeed(game, cropId)) return false; // sem semente
  plots[plotId] = { crop: cropId, growth: 0 };
  game.emit?.('planted', { plotId, crop: cropId });
  return true;
}

/** Progresso de crescimento em [0,1] (0 recém-plantado, 1 maduro). */
export function plotProgress(game, plotId: string): number {
  const st = plotState(game, plotId);
  if (!st) return 0;
  const crop = CROPS[st.crop];
  if (!crop) return 0;
  return Math.min(1, st.growth / crop.growTime);
}

/** Estágio visual 0–3 (semeado → broto → crescendo → maduro). */
export function plotStage(game, plotId: string): number {
  return Math.min(3, Math.floor(plotProgress(game, plotId) * 4));
}

export function plotReady(game, plotId: string): boolean {
  return plotProgress(game, plotId) >= 1;
}

/** Avança o crescimento de todos os canteiros plantados (system por frame). */
export function tickFarming(game, dt: number): void {
  const plots = ensurePlots(game);
  for (const id of Object.keys(plots)) {
    const st = plots[id];
    const crop = CROPS[st?.crop];
    if (!st || !crop) continue;
    if (st.growth < crop.growTime) {
      st.growth = Math.min(crop.growTime, st.growth + dt);
      if (st.growth >= crop.growTime) game.emit?.('cropReady', { plotId: id, crop: st.crop });
    }
  }
}

/**
 * Colhe um canteiro maduro: credita o ingrediente na despensa e esvazia o
 * canteiro. Devolve o CropDef colhido (ou null se ainda não está pronto).
 */
export function harvestPlot(game, plotId: string): CropDef | null {
  if (!plotReady(game, plotId)) return null;
  const plots = ensurePlots(game);
  const st = plots[plotId];
  const crop = CROPS[st.crop];
  if (!crop) return null;
  addIngredient(game, crop.yields, crop.yieldQty);
  delete plots[plotId];
  game.emit?.('harvested', { plotId, crop: crop.id, yields: crop.yields, qty: crop.yieldQty });
  return crop;
}
