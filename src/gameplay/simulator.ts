/**
 * Simulador sintético (E40): um "jogador-robô" que joga o jogo DE VERDADE —
 * lê o estado do mundo (ECS), decide inputs (mover, mirar, atacar, esquivar,
 * explorar) e os injeta no Intent, exatamente como um humano faria pelo teclado.
 * Um coletor de métricas escuta os eventos de combate/loot e produz um relatório
 * de balanceamento (DPS causado/sofrido, abates/min, mortes, essência, drops).
 *
 * Tudo é puro/determinístico (RNG semeado, sem Math.random) e roda headless
 * (sem WebGL/DOM): serve tanto nos testes quanto acoplado ao jogo real.
 * Ver ADR 0173.
 */
import { C, Factions } from '../core/ecs/components.js';
import { playerControlSystem } from '../systems/playerControl.js';
import { aiSystem } from '../systems/ai.js';
import { movementSystem } from '../systems/movement.js';
import { projectileSystem } from '../systems/projectiles.js';
import { statusSystem } from '../systems/status.js';
import { pickupSystem } from '../systems/pickups.js';

/** RNG determinístico (mulberry32) — o jogo proíbe Math.random nos sistemas. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Forma de input igual à do `input.getPlayerInput` (contrato de `gatherInput`). */
export interface SimInput {
  moveX: number; moveZ: number;
  aimX: number; aimZ: number; hasAim: boolean; aimIsWorldPoint: boolean;
  attack: boolean; dodge: boolean;
  artifact: [boolean, boolean, boolean]; switchForm: number; interact: boolean;
}

function idleInput(): SimInput {
  return { moveX: 0, moveZ: 0, aimX: 0, aimZ: 1, hasAim: false, aimIsWorldPoint: false,
    attack: false, dodge: false, artifact: [false, false, false], switchForm: 0, interact: false };
}

/**
 * Estilo de jogo do robô (E41): mede cada forma de jogar separadamente.
 *  - `melee`       — corpo-a-corpo puro, sem esquiva (pior caso do melee).
 *  - `melee_dodge` — corpo-a-corpo que ESQUIVA o golpe telegrafado (rola p/ trás).
 *  - `ranged`      — mantém distância (kite) e ataca à distância; esquiva golpes.
 *  - `caster`      — como o ranged, e ainda dispara o artefato quando disponível.
 */
export type SimStyle = 'melee' | 'melee_dodge' | 'ranged' | 'caster';

export interface SimPlayerOpts {
  /** Estilo de jogo (default `melee`). */
  style?: SimStyle;
  /** Alcance para engajar um inimigo (u). */
  aggro?: number;
  /** Distância em que o robô ataca em vez de se aproximar (u), no melee. */
  strikeRange?: number;
  /** Distância-alvo mínima/máxima do kite (ranged/caster). */
  kiteMin?: number;
  kiteMax?: number;
  /**
   * Qualidade de reação (0..1): chance de o robô ESQUIVAR cada golpe telegrafado.
   * `1` = jogador perfeito (esquiva tudo, toma ~0 dano); `0` = nunca esquiva (piso);
   * `~0.6` = jogador médio. Só vale para estilos com esquiva (default 1).
   */
  reaction?: number;
}

/**
 * Cérebro do jogador sintético: caça o inimigo vivo mais próximo e o combate
 * conforme o ESTILO (melee/esquiva/ranged/caster); sem inimigos por perto,
 * EXPLORA em linha reta trocando de rumo a cada ~1 s. Determinístico por semente.
 */
export class SimPlayer {
  rng: () => number;
  style: SimStyle;
  aggro: number;
  strike: number;
  kiteMin: number;
  kiteMax: number;
  reaction: number;
  _exdx = 0; _exdz = 1; _exploreT = 0; _dodgeCd = 0; _artPulse = false;
  // Estado da reação: decide UMA vez por telégrafo se vai esquivar aquele golpe
  // (senão, rolar todo tick faria uma reação baixa ainda esquivar quase tudo).
  _reacting = false; _willDodge = false;
  constructor(seed = 1, opts: SimPlayerOpts = {}) {
    this.rng = mulberry32(seed);
    this.style = opts.style ?? 'melee';
    this.aggro = opts.aggro ?? (this.style === 'ranged' || this.style === 'caster' ? 22 : 16);
    this.strike = opts.strikeRange ?? 1.9;
    this.kiteMin = opts.kiteMin ?? 4.5;
    this.kiteMax = opts.kiteMax ?? 7.5;
    this.reaction = opts.reaction ?? 1;
  }

  /** Ataque no ponto-doce do combo (ADR 0092): 1º golpe ao zerar o cooldown,
   *  encadeamentos na janela boa (~75%). Vale p/ melee e projétil. */
  _comboReady(game: any, playerId: number): boolean {
    const pc = game.world.get(playerId, C.PlayerControlled);
    const timer = pc?.attackTimer ?? 0;
    const total = pc?.castTotal ?? 0;
    const p = total > 0 ? 1 - timer / total : 1;
    return timer <= 0 || p >= 0.72;
  }

