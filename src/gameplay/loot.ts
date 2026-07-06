import { makeRng, weightedPick } from '../utils/math.js';
import { BALANCE } from '../data/balance.js';
import type { Item, ItemType, Rarity, RarityDef, EnchantDef, WeaponStyle, ArmorSlot, ArmorSet, WeaponFamily } from '../types.js';
import { MODIFIERS, rollModifiers } from './modifiers.js';
import { generateConsumable } from './consumables.js';

/**
 * Sistema de loot/itens inspirado no MC Dungeons: raridades, armas de
 * conjuração, armaduras anatômicas (elmo/peito/calças/botas) e artefatos,
 * todos com slots de encantamento e modificadores por raridade.
 * Ver docs/adr/0006-loot-enchant.md e 0087/0088.
 */
export const RARITIES: Record<Rarity, RarityDef> = {
  common: { name: 'Comum', color: 0xd6d6d6, mul: 1.0, slots: 1, weight: 70 },
  rare: { name: 'Raro', color: 0x5aa0ff, mul: 1.35, slots: 2, weight: 26 },
  unique: { name: 'Único', color: 0xffc83a, mul: 1.8, slots: 3, weight: 4 },
};

/** Nº de modificadores por raridade (ADR 0088). */
export const RARITY_MODS: Record<Rarity, number> = { common: 0, rare: 1, unique: 2 };

export const ARMOR_SLOTS: ArmorSlot[] = ['head', 'body', 'legs', 'boots'];
/** ArmorSet vazio (helper de init/migração). */
export function emptyArmor(): ArmorSet {
  return { head: null, body: null, legs: null, boots: null };
}

// Armas corpo-a-corpo por FAMÍLIA (ADR 0088): machado (pesado/curto), foice
// (amplo), garras (rápido/estreito). `range`/`arc` dão o toque de cada uma.
const MELEE_WEAPON_BASES: { name: string; element: string; family: WeaponFamily; damage: number; range: number; arc: number }[] = [
  { name: 'Machado da Clareira', element: 'nature', family: 'axe', damage: 14, range: 2.0, arc: 0.7 },
  { name: 'Machado de Geada', element: 'ice', family: 'axe', damage: 15, range: 2.0, arc: 0.6 },
  { name: 'Foice da Vinha', element: 'nature', family: 'scythe', damage: 11, range: 2.6, arc: 1.1 },
  { name: 'Foice Trovejante', element: 'storm', family: 'scythe', damage: 12, range: 2.5, arc: 1.0 },
  { name: 'Garras Ancestrais', element: 'nature', family: 'claws', damage: 9, range: 1.7, arc: 1.3 },
  { name: 'Garras em Brasa', element: 'fire', family: 'claws', damage: 10, range: 1.7, arc: 1.2 },
];

// Cajados de conjuração (ranged): mais raros — atacam à distância. Ver ADR 0035.
const RANGED_WEAPON_BASES: { name: string; element: string; family: WeaponFamily; damage: number }[] = [
  { name: 'Cajado de Carvalho', element: 'nature', family: 'staff', damage: 9 },
  { name: 'Galho Tempestuoso', element: 'storm', family: 'staff', damage: 10 },
  { name: 'Cajado em Brasa', element: 'fire', family: 'staff', damage: 10 },
];

// Chance de uma arma sorteada ser de conjuração (ranged). Melee é o padrão.
const RANGED_WEAPON_CHANCE = 0.2;

// Armaduras por PEÇA anatômica (ADR 0087): o peito carrega a maior fração de
// mitigação; elmo/calças/botas complementam. Cada peça tem seu tema/bônus.
const ARMOR_BASES: Record<ArmorSlot, { name: string; armor: number; bonus: string }[]> = {
  head: [
    { name: 'Capuz de Folhas', armor: 0.05, bonus: 'sapRegen' },
    { name: 'Elmo de Casca', armor: 0.07, bonus: 'health' },
    { name: 'Coroa Espiritual', armor: 0.06, bonus: 'formDuration' },
  ],
  body: [
    { name: 'Manto de Folhas', armor: 0.10, bonus: 'sapRegen' },
    { name: 'Peitoral de Casca', armor: 0.16, bonus: 'health' },
    { name: 'Pelagem Espiritual', armor: 0.12, bonus: 'formDuration' },
  ],
  legs: [
    { name: 'Calças de Vinha', armor: 0.06, bonus: 'sapRegen' },
    { name: 'Grevas de Casca', armor: 0.09, bonus: 'health' },
    { name: 'Perneiras Espirituais', armor: 0.07, bonus: 'formDuration' },
  ],
  boots: [
    { name: 'Botas de Musgo', armor: 0.04, bonus: 'sapRegen' },
    { name: 'Botas de Casca', armor: 0.06, bonus: 'health' },
    { name: 'Cascos Espirituais', armor: 0.05, bonus: 'formDuration' },
  ],
};

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
  forceSlot: ArmorSlot | null = null,
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
    item.family = base.family;
    item.style = style;
    item.damage = Math.round(base.damage * rarity.mul * lvlMul);
    if (style === 'melee') { item.range = (base as any).range; item.arc = (base as any).arc; }
  } else if (type === 'armor') {
    const slot = forceSlot ?? rng.pick(ARMOR_SLOTS);
    const base = rng.pick(ARMOR_BASES[slot]);
    item.name = base.name;
    item.slot = slot;
    item.armor = +(base.armor * rarity.mul).toFixed(3);
    item.bonus = base.bonus;
    item.bonusValue = Math.round(20 * rarity.mul * lvlMul);
  } else {
    const base = rng.pick(ARTIFACT_BASES);
    item.name = base.name;
    item.ability = base.ability;
    item.power = +(rarity.mul * lvlMul).toFixed(2);
  }

  item.enchants = enchantsFor(type, rarity.slots, rng);
  // Modificadores por raridade (ADR 0088): 0/1/2 afixos de gameplay.
  item.mods = rollModifiers(type, RARITY_MODS[rarityKey], level, rng);
  item.power = item.power ?? rarity.mul;
  return item as Item;
}

export { MODIFIERS };

export function rollDrops(lootTable, level: number, rng = Math.random): Item[] {
  const drops: Item[] = [];
  // Chance base de dropar um item.
  if (rng() < (lootTable?.dropChance ?? BALANCE.loot.defaultDropChance)) {
    drops.push(generateItem(level));
  }
  // Chance menor de dropar uma poção de cura (ADR 0089).
  if (rng() < (lootTable?.potionChance ?? 0.1)) {
    drops.push(generateConsumable('heal_s', level));
  }
  // Comida pronta não cai mais de inimigos (E19): eles soltam ingredientes
  // (tratado no handler de 'kill'), que viram comida na cozinha.
  return drops;
}

export function salvageValue(item: Item): number {
  if (item.type === 'consumable') return 1;
  return { common: 2, rare: 5, unique: 12 }[item.rarity] ?? 1;
}
