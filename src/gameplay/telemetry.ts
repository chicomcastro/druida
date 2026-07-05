import { C } from '../core/ecs/components.js';
import { kvGetLocal, kvSetLocal } from './storage.js';

/**
 * Telemetria leve LOCAL (ADR 0051): contadores agregados de jogo para
 * embasar balanceamento em playtests. Nada sai da máquina — os dados vivem
 * só no localStorage e o jogador os exporta manualmente (botão na pausa)
 * para compartilhar se quiser. Desligável no menu de pausa.
 */
const KEY = 'druida.telemetry.v1';

const EMPTY = () => ({
  v: 2,
  sessions: 0,
  playSeconds: 0,
  kills: 0,
  eliteKills: 0,
  bossKills: 0,
  downs: 0,
  wipes: 0,
  damageDealt: 0,
  damageTaken: 0,
  essenceEarned: 0,
  itemsPicked: 0,
  campsPurified: 0,
  questsCompleted: 0,
  boonsChosen: 0,
  maxStoryStep: 0,
  victories: 0,
  // Funil de economia/progressão da primeira hora (ADR 0102, E9).
  essenceSpent: 0,     // pilar "evoluir comprando": quanto o jogador gasta
  itemsBought: 0,
  levelUps: 0,
  maxLevel: 1,
  villagesVisited: 0,  // vilas distintas visitadas
  interiorsEntered: 0, // portas de casa abertas (ADR 0094)
  rests: 0,            // descansos na taverna (ADR 0094)
  sideQuestsStarted: 0,
  loreFound: 0,
  // Marcos da primeira hora: SEGUNDO de jogo em que cada um ocorreu (uma vez).
  firstKillAt: 0,
  firstLevelAt: 0,
  firstPurchaseAt: 0,
  firstDownAt: 0,
  firstQuestAt: 0,
});

export class Telemetry {
  game: any;
  enabled: boolean;
  data: any;
  _dirtyT: number;
  _villages: Set<string>;

  constructor(game) {
    this.game = game;
    const stored = kvGetLocal(KEY);
    this.data = { ...EMPTY(), ...(stored ?? {}) };
    this.enabled = stored?.enabled !== false; // padrão: ligada (só local)
    this.data.sessions += 1;
    this._dirtyT = 0;
    this._villages = new Set();

    const inc = (k, n = 1) => { if (this.enabled) this.data[k] += n; };
    // Marco da 1ª hora: grava o segundo de jogo na primeira ocorrência.
    const once = (k) => { if (this.enabled && !this.data[k]) this.data[k] = Math.round(this.data.playSeconds); };
    game.on('kill', (e) => {
      inc('kills'); once('firstKillAt');
      if (e.bossName) inc('bossKills');
      if (this.game.world.get(e.id, C.AI)?.elite) inc('eliteKills');
    });
    game.on('damage', (e) => {
      if (!this.enabled) return;
      const isPlayer = !!this.game.world.get(e.id, C.PlayerControlled);
      if (isPlayer) this.data.damageTaken += e.amount;
      else this.data.damageDealt += e.amount;
    });
    game.on('playerDowned', () => { inc('downs'); once('firstDownAt'); });
    game.on('wipe', () => inc('wipes'));
    game.on('essence', (e) => inc('essenceEarned', e.amount ?? 0));
    game.on('itemPickup', () => inc('itemsPicked'));
    game.on('campPurified', () => inc('campsPurified'));
    game.on('questCompleted', () => { inc('questsCompleted'); once('firstQuestAt'); });
    game.on('boonChosen', () => inc('boonsChosen'));
    game.on('storyStep', (e) => { if (this.enabled) this.data.maxStoryStep = Math.max(this.data.maxStoryStep, e.step ?? 0); });
    game.on('victory', () => inc('victories'));
    // Funil de economia/progressão da primeira hora (ADR 0102, E9).
    game.on('purchase', (e) => { inc('itemsBought'); inc('essenceSpent', e.price ?? 0); once('firstPurchaseAt'); });
    game.on('levelUp', (e) => {
      inc('levelUps'); once('firstLevelAt');
      if (this.enabled) this.data.maxLevel = Math.max(this.data.maxLevel, e.level ?? 1);
    });
    game.on('settlementEntered', (e) => {
      if (!this.enabled || !e?.id || this._villages.has(e.id)) return;
      this._villages.add(e.id); this.data.villagesVisited += 1;
    });
    game.on('interiorEntered', () => inc('interiorsEntered'));
    game.on('rested', () => inc('rests'));
    game.on('sideQuestStarted', () => inc('sideQuestsStarted'));
    game.on('loreFound', () => inc('loreFound'));
  }

  /** Acumula tempo de jogo e persiste periodicamente (a cada ~10s). */
  update(dt) {
    if (!this.enabled) return;
    this.data.playSeconds += dt;
    this._dirtyT += dt;
    if (this._dirtyT >= 10) {
      this._dirtyT = 0;
      this.flush();
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.flush();
  }

  flush() {
    kvSetLocal(KEY, { ...this.data, playSeconds: Math.round(this.data.playSeconds), enabled: this.enabled });
  }

  /** JSON legível para o jogador exportar/compartilhar em playtest. */
  export() {
    return JSON.stringify({ ...this.data, playSeconds: Math.round(this.data.playSeconds), enabled: this.enabled }, null, 2);
  }
}