  /** Esquiva o golpe telegrafado: inimigo em windup e no alcance, com dodge pronto.
   *  Reação imperfeita (E43): decide UMA vez por telégrafo (rng < reaction) se
   *  reage àquele golpe — modela um jogador médio, não um esquivador perfeito. */
  _shouldDodge(game: any, playerId: number, foe: any): boolean {
    const ai = game.world.get(foe.eid, C.AI);
    const threatened = !!(ai && ai.windup > 0 && foe.d <= (ai.attackRange ?? 1.5) + 1.1);
    if (!threatened) { this._reacting = false; return false; } // golpe passou: rearma p/ o próximo
    if (!this._reacting) { this._reacting = true; this._willDodge = this.rng() < this.reaction; } // rola 1x
    if (!this._willDodge) return false;                        // este golpe ele resolveu encarar
    if (this._dodgeCd > 0) return false;
    const pc = game.world.get(playerId, C.PlayerControlled);
    if ((pc?.dodgeTimer ?? 0) > 0) return false;
    return true;
  }

  /** Inimigo vivo mais próximo do jogador (facção ENEMY, não morto). */
  _nearestEnemy(game: any, tr: any) {
    let best: any = null, bd = Infinity;
    for (const [eid, fac, etr, hp] of game.world.query(C.Faction, C.Transform, C.Health)) {
      if (fac.team !== Factions.ENEMY || hp.dead) continue;
      const d = (etr.x - tr.x) * (etr.x - tr.x) + (etr.z - tr.z) * (etr.z - tr.z);
      if (d < bd) { bd = d; best = { eid, etr, d: Math.sqrt(d) }; }
    }
    return best;
  }

  /** Decide o input deste tick a partir do estado do mundo, conforme o estilo. */
  decide(game: any, playerId: number): SimInput {
    const inp = idleInput();
    const dt = game.dt ?? 1 / 60;
    this._dodgeCd = Math.max(0, this._dodgeCd - dt);
    const tr = game.world.get(playerId, C.Transform);
    if (!tr) return inp;

    const foe = this._nearestEnemy(game, tr);
    if (!foe || foe.d > this.aggro) {           // --- sem alvo: explora ---
      this._exploreT -= dt;
      if (this._exploreT <= 0) {
        const a = this.rng() * Math.PI * 2;
        this._exdx = Math.sin(a); this._exdz = Math.cos(a);
        this._exploreT = 1.0 + this.rng() * 0.8;
      }
      inp.moveX = this._exdx; inp.moveZ = this._exdz;
      inp.aimX = this._exdx; inp.aimZ = this._exdz; inp.hasAim = true;
      return inp;
    }

    const dx = foe.etr.x - tr.x, dz = foe.etr.z - tr.z;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len, uz = dz / len;
    inp.aimX = ux; inp.aimZ = uz; inp.hasAim = true;

    // Esquiva reativa (estilos com dodge): rola PARA TRÁS do golpe telegrafado.
    const dodges = this.style !== 'melee';
    if (dodges && this._shouldDodge(game, playerId, foe)) {
      inp.moveX = -ux; inp.moveZ = -uz; inp.dodge = true;
      this._dodgeCd = 0.5;
      return inp;
    }

    if (this.style === 'ranged' || this.style === 'caster') {
      // Kite: mantém a distância-alvo e ataca à distância.
      if (foe.d < this.kiteMin) { inp.moveX = -ux; inp.moveZ = -uz; }      // recua
      else if (foe.d > this.kiteMax) { inp.moveX = ux; inp.moveZ = uz; }   // aproxima
      if (foe.d <= this.aggro) inp.attack = this._comboReady(game, playerId);
      if (this.style === 'caster') {
        // Dispara o artefato do slot 0 quando puder (pulsado; cooldown/seiva gerem).
        this._artPulse = !this._artPulse;
        if (this._artPulse) inp.artifact = [true, false, false];
      }
      return inp;
    }

    // Melee / melee_dodge: aproxima e golpeia no combo.
    if (foe.d > this.strike) { inp.moveX = ux; inp.moveZ = uz; }
    else {
      inp.moveX = ux * 0.25; inp.moveZ = uz * 0.25;
      inp.attack = this._comboReady(game, playerId);
    }
    return inp;
  }
}

export interface SimReport {
  ticks: number; seconds: number;
  kills: number; deaths: number; survived: boolean;
  damageDealt: number; damageTaken: number;
  dps: number; dpsTaken: number; killsPerMin: number;
  essence: number; drops: number; dropsByRarity: Record<string, number>;
  netDisplacement: number;
}

/**
 * Coletor de métricas de balanceamento: escuta os eventos do jogo e agrega o
 * desempenho do jogador sintético num relatório derivado (DPS, abates/min, etc.).
 */
export class SimMetrics {
  playerId = -1;
  ticks = 0; seconds = 0;
  kills = 0; deaths = 0;
  damageDealt = 0; damageTaken = 0;
  essence = 0; drops = 0;
  dropsByRarity: Record<string, number> = {};

