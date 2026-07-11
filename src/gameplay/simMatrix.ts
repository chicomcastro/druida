/**
 * Matriz de simulação (E41): roda o jogador-robô em MUITOS cenários e mede o
 * balanceamento de cada um — estilo de jogo × inimigo × quantidade × nível ×
 * equipamento. Serve para descobrir onde o jogo está fácil/difícil demais e para
 * travar faixas-alvo no CI (canary de ritmo). Ver ADR 0173/E41.
 *
 * É desacoplado do harness de teste: `runScenario` recebe uma fábrica
 * `spawnGame()` que devolve `{ game, playerId }` — os testes passam o makeGame
 * real; um script/nó pode passar a sua. Assim `src/` não importa `tests/`.
 */
import { C } from '../core/ecs/components.js';
import { generateItem, ARMOR_SLOTS } from './loot.js';
import { promoteToElite } from './spawn.js';
import { bossSystem } from '../systems/boss.js';
import { SimPlayer, SimMetrics, DEFAULT_SIM_SYSTEMS, type SimStyle } from './simulator.js';

export interface Scenario {
  style: SimStyle;
  enemy: string;
  count?: number;
  level?: number;
  seed?: number;
  ticks?: number;
  /** Qualidade de reação da esquiva (0..1); ver SimPlayer.reaction. Default 1. */
  reaction?: number;
  /** Forma ancestral a medir (ex.: 'wolf', 'bear'); concede+ativa antes da luta. */
  form?: string;
  /** Veste um set de armadura no tier do nível (piso "com gear", E49). Default false. */
  armor?: boolean;
  /** Raridade da armadura ('common'|'rare'|'unique') — mais alta = afixos (E52). Default 'common'. */
  armorRarity?: string;
  /** Dons de santuário ativos (ids, ex.: ['casca']) — modela endgame (E52). */
  boons?: string[];
  /** `enemy` é uma chave de CHEFE (BOSSES); spawna 1 chefe + roda o bossSystem (E53). */
  boss?: boolean;
  /** Promove cada inimigo do pack a ELITE com este afixo (petreo/volatil/sanguessuga, E53). */
  eliteAffix?: string;
}

export interface ScenarioResult extends Scenario {
  count: number; level: number;
  /** Tempo (s) até TODOS os inimigos morrerem; `null` se não limpou. */
  ttk: number | null;
  /** O jogador sobreviveu ao cenário. */
  survived: boolean;
  /** Fração de vida do jogador ao fim (0..1) — proxy de dificuldade. */
  hpLeftFrac: number;
  dps: number;
  dmgTaken: number;
  /** Rótulo de dificuldade derivado (ver `rateDifficulty`). */
  rating: Difficulty;
}

export type Difficulty = 'trivial' | 'fácil' | 'médio' | 'difícil' | 'brutal' | 'letal';

/** Equipa o jogador conforme o estilo (arma melee ou ranged no tier do nível). */
export function equipForStyle(game: any, playerId: number, style: SimStyle, level = 1) {
  const ranged = style === 'ranged' || style === 'caster';
  const seed = (ranged ? 300 : 100) + level;
  game.equip(playerId, generateItem(level, 'weapon', seed, null, ranged ? 'ranged' : 'melee'));
}

/**
 * Veste um set completo de armadura no tier do nível (E49). O piso do simulador
 * lutava PELADO — o que subestima o jogador no meio do jogo (a armadura dá
 * mitigação + vida que escalam com o gear). Rarity fixa 'common' (o gear mais
 * fraco possível) para uma medição determinística e CONSERVADORA: se até armadura
 * comum já cobre o vale, um jogador de verdade (que acha peças raras) cobre mais.
 */
export function equipArmorSet(game: any, playerId: number, level = 1, rarity: string = 'common') {
  // Rarity mais alta traz afixos (Vitalidade/Baluarte…): common 0, rare 1,
  // unique 2 afixos por peça (E52) — modela do jogador cru ao endgame kitado.
  for (let s = 0; s < ARMOR_SLOTS.length; s++) {
    const slot = ARMOR_SLOTS[s];
    game.equip(playerId, generateItem(level, 'armor', 700 + level * 7 + s * 13, rarity as any, null, slot), slot);
  }
}

/** Cria `count` inimigos ao redor do jogador (na origem), espalhados em anel. */
export function spawnPack(game: any, key: string, count: number, radius = 4): number[] {
  const ids: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const id = game.spawnEnemyByKey(key, 2 + Math.cos(a) * radius, Math.sin(a) * radius);
    if (id != null) ids.push(id);
  }
  return ids;
}

/**
 * Classifica a dificuldade de um cenário pela sobrevivência + vida restante +
 * tempo de limpeza. A meta (E42) é a MÉDIA ficar em "médio" e ninguém "trivial";
 * packs (3+) devem puxar para "difícil".
 */
export function rateDifficulty(r: { survived: boolean; hpLeftFrac: number; ttk: number | null }): Difficulty {
  if (!r.survived || r.ttk == null) return 'letal';
  if (r.hpLeftFrac >= 0.92 && r.ttk <= 1.2) return 'trivial';
  if (r.hpLeftFrac >= 0.8) return 'fácil';
  if (r.hpLeftFrac >= 0.55) return 'médio';
  if (r.hpLeftFrac >= 0.3) return 'difícil';
  return 'brutal';
}

