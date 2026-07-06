/**
 * Modelos de dados do jogo, centralizados. A config de TS é lenient
 * (`strict: false`), então tipar é aditivo: estes tipos documentam e ajudam o
 * editor/typecheck a pegar erros (ex.: campo errado no save) sem exigir que
 * todo o código os adote de uma vez. Ver ADR 0021 (endurecimento de tipos).
 */

// --- Enums de domínio ------------------------------------------------------
export type Element = 'nature' | 'fire' | 'ice' | 'storm';
export type Rarity = 'common' | 'rare' | 'unique';
export type ItemType = 'weapon' | 'armor' | 'artifact' | 'consumable';
export type ArmorBonus = 'sapRegen' | 'health' | 'formDuration';
/** Peça anatômica de armadura (ADR 0087): elmo, peito, calças, botas. */
export type ArmorSlot = 'head' | 'body' | 'legs' | 'boots';
/** Família de arma corpo-a-corpo — base da especialização (ADR 0088). */
export type WeaponFamily = 'axe' | 'scythe' | 'claws' | 'staff';
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

/** Modificador de item (ADR 0088): afixo com id e magnitude por raridade. */
export interface Modifier {
  id: string;
  value: number;
}

export interface WeaponItem extends ItemBase {
  type: 'weapon';
  element: Element;
  damage: number;
  style: WeaponStyle;
  /** Família (machado/foice/garras/cajado) — dirige especialização. */
  family?: WeaponFamily;
  /** Alcance/semiângulo do golpe (apenas armas melee). */
  range?: number;
  arc?: number;
  mods?: Modifier[];
}

export interface ArmorItem extends ItemBase {
  type: 'armor';
  slot: ArmorSlot;
  armor: number;
  bonus: ArmorBonus;
  bonusValue: number;
  mods?: Modifier[];
}

export interface ArtifactItem extends ItemBase {
  type: 'artifact';
  ability: string;
  mods?: Modifier[];
}

/** Consumível (poção/comida): efeito instantâneo ou buff temporário. */
export interface ConsumableItem extends ItemBase {
  type: 'consumable';
  effect: string;
  magnitude: number;
  duration?: number;
  stack?: number;
  /** Comida (E18.3): buff temporário concedido ao consumir. */
  buff?: { kind: 'dmg' | 'speed' | 'taken'; pct: number; dur: number; icon: string; color: number };
}

export type Item = WeaponItem | ArmorItem | ArtifactItem | ConsumableItem;
/** Mapa de armadura por peça anatômica. */
export type ArmorSet = Record<ArmorSlot, ArmorItem | null>;

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
  armor: ArmorSet;
  artifacts: (Item | null)[];
  enchantPoints: number;
}

export interface Equipment {
  weapon: Item | null;
  armor: ArmorSet;
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
  /** ArmorSet (v2) ou Item único legado (v1) — migrado no load. */
  armor: ArmorSet | Item | null;
  artifacts: (Item | null)[];
  essence: number;
  items: Item[];
  hotbar?: (Item | null)[];
  proficiency?: Record<string, number>;
  skills?: Record<string, number>;
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
  /** Missões de vila (ADR 0047): status/progresso por quest. Opcional (v1 antigos). */
  quests?: Record<string, { status: 'available' | 'active' | 'done'; progress: number }>;
  /** Side quests por triggers (ADR 0096): estados + progresso do gatilho. */
  sideQuests?: { states: Record<string, { status: string; step: number }>; visited: string[]; forms: string[] } | null;
  /** Dons dos santuários (ADR 0050): form -> boonId. Opcional. */
  boons?: Record<string, string>;
  /** Reputação por vila (ADR 0108): settlementId -> pontos. Opcional. */
  reputation?: Record<string, number>;
  /** Buffs temporários ativos (ADR 0134/E19): salvos p/ resumir. Opcional. */
  buffs?: any[];
  players: PlayerSnapshot[];
}
