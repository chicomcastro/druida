/**
 * Modelos de dados do jogo, centralizados. A config de TS é lenient
 * (`strict: false`), então tipar é aditivo: estes tipos documentam e ajudam o
 * editor/typecheck a pegar erros (ex.: campo errado no save) sem exigir que
 * todo o código os adote de uma vez. Ver ADR 0021 (endurecimento de tipos).
 */

// --- Enums de domínio ------------------------------------------------------
export type Element = 'nature' | 'fire' | 'ice' | 'storm';
export type Rarity = 'common' | 'rare' | 'unique';
export type ItemType = 'weapon' | 'armor' | 'artifact';
export type ArmorBonus = 'sapRegen' | 'health' | 'formDuration';
export type FormId = 'humanoid' | 'wolf' | 'bear' | 'raven' | 'frog';
export type Team = 'player' | 'enemy' | 'neutral';
/** Estilo de arma: corpo-a-corpo (padrão) ou conjuração à distância (mais rara). */
export type WeaponStyle = 'melee' | 'ranged';

// --- Itens / loot ----------------------------------------------------------
export interface RarityDef {
  name: string;
  color: number;
  mul: number;
  slots: number;
  weight: number;
}

export interface EnchantDef {
  name: string;
  desc: string;
  types: ItemType[];
}

/** Instância de encantamento num item (nível investido / teto). */
export interface Enchant {
  id: string;
  level: number;
  max: number;
}

interface ItemBase {
  uid: number;
  type: ItemType;
  name: string;
  rarity: Rarity;
  rarityColor: number;
  level: number;
  enchants: Enchant[];
  power: number;
}

export interface WeaponItem extends ItemBase {
  type: 'weapon';
  element: Element;
  damage: number;
  style: WeaponStyle;
  /** Alcance/semiângulo do golpe (apenas armas melee). */
  range?: number;
  arc?: number;
}

export interface ArmorItem extends ItemBase {
  type: 'armor';
  armor: number;
  bonus: ArmorBonus;
  bonusValue: number;
}

export interface ArtifactItem extends ItemBase {
  type: 'artifact';
  ability: string;
}

export type Item = WeaponItem | ArmorItem | ArtifactItem;

// --- Formas do Druida ------------------------------------------------------
export interface FormDef {
  name: string;
  mesh: string;
  basic: string;
  attackCooldown: number;
  speedMul: number;
  sapPerSec: number;
  color: number;
  damageReduction?: number;
  flying?: boolean;
}

// --- Componentes ECS (dados puros) ----------------------------------------
export interface Vec2 {
  x: number;
  z: number;
}

export interface Transform {
  x: number;
  z: number;
  y: number;
  rot: number;
}

export interface Velocity {
  vx: number;
  vz: number;
  speed: number;
}

export interface Health {
  hp: number;
  max: number;
  dead: boolean;
  invuln: number;
}

export interface Sap {
  value: number;
  max: number;
  regen: number;
}

export interface Collider {
  radius: number;
  solid: boolean;
}

export interface Faction {
  team: Team;
}

export interface StatusEffects {
  burn: number;
  freeze: number;
  poison: number;
  root: number;
  stun: number;
}

export interface Cooldowns {
  map: Record<string, number>;
}

export interface Form {
  current: FormId;
  list: FormId[];
  swapFlash?: number;
}

export interface Loadout {
  weapon: Item | null;
  armor: Item | null;
  artifacts: (Item | null)[];
  enchantPoints: number;
}

export interface Equipment {
  weapon: Item | null;
  armor: Item | null;
  artifacts: (Item | null)[];
  mitigation?: number;
}

export interface Inventory {
  items: Item[];
  essence: number;
}

// --- Save ------------------------------------------------------------------
export interface PlayerSnapshot {
  index: number;
  forms: FormId[];
  weapon: Item | null;
  armor: Item | null;
  artifacts: (Item | null)[];
  essence: number;
  items: Item[];
}

/** Schema do save, versionado por `v` para migração futura. */
export interface SaveV1 {
  v: 1;
  ts: number;
  seed: number;
  groupCenter: Vec2 | null;
  checkpoint: Vec2 | null;
  progress: { xp: number; level: number; enchantPoints: number };
  story: { step: number; kills: number; spawned: Record<string, boolean> };
  fog: string[];
  chest: Item[];
  camps: string[];
  lore: string[];
  players: PlayerSnapshot[];
}
