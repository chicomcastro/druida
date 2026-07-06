import { C } from '../core/ecs/components.js';
import { generateItem } from './loot.js';
import { generateConsumable, generateFood, FOOD_BASES } from './consumables.js';
import { INGREDIENTS, consumeIngredients } from './ingredients.js';
import { CROPS } from './farming.js';
import { repDiscount, shopSettlement } from './reputation.js';

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

/** Preço de venda de 1 ingrediente (E19.4). */
export const INGREDIENT_SELL = 2;

/** Vende 1 ingrediente da despensa, creditando essência ao P1. */
export function sellIngredient(game, id: string, price = INGREDIENT_SELL): boolean {
  if (!consumeIngredients(game, { [id]: 1 })) return false;
  for (const [pid, pc] of game.world.query(C.PlayerControlled)) {
    if (pc.index === 0) { game.world.get(pid, C.Inventory).essence += price; return true; }
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
 * Categoria da loja ativa (E21.2): define o QUE cada mercador vende, para dar
 * profundidade à vila — armeiro/armadureiro só equipamento, cozinheiro só
 * comida/ingredientes, jardineiro só sementes; o mercado geral segue variado.
 * Deriva de `_interiorKind` (food/garden) ou do viés de equipamento (weapon/
 * armor); sem nenhum, é 'general'.
 */
export function shopCategory(game): 'weapon' | 'armor' | 'food' | 'garden' | 'general' {
  const key = game.activeShopKey;
  const kind = game._interiorKind?.[key];
  if (kind === 'food' || kind === 'garden') return kind;
  const bias = game._interiorBias?.[key];
  if (bias === 'weapon') return 'weapon';
  if (bias === 'armor') return 'armor';
  return 'general';
}

/**
 * (Re)gera o estoque do mercador ativo conforme sua categoria (E21.2): itens no
 * nível da região + preço. Cada mercador (hub e vilas — ADR 0047) tem estoque
 * próprio: `setActiveShop` troca `game.shopStock` pela entrada de `_shopStocks`.
 */
export function rerollShop(game) {
  const lvl = game.regionLevel();
  const price = { common: 12, rare: 30, unique: 70 };
  // Desconto por reputação da vila (ADR 0108): 0/5/10% conforme os marcos.
  const settlement = shopSettlement(game.activeShopKey);
  const disc = settlement ? repDiscount(game, settlement) : 0;
  const tag = (p) => Math.max(1, Math.round(p * (1 - disc)));
  const cat = shopCategory(game);
  const stock: any[] = [];
  const equip = (bias, n) => {
    for (let i = 0; i < n; i++) {
      const it = generateItem(lvl, bias);
      stock.push({ item: it, price: tag((price[it.rarity] ?? 12) * (1 + (lvl - 1) * 0.15)) });
    }
  };
  const potions = () => {
    stock.push({ item: generateConsumable('heal_s', lvl), price: tag(8 * (1 + (lvl - 1) * 0.1)) });
    stock.push({ item: generateConsumable('heal_l', lvl), price: tag(18 * (1 + (lvl - 1) * 0.1)) });
  };
  const ingredients = (n) => {
    const ids = Object.keys(INGREDIENTS);
    for (let i = 0; i < n; i++) {
      const def = INGREDIENTS[ids[Math.floor(Math.random() * ids.length)]];
      stock.push({ ingredient: def.id, name: def.name, icon: def.icon, price: tag(3) });
    }
  };
  const foods = (n) => {
    const ks = Object.keys(FOOD_BASES);
    for (let i = 0; i < n; i++) {
      const fk = ks[Math.floor(Math.random() * ks.length)] as keyof typeof FOOD_BASES;
      stock.push({ item: generateFood(fk, lvl), price: tag(12 * (1 + (lvl - 1) * 0.1)) });
    }
  };
  const seeds = (n) => {
    const ids = Object.keys(CROPS);
    for (let i = 0; i < n; i++) {
      const c = CROPS[ids[Math.floor(Math.random() * ids.length)]];
      stock.push({ seed: c.id, name: c.seedName, icon: c.seedIcon, price: tag(c.price) });
    }
  };
  if (cat === 'weapon') { equip('weapon', 5); potions(); }
  else if (cat === 'armor') { equip('armor', 5); potions(); }
  else if (cat === 'food') { foods(2); ingredients(4); potions(); }        // cozinheiro na taverna
  else if (cat === 'garden') { seeds(3); ingredients(2); }                 // jardineiro
  else { equip(null, 5); potions(); ingredients(3); foods(1); seeds(2); }  // mercado geral (variado)
  game.shopStock = stock;
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
