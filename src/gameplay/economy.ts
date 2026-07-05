import { C } from '../core/ecs/components.js';
import { generateItem } from './loot.js';
import { generateConsumable } from './consumables.js';

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

/**
 * (Re)gera o estoque do mercador ativo: itens no nível da região + preço.
 * Cada mercador (hub e vilas — ADR 0047) tem estoque próprio: `setActiveShop`
 * troca `game.shopStock` pela entrada do mapa `_shopStocks`.
 */
export function rerollShop(game) {
  const lvl = game.regionLevel();
  const price = { common: 12, rare: 30, unique: 70 };
  // Lojas de interior (ADR 0094): armeiro só vende armas, armaduraria só peças.
  const bias = game._interiorBias?.[game.activeShopKey] ?? null;
  game.shopStock = [];
  // Estoque maior (ADR 0104): 5 equipamentos + 2 poções (cura pequena e grande).
  for (let i = 0; i < 5; i++) {
    const it = generateItem(lvl, bias);
    game.shopStock.push({ item: it, price: Math.round((price[it.rarity] ?? 12) * (1 + (lvl - 1) * 0.15)) });
  }
  game.shopStock.push({ item: generateConsumable('heal_s', lvl), price: Math.round(8 * (1 + (lvl - 1) * 0.1)) });
  game.shopStock.push({ item: generateConsumable('heal_l', lvl), price: Math.round(18 * (1 + (lvl - 1) * 0.1)) });
  if (game._shopStocks) game._shopStocks[game.activeShopKey ?? 'hub'] = game.shopStock;
  return game.shopStock;
}

/** Ativa o estoque do mercador `key` (gera sob demanda ao abrir a loja). */
export function setActiveShop(game, key) {
  game._shopStocks = game._shopStocks ?? {};
  if (game.activeShopKey !== key) {
    if (game.activeShopKey !== undefined && game.shopStock) game._shopStocks[game.activeShopKey] = game.shopStock;
    game.activeShopKey = key;
    game.shopStock = game._shopStocks[key] ?? null;
  }
}
