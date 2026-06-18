import { C } from '../core/ecs/components.js';
import { generateItem } from './loot.js';

/**
 * Economia do grupo: essência compartilhada e estoque do mercador (extraído de
 * `Game` — ADR 0033). Funções puras sobre `game`; `Game` mantém métodos finos
 * que delegam, preservando a API usada por HUD/menus/testes. Ver ADR 0016.
 */

/** Soma a essência de todas as mochilas (essência é do grupo). */
export function partyEssence(game) {
  let e = 0;
  for (const [, inv] of game.world.query(C.Inventory)) e += inv.essence;
  return e;
}

/** Gasta essência do grupo (deduz das mochilas em ordem). */
export function spendEssence(game, amount) {
  if (partyEssence(game) < amount) return false;
  let left = amount;
  for (const [, inv] of game.world.query(C.Inventory)) {
    if (left <= 0) break;
    const take = Math.min(inv.essence, left);
    inv.essence -= take;
    left -= take;
  }
  return true;
}

/** Adiciona um item à mochila do jogador 1 (alvo de compras/saques). */
export function giveItem(game, item) {
  for (const [id, pc] of game.world.query(C.PlayerControlled, C.Inventory)) {
    if (pc.index === 0) { game.world.get(id, C.Inventory).items.push(item); return true; }
  }
  return false;
}

/** (Re)gera o estoque do mercador: itens no nível da região + preço. */
export function rerollShop(game) {
  const lvl = game.regionLevel();
  const price = { common: 12, rare: 30, unique: 70 };
  game.shopStock = [];
  for (let i = 0; i < 4; i++) {
    const it = generateItem(lvl);
    game.shopStock.push({ item: it, price: Math.round((price[it.rarity] ?? 12) * (1 + (lvl - 1) * 0.15)) });
  }
  return game.shopStock;
}