  attach(game: any, playerId: number) {
    this.playerId = playerId;
    // Atribuição robusta (numa sim solo, todo dano/abate num INIMIGO é do jogador):
    // os projéteis aplicam dano com `attackerId` = a entidade do projétil (não o
    // jogador), então casar só por attackerId perderia o dano ranged/caster.
    game.on('damage', (e: any) => {
      if (e.id === playerId) { this.damageTaken += e.amount ?? 0; return; }
      const fac = game.world.get(e.id, C.Faction);
      if (e.attackerId === playerId || fac?.team === Factions.ENEMY) this.damageDealt += e.amount ?? 0;
    });
    game.on('kill', (e: any) => { if (e.id !== playerId) this.kills += 1; });
    game.on('playerDowned', (e: any) => { if (e.id === playerId) this.deaths += 1; });
    game.on('essence', (e: any) => { this.essence += e.amount ?? 0; });
    game.on('itemPickup', (e: any) => {
      if (e.id != null && e.id !== playerId) return;
      this.drops += 1;
      const r = e.item?.rarity; if (r) this.dropsByRarity[r] = (this.dropsByRarity[r] ?? 0) + 1;
    });
    return this;
  }

  tick(dt: number) { this.ticks += 1; this.seconds += dt; }

  report(): SimReport {
    const s = Math.max(this.seconds, 1e-6);
    return {
      ticks: this.ticks, seconds: this.seconds,
      kills: this.kills, deaths: this.deaths, survived: this.deaths === 0,
      damageDealt: this.damageDealt, damageTaken: this.damageTaken,
      dps: this.damageDealt / s, dpsTaken: this.damageTaken / s,
      killsPerMin: this.kills / (s / 60),
      essence: this.essence, drops: this.drops, dropsByRarity: this.dropsByRarity,
      netDisplacement: 0,
    };
  }
}

/** Sistemas mínimos que resolvem exploração + combate headless (sem managers). */
export const DEFAULT_SIM_SYSTEMS = [
  playerControlSystem, aiSystem, movementSystem, projectileSystem, statusSystem, pickupSystem,
];

export interface RunSimOpts {
  playerId: number;
  ticks?: number;
  dt?: number;
  seed?: number;
  systems?: Array<(g: any, dt: number) => void>;
  player?: SimPlayer;
  metrics?: SimMetrics;
  playerOpts?: SimPlayerOpts;
}

/**
 * Roda a simulação headless: a cada tick o robô decide o input, ele é escrito no
 * Intent do jogador e a lista de sistemas é executada — como o loop do jogo, mas
 * dirigido pelo bot. Devolve o relatório de métricas (com deslocamento líquido).
 * Encerra cedo se o jogador morre.
 */
export function runSimulation(game: any, opts: RunSimOpts): SimReport {
  const { playerId } = opts;
  const dt = opts.dt ?? 1 / 60;
  const ticks = opts.ticks ?? 600;
  const systems = opts.systems ?? DEFAULT_SIM_SYSTEMS;
  const bot = opts.player ?? new SimPlayer(opts.seed ?? 1, opts.playerOpts);
  const metrics = (opts.metrics ?? new SimMetrics()).attach(game, playerId);

  const tr0 = game.world.get(playerId, C.Transform);
  const start = { x: tr0?.x ?? 0, z: tr0?.z ?? 0 };

  for (let i = 0; i < ticks; i++) {
    game.dt = dt;
    const intent = game.world.get(playerId, C.Intent);
    if (intent) Object.assign(intent, bot.decide(game, playerId));
    for (const sys of systems) sys(game, dt);
    game.tickScheduled?.(dt);
    game.world.flushDestroyed?.();
    metrics.tick(dt);
    const hp = game.world.get(playerId, C.Health);
    if (!hp || hp.dead) break;
  }

  const trN = game.world.get(playerId, C.Transform);
  const rep = metrics.report();
  rep.netDisplacement = Math.hypot((trN?.x ?? start.x) - start.x, (trN?.z ?? start.z) - start.z);
  return rep;
}

/**
 * Acopla o jogador sintético ao JOGO REAL: substitui o provedor de input do
 * jogador `index` pelo cérebro do bot, de modo que o loop normal do jogo
 * (`gatherInput`) passe a ser dirigido por ele. Devolve uma função que restaura
 * o input humano. Útil para rodar métricas no jogo de verdade (dev/telemetria).
 */
export function installSyntheticInput(game: any, playerId: number, opts: { index?: number; seed?: number; playerOpts?: SimPlayerOpts } = {}) {
  const index = opts.index ?? 0;
  const bot = new SimPlayer(opts.seed ?? 1, opts.playerOpts);
  const orig = game.input.getPlayerInput.bind(game.input);
  game.input.getPlayerInput = (i: number) => (i === index ? bot.decide(game, playerId) : orig(i));
  return () => { game.input.getPlayerInput = orig; };
}
