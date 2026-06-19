import { makeRng, weightedPick } from '../utils/math.js';
import { BALANCE } from '../data/balance.js';
import type { Item, ItemType, Rarity, RarityDef, EnchantDef, WeaponStyle } from '../types.js';

/**
 * Sistema de loot/itens inspirado no MC Dungeons: raridades, armas de
 * conjuração, armaduras e artefatos (que concedem habilidades), todos com
 * slots de encantamento. Ver docs/adr/0006-loot-enchant.md.
 */
export const RARITIES: Record<Rarity, RarityDef> = {
  common: { name: 'Comum', color: 0xd6d6d6, mul: 1.0, slots: 1, weight: 70 },
  rare: { name: 'Raro', color: 0x5aa0ff, mul: 1.35, slots: 2, weight: 26 },
  unique: { name: 'Único', color: 0xffc83a, mul: 1.8, slots: 3, weight: 4 },
};

// Armas corpo-a-corpo (foco do jogo): maioria do loot. `range`/`arc` dão
// variedade de alcance/abertura do golpe.
const MELEE_WEAPON_BASES = [
  { name: 'Foice da Vinha', element: 'nature', damage: 11, range: 2.4, arc: 1.0 },
  { name: 'Garras Ancestrais', element: 'nature', damage: 10, range: 1.8, arc: 1.2 },
  { name: 'Lâmina de Geada', element: 'ice', damage: 12, range: 2.2, arc: 0.7 },
  { name: 'Maça Trovejante', element: 'storm', damage: 13, range: 2.0, arc: 0.8 },
  { name: 'Presa em Brasa', element: 'fire', damage: 11, range: 1.9, arc: 0.9 },
];

// Cajados de conjuração (ranged): mais raros — atacam à distância. Ver ADR 0035.
const RANGED_WEAPON_BASES = [
  { name: 'Cajado de Carvalho', element: 'nature', damage: 9 },
  { name: 'Galho Tempestuoso', element: 'storm', damage: 10 },
  { name: 'Cajado em Brasa', element: 'fire', damage: 10 },
];

// Chance de uma arma sorteada ser de conjuração (ranged). Melee é o padrão.
const RANGED_WEAPON_CHANCE = 0.2;

const ARMOR_BASES = [
  { name: 'Manto de Folhas', armor: 0.08, bonus: 'sapRegen' },
  { name: 'Casca Viva', armor: 0.16, bonus: 'health' },
  { name: 'Pelagem Espiritual', armor: 0.12, bonus: 'formDuration' },
];

const ARTIFACT_BASES = [
  { name: 'Espinhos de Raiz', ability: 'root_spikes' },
  { name: 'Tocha Selvagem', ability: 'wildfire' },
  { name: 'Lança de Gelo', ability: 'ice_lance' },
  { name: 'Totem Curativo', ability: 'healing_totem' },
  { name: 'Trompa da Matilha', ability: 'pack_howl' },
  { name: 'Coroa de Espinhos', ability: 'thorn_burst' },
  { name: 'Pena do Vento', ability: 'gust' },
  { name: 'Semente Ardente', ability: 'meteor_sap' },
];

export const ENCHANTMENTS: Record<string, EnchantDef> = {
  fotossintese: { name: 'Fotossíntese', desc: 'Regenera vida ao ficar parado.', types: ['armor'] },
  matilha: { name: 'Matilha', desc: 'Invocações duram +50% e ganham vida.', types: ['armor'] },
  metamorfo: { name: 'Metamorfo', desc: 'Trocar de forma libera uma onda de dano.', types: ['armor'] },
  raizes: { name: 'Raízes Profundas', desc: 'Ataques têm chance de enraizar.', types: ['weapon'] },
  ferocidade: { name: 'Ferocidade', desc: '+25% de dano de ataque básico.', types: ['weapon'] },
  brasas: { name: 'Brasas', desc: 'Ataques aplicam queimadura.', types: ['weapon'] },
  vigor: { name: 'Vigor da Mata', desc: '+30 de vida máxima.', types: ['armor'] },
};

let _uid = 1;

function rollRarity(rng) {
  const key = weightedPick(
    Object.entries(RARITIES).map(([k, v]) => ({ key: k, weight: v.weight })),
    rng,
  ).key;
  return key;
}

function enchantsFor(type, slots, rng) {
  const pool = Object.entries(ENCHANTMENTS).filter(([, e]) => e.types.includes(type));
  const out = [];
  for (let i = 0; i < slots && pool.length; i++) {
    const idx = rng.int(0, pool.length - 1);
    const [id] = pool.splice(idx, 1)[0];
    out.push({ id, level: 0, max: 3 });
  }
  return out;
}

export function generateItem(
  level = 1,
  type: ItemType | null = null,
  seed: number | null = null,
  forceRarity: Rarity | null = null,
  forceStyle: WeaponStyle | null = null,
): Item {
  const rng = makeRng(seed ?? (Date.now() ^ (_uid++ * 2654435761)) >>> 0);
  type = type ?? rng.pick(['weapon', 'armor', 'artifact']);
  const rarityKey = forceRarity && RARITIES[forceRarity] ? forceRarity : rollRarity(rng);
  const rarity = RARITIES[rarityKey];
  const lvlMul = 1 + (level - 1) * 0.12;

  const item: any = { uid: _uid++, type, rarity: rarityKey, rarityColor: rarity.color, level, enchants: [] };

  if (type === 'weapon') {
    const style = forceStyle ?? (rng.chance(RANGED_WEAPON_CHANCE) ? 'ranged' : 'melee');
    const base = rng.pick(style === 'ranged' ? RANGED_WEAPON_BASES : MELEE_WEAPON_BASES);
    item.name = base.name;
    item.element = base.element;
    item.style = style;
    item.damage = Math.round(base.damage * rarity.mul * lvlMul);
    if (style === 'melee') { item.range = base.range; item.arc = base.arc; }
  } else if (type === 'armor') {
    const base = rng.pick(ARMOR_BASES);
    item.name = base.name;
    item.armor = +(base.armor * rarity.mul).toFixed(2);
    item.bonus = base.bonus;
    item.bonusValue = Math.round(20 * rarity.mul * lvlMul);
  } else {
    const base = rng.pick(ARTIFACT_BASES);
    item.name = base.name;
    item.ability = base.ability;
    item.power = +(rarity.mul * lvlMul).toFixed(2);
  }

  item.enchants = enchantsFor(type, rarity.slots, rng);
  item.power = item.power ?? rarity.mul;
  return item as Item;
}

export function rollDrops(lootTable, level: number, rng = Math.random): Item[] {
  const drops: Item[] = [];
  // Chance base de dropar um item.
  if (rng() < (lootTable?.dropChance ?? BALANCE.loot.defaultDropChance)) {
    drops.push(generateItem(level));
  }
  return drops;
}

export function salvageValue(item: Item): number {
  return { common: 2, rare: 5, unique: 12 }[item.rarity] ?? 1;
}
