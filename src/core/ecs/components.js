/**
 * Fábricas de componentes (dados puros). Centralizar aqui mantém os nomes de
 * tipo consistentes entre sistemas. O "tipo" do componente é a string usada
 * em world.add/get/query; exportamos constantes para evitar typos.
 */

export const C = {
  Transform: 'Transform',
  Velocity: 'Velocity',
  Renderable: 'Renderable',
  Health: 'Health',
  Sap: 'Sap',
  PlayerControlled: 'PlayerControlled',
  Intent: 'Intent',
  Collider: 'Collider',
  Faction: 'Faction',
  AI: 'AI',
  Attack: 'Attack',
  Hitbox: 'Hitbox',
  Lifetime: 'Lifetime',
  StatusEffects: 'StatusEffects',
  Form: 'Form',
  Loadout: 'Loadout',
  Cooldowns: 'Cooldowns',
  Inventory: 'Inventory',
  Equipment: 'Equipment',
  LootTable: 'LootTable',
  Pickup: 'Pickup',
  Summon: 'Summon',
  Boss: 'Boss',
  Npc: 'Npc',
  Interactable: 'Interactable',
  Knockback: 'Knockback',
  Tint: 'Tint',
};

export const Factions = { PLAYER: 'player', ENEMY: 'enemy', NEUTRAL: 'neutral' };

export const Transform = (x = 0, z = 0, rot = 0) => ({ x, z, y: 0, rot });
export const Velocity = (vx = 0, vz = 0, speed = 5) => ({ vx, vz, speed });

export const Health = (max = 100) => ({ hp: max, max, dead: false, invuln: 0 });

export const Sap = (max = 100) => ({ value: max * 0.4, max, regen: 14 });

export const Collider = (radius = 0.5, solid = true) => ({ radius, solid });

export const Faction = (team = Factions.NEUTRAL) => ({ team });

export const Intent = () => ({
  moveX: 0,
  moveZ: 0,
  aimX: 0,
  aimZ: 1,
  attack: false,
  dodge: false,
  artifact: [false, false, false],
  switchForm: 0, // 0 = nenhum; 1..n = índice de forma
  interact: false,
});

export const StatusEffects = () => ({
  burn: 0,
  freeze: 0, // fator de slow restante (s)
  poison: 0,
  root: 0,
  stun: 0,
});

export const Cooldowns = () => ({ map: {} });