/** Roda um cenário e devolve as métricas de balanceamento. */
export function runScenario(spawnGame: () => { game: any; playerId: number }, sc: Scenario): ScenarioResult {
  const count = sc.count ?? 1;
  const level = sc.level ?? 1;
  const ticks = sc.ticks ?? (sc.boss ? 12000 : 5400); // chefe: teto maior (200 s)
  const { game, playerId } = spawnGame();
  game.progress.level = level;
  // Dons de santuário (E52): setados ANTES de equipar — o applyEquipment lê
  // game.boons (ex.: 'casca' dá +20% de vida máx). Chave arbitrária, valor = id.
  if (sc.boons?.length) game.boons = Object.fromEntries(sc.boons.map((b, i) => [`b${i}`, b]));
  equipForStyle(game, playerId, sc.style, level);
  if (sc.armor) equipArmorSet(game, playerId, level, sc.armorRarity ?? 'common'); // gear (E49/E52)
  // Forma ancestral (E44): concede+ativa a forma antes da luta. As formas usam o
  // ataque próprio (mordida/patada) e se sustentam com a seiva que o golpe rende.
  if (sc.form && sc.form !== 'humanoid') {
    const f = game.world.get(playerId, C.Form);
    if (f) { if (!f.list.includes(sc.form)) f.list.push(sc.form); f.current = sc.form; }
  }
  // Alvos: chefe único (roda o bossSystem), pack de elites, ou pack comum.
  let foes: number[];
  if (sc.boss) {
    const id = game.spawnBossByKey(sc.enemy, 6, 0);
    foes = id != null ? [id] : [];
  } else {
    foes = spawnPack(game, sc.enemy, count);
    if (sc.eliteAffix) for (const id of foes) promoteToElite(game, id, sc.eliteAffix);
  }
  const systems = sc.boss ? [...DEFAULT_SIM_SYSTEMS, bossSystem] : DEFAULT_SIM_SYSTEMS;

  const bot = new SimPlayer(sc.seed ?? 1, { style: sc.style, reaction: sc.reaction });
  const metrics = new SimMetrics().attach(game, playerId);
  let clearedAt = -1;
  for (let i = 0; i < ticks; i++) {
    game.dt = 1 / 60;
    const intent = game.world.get(playerId, C.Intent);
    if (intent) Object.assign(intent, bot.decide(game, playerId));
    for (const s of systems) s(game, 1 / 60);
    game.tickScheduled?.(1 / 60);
    game.world.flushDestroyed?.();
    metrics.tick(1 / 60);
    const alive = foes.some((e) => { const h = game.world.get(e, C.Health); return h && !h.dead; });
    if (!alive) { clearedAt = i; break; }
    const php = game.world.get(playerId, C.Health);
    if (!php || php.dead) break;
  }
  const rep = metrics.report();
  const php = game.world.get(playerId, C.Health);
  const survived = !!(php && !php.dead);
  const res = {
    style: sc.style, enemy: sc.enemy, count, level, seed: sc.seed,
    ttk: clearedAt >= 0 ? clearedAt / 60 : null,
    survived,
    hpLeftFrac: php ? Math.max(0, php.hp / php.max) : 0,
    dps: rep.dps, dmgTaken: rep.damageTaken,
  } as ScenarioResult;
  res.rating = rateDifficulty(res);
  return res;
}

export interface MatrixSpec {
  styles?: SimStyle[];
  enemies: string[];
  counts?: number[];
  levels?: number[];
  /** Sementes por célula (média sobre elas suaviza o ruído do RNG). */
  seeds?: number[];
  /** Teto de ticks por cenário (para o canary rodar rápido no CI). */
  ticks?: number;
  /** Qualidade de reação da esquiva (0..1) aplicada a todas as células. */
  reaction?: number;
  /** Veste armadura no tier do nível em todas as células (piso "com gear"). */
  armor?: boolean;
  /** Raridade da armadura em todas as células ('common'|'rare'|'unique'). */
  armorRarity?: string;
  /** Dons de santuário ativos em todas as células (ids). */
  boons?: string[];
}

/** Roda a matriz completa; devolve uma linha por (estilo × inimigo × qtd × nível),
 *  agregando as sementes (mediana de TTK, pior sobrevivência, média de hp/dps). */
export function runMatrix(spawnGame: () => { game: any; playerId: number }, spec: MatrixSpec): ScenarioResult[] {
  const styles = spec.styles ?? ['melee'];
  const counts = spec.counts ?? [1];
  const levels = spec.levels ?? [1];
  const seeds = spec.seeds ?? [1, 2, 3];
  const rows: ScenarioResult[] = [];
  for (const style of styles) for (const enemy of spec.enemies) for (const count of counts) for (const level of levels) {
    const runs = seeds.map((seed) => runScenario(spawnGame, { style, enemy, count, level, seed, ticks: spec.ticks, reaction: spec.reaction, armor: spec.armor, armorRarity: spec.armorRarity, boons: spec.boons }));
    const nums = (f: (r: ScenarioResult) => number) => runs.map(f).sort((a, b) => a - b);
    const median = (a: number[]) => a[Math.floor(a.length / 2)];
    const ttks = runs.map((r) => r.ttk).filter((v): v is number => v != null).sort((a, b) => a - b);
    const agg: ScenarioResult = {
      style, enemy, count, level,
      ttk: ttks.length ? ttks[Math.floor(ttks.length / 2)] : null,
      survived: runs.every((r) => r.survived),        // pior caso: todas as sementes
      hpLeftFrac: median(nums((r) => r.hpLeftFrac)),
      dps: runs.reduce((a, r) => a + r.dps, 0) / runs.length,
      dmgTaken: median(nums((r) => r.dmgTaken)),
      rating: 'médio',
    };
    agg.rating = rateDifficulty(agg);
    rows.push(agg);
  }
  return rows;
}
