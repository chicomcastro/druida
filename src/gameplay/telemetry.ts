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
  v: 1,
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
});

export class Telemetry {
  game: any;
  enabled: boolean;
  data: any;
  _dirtyT: number;

  constructor(game) {
    this.game = game;
    const stored = kvGetLocal(KEY);
    this.data = { ...EMPTY(), ...(stored ?? {}) };
    this.enabled = stored?.enabled !== false; // padrão: ligada (só local)
    this.data.sessions += 1;
    this._dirtyT = 0;

    const inc = (k, n = 1) => { if (this.enabled) this.data[k] += n; };
    game.on('kill', (e) => {
      inc('kills');
      if (e.bossName) inc('bossKills');
      if (this.game.world.get(e.id, C.AI)?.elite) inc('eliteKills');
    });
    game.on('damage', (e) => {
      if (!this.enabled) return;
      const isPlayer = !!this.game.world.get(e.id, C.PlayerControlled);
      if (isPlayer) this.data.damageTaken += e.amount;
      else this.data.damageDealt += e.amount;
    });
    game.on('playerDowned', () => inc('downs'));
    game.on('wipe', () => inc('wipes'));
    game.on('essence', (e) => inc('essenceEarned', e.amount ?? 0));
    game.on('itemPickup', () => inc('itemsPicked'));
    game.on('campPurified', () => inc('campsPurified'));
    game.on('questCompleted', () => inc('questsCompleted'));
    game.on('boonChosen', () => inc('boonsChosen'));
    game.on('storyStep', (e) => { if (this.enabled) this.data.maxStoryStep = Math.max(this.data.maxStoryStep, e.step ?? 0); });
    game.on('victory', () => inc('victories'));
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
