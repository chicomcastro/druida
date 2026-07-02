import { BALANCE } from '../data/balance.js';
import { makeRng } from '../utils/math.js';

/**
 * Ciclo dia/noite + clima por bioma (ADR 0049). A simulação vive aqui
 * (testável): o tempo avança, `nightAmount()` descreve a escuridão (0 dia,
 * 1 noite, com transições suaves) e uma máquina de estados sorteia eventos de
 * clima do bioma (chuva no pântano, nevasca nos picos, cinzas no bosque…).
 * A camada de view consome: Renderer escurece a cena, WorldManager troca as
 * partículas, SettlementManager reforça as lanternas à noite e o spawner
 * aumenta a pressão de inimigos no escuro.
 *
 * O relógio não persiste no save: cada sessão nasce de manhã (decisão
 * deliberada — recomeçar de dia é mais acolhedor ao retomar o jogo).
 */

/** Clima possível por bioma: rótulo, ícone e partículas próprias. */
export const WEATHERS = {
  clareira: { label: 'Chuva fina', icon: '🌦️', ambient: { color: 0xa8c8e0, size: 0.12, rise: -6, sway: 0.15, opacity: 0.45 } },
  pantano: { label: 'Chuva do brejo', icon: '🌧️', ambient: { color: 0x9fc8e8, size: 0.13, rise: -8, sway: 0.2, opacity: 0.55 } },
  bosque_cinza: { label: 'Chuva de cinzas', icon: '🌫️', ambient: { color: 0xa8a098, size: 0.2, rise: -1.2, sway: 0.9, opacity: 0.75 } },
  picos: { label: 'Nevasca', icon: '🌨️', ambient: { color: 0xffffff, size: 0.22, rise: -4, sway: 1.6, opacity: 0.95 } },
  coracao: { label: 'Miasma', icon: '☁️', ambient: { color: 0xc06a9a, size: 0.22, rise: 0.9, sway: 0.7, opacity: 0.85 } },
};

export class DayNightManager {
  game: any;
  /** Hora do mundo em [0,1): 0 = amanhecer, 0.5 ~ anoitecer. */
  time: number;
  weather: { kind: string; label: string; icon: string; ambient: any } | null;
  _weatherT: number;
  _wasNight: boolean;
  rng: any;

  constructor(game) {
    this.game = game;
    this.time = 0.08; // começa de manhã cedo
    this.weather = null;
    this._weatherT = BALANCE.dayNight.weatherCalmMin;
    this._wasNight = false;
    this.rng = makeRng(((game.seed ?? 1337) ^ 0x5eaf00d) >>> 0);
  }

  update(dt) {
    const cfg = BALANCE.dayNight;
    if (this.game.inDungeon) return; // dentro da masmorra o céu não existe
    this.time = (this.time + dt / cfg.cycleSeconds) % 1;

    // Transições anunciadas (uma vez por virada).
    const night = this.isNight();
    if (night !== this._wasNight) {
      this._wasNight = night;
      if (night) {
        this.game.emit('nightFall', {});
        this.game.emit('objective', { text: '🌙 A noite cai sobre a floresta…' });
      } else {
        this.game.emit('dayBreak', {});
        this.game.emit('objective', { text: '🌅 Amanhece.' });
      }
    }

    // Clima: alterna calmaria <-> evento do bioma atual.
    this._weatherT -= dt;
    if (this._weatherT <= 0) {
      if (this.weather) {
        this.weather = null;
        this._weatherT = this.rng.range(cfg.weatherCalmMin, cfg.weatherCalmMax);
        this.game.emit('weatherChanged', { kind: null });
      } else {
        const biome = this.game.worldManager?.currentBiome ?? 'clareira';
        const def = WEATHERS[biome];
        if (def && this.rng.chance(cfg.weatherChance)) {
          this.weather = { kind: biome, ...def };
          this._weatherT = this.rng.range(cfg.weatherDurMin, cfg.weatherDurMax);
          this.game.emit('weatherChanged', { kind: biome, label: def.label });
          this.game.emit('objective', { text: `${def.icon} ${def.label}!` });
        } else {
          this._weatherT = this.rng.range(cfg.weatherCalmMin * 0.5, cfg.weatherCalmMin);
        }
      }
    }
  }

  /** Fração do ciclo que é noite fica no fim: [1-nightFraction, 1). */
  isNight() {
    return this.time >= 1 - BALANCE.dayNight.nightFraction;
  }

  /**
   * Escuridão 0..1 com crepúsculo suave (~6% do ciclo de transição de cada
   * lado da virada).
   */
  nightAmount() {
    const nightStart = 1 - BALANCE.dayNight.nightFraction;
    const tw = 0.06; // largura do crepúsculo
    if (this.time < tw) return 1 - this.time / tw; // amanhecer suave (pós-wrap)
    if (this.time < nightStart - tw) return 0;
    if (this.time < nightStart + tw) return (this.time - (nightStart - tw)) / (2 * tw);
    return 1;
  }

  /** Reforço das luzes das vilas à noite (lanternas ganham vida). */
  lightBoost() {
    return 1 + this.nightAmount() * 0.7;
  }

  /** Partículas do clima ativo (ou null para usar as do bioma). */
  weatherAmbient() {
    return this.weather?.ambient ?? null;
  }

  /** Ícone para o HUD: clima ativo > lua/sol. */
  icon() {
    if (this.weather) return this.weather.icon;
    return this.isNight() ? '🌙' : '☀️';
  }
}
