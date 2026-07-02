import { C } from '../ecs/components.js';

/**
 * Trilha musical procedural (Web Audio, sem assets — ADR 0046, no espírito do
 * ADR 0011): três camadas agendadas com lookahead — PAD (acorde com ataque
 * lento), BAIXO (fundamental por compasso) e LEAD (plucks esparsos numa escala
 * pentatônica/modal do bioma). A intensidade sobe com inimigos próximos
 * (densidade + percussão), o chefe troca o humor para tenso e regiões
 * purificadas (ADR 0044) tocam a variação maior/mais brilhante.
 */

const SCALES: Record<string, number[]> = {
  pentMajor: [0, 2, 4, 7, 9],
  pentMinor: [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 7, 9],
  phrygian: [0, 1, 3, 7, 8],
};

interface Mood {
  root: number; // fundamental (Hz)
  scale: keyof typeof SCALES;
  tempo: number; // BPM
  lead: OscillatorType;
  density: number; // prob. de nota do lead por passo (0..1)
  padGain: number;
}

const MOODS: Record<string, Mood> = {
  clareira: { root: 220.0, scale: 'pentMajor', tempo: 72, lead: 'triangle', density: 0.42, padGain: 0.05 },
  pantano: { root: 174.6, scale: 'pentMinor', tempo: 58, lead: 'sine', density: 0.3, padGain: 0.055 },
  bosque_cinza: { root: 196.0, scale: 'dorian', tempo: 62, lead: 'sine', density: 0.26, padGain: 0.05 },
  picos: { root: 261.6, scale: 'pentMajor', tempo: 54, lead: 'sine', density: 0.34, padGain: 0.045 },
  coracao: { root: 146.8, scale: 'phrygian', tempo: 78, lead: 'sawtooth', density: 0.4, padGain: 0.045 },
  boss: { root: 130.8, scale: 'phrygian', tempo: 104, lead: 'sawtooth', density: 0.7, padGain: 0.06 },
};

// Progressão de graus (da escala) por compasso — simples e cíclica.
const PROGRESSION = [0, 3, 4, 0];
const STEPS_PER_BAR = 8; // colcheias

export class MusicDirector {
  game: any;
  ctx: AudioContext;
  out: GainNode;
  muted: boolean;
  _mood: Mood;
  _biome: string;
  _nextStep: number;
  _step: number;
  _intensity: number;
  _timer: any;

  constructor(game, ctx: AudioContext, destination: AudioNode) {
    this.game = game;
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.9;
    this.out.connect(destination);
    this.muted = false;
    this._biome = 'clareira';
    this._mood = MOODS.clareira;
    this._step = 0;
    this._intensity = 0;
    this._nextStep = ctx.currentTime + 0.1;
    // Lookahead scheduler: agenda ~300ms à frente, acorda a cada 120ms.
    this._timer = setInterval(() => this._schedule(), 120);
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.out.gain.value = m ? 0 : 0.9;
  }

  setBiome(biome: string) {
    this._biome = biome;
  }

  /** Humor efetivo: chefe vivo > bioma (com brilho extra se purificado). */
  _currentMood(): Mood {
    for (const [, boss, hp] of this.game.world.query(C.Boss, C.Health)) {
      if (!boss.miniBoss && !hp.dead) return MOODS.boss;
    }
    const base = MOODS[this._biome] ?? MOODS.clareira;
    if (this.game.purity?.isPurified(this._biome)) {
      return { ...base, scale: 'pentMajor', density: base.density + 0.08, tempo: base.tempo + 4 };
    }
    return base;
  }

  /** Inimigos perto do grupo → intensidade 0..1 (amostrada por compasso). */
  _sampleIntensity() {
    const c = this.game.groupCenter ?? { x: 0, z: 0 };
    let n = 0;
    for (const [, tr, fac, hp] of this.game.world.query(C.Transform, C.Faction, C.Health)) {
      if (fac.team !== 'enemy' || hp.dead) continue;
      const dx = tr.x - c.x, dz = tr.z - c.z;
      if (dx * dx + dz * dz < 20 * 20) n++;
    }
    return Math.min(1, n / 6);
  }

  _schedule() {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const horizon = this.ctx.currentTime + 0.3;
    while (this._nextStep < horizon) {
      this._playStep(this._nextStep);
      const stepDur = 60 / this._mood.tempo / 2; // colcheia
      this._nextStep += stepDur;
      this._step = (this._step + 1) % (STEPS_PER_BAR * PROGRESSION.length);
    }
  }

  _playStep(t: number) {
    const inBar = this._step % STEPS_PER_BAR;
    const bar = Math.floor(this._step / STEPS_PER_BAR);

    if (inBar === 0) {
      // Início de compasso: reamostra humor/intensidade, toca pad + baixo.
      this._mood = this._currentMood();
      this._intensity = this._sampleIntensity();
      const scale = SCALES[this._mood.scale];
      const degree = scale[PROGRESSION[bar] % scale.length];
      const chordRoot = this._mood.root * Math.pow(2, degree / 12);
      const barDur = (60 / this._mood.tempo / 2) * STEPS_PER_BAR;
      this._pad(chordRoot, t, barDur);
      this._note(chordRoot / 2, t, barDur * 0.9, 'sine', 0.05); // baixo
    }

    // Percussão de tensão: tick de ruído nos tempos fortes em combate.
    if (this._intensity > 0.25 && (inBar === 0 || inBar === 4)) {
      this._tick(t, 0.03 + this._intensity * 0.04);
    }

    // Lead: pluck esparso na escala (densidade sobe com a intensidade).
    const density = Math.min(0.95, this._mood.density + this._intensity * 0.3);
    if (Math.random() < density && inBar !== 0) {
      const scale = SCALES[this._mood.scale];
      const deg = scale[Math.floor(Math.random() * scale.length)];
      const oct = Math.random() < 0.3 ? 2 : 1;
      const freq = this._mood.root * Math.pow(2, deg / 12) * oct;
      this._note(freq, t, 0.22, this._mood.lead, 0.045 + this._intensity * 0.02);
    }
  }

  /** Acorde-pad: fundamental + quinta + oitava, ataque/decay lentos. */
  _pad(rootFreq: number, t: number, dur: number) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(this._mood.padGain, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.05);
    g.connect(this.out);
    for (const ratio of [1, 1.4983, 2]) { // 1, quinta justa, oitava
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = rootFreq * ratio;
      osc.detune.value = (Math.random() - 0.5) * 8; // leve desafinação (calor)
      osc.connect(g);
      osc.start(t);
      osc.stop(t + dur * 1.1);
    }
  }

  _note(freq: number, t: number, dur: number, type: OscillatorType, gain: number) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.out);
    osc.start(t);
    osc.stop(t + dur);
  }

  _tick(t: number, gain: number) {
    const n = Math.floor(this.ctx.sampleRate * 0.03);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.out);
    src.start(t);
  }

  dispose() {
    clearInterval(this._timer);
  }
}
