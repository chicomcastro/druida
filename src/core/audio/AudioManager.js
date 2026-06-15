/**
 * Áudio procedural via Web Audio API — sem arquivos de asset. Sintetiza SFX
 * curtos (ataque, acerto, conjurar, pickup, level up, troca de forma, chefe) e
 * um drone ambiente que muda de tom por bioma. Pipeline de assets reais
 * (samples) fica como evolução. Ver docs/adr/0011.
 *
 * O AudioContext só inicia após o primeiro gesto do usuário (política dos
 * navegadores), então `resume()` é chamado no clique/tecla inicial.
 */
export class AudioManager {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = 0.6;
    this._ambient = null;

    const resume = () => this._ensure();
    addEventListener('pointerdown', resume, { once: false });
    addEventListener('keydown', resume, { once: false });

    game.on('meleeSwing', () => this.blip(180, 0.06, 'sawtooth', 0.15));
    game.on('cast', () => this.blip(520, 0.12, 'triangle', 0.18));
    game.on('damage', (e) => { if (e.dot) return; this.noise(0.05, 0.12); });
    game.on('kill', () => this.blip(120, 0.18, 'square', 0.2));
    game.on('essence', () => this.blip(880, 0.07, 'sine', 0.12));
    game.on('itemPickup', () => this.arp([660, 880, 1100], 0.06));
    game.on('levelUp', () => this.arp([523, 659, 784, 1046], 0.1));
    game.on('formSwap', () => this.arp([392, 587], 0.09, 'triangle'));
    game.on('formUnlocked', () => this.arp([523, 784, 1046], 0.12));
    game.on('dodge', () => this.blip(300, 0.08, 'sine', 0.1));
    game.on('victory', () => this.arp([523, 659, 784, 1046, 1318], 0.18));
    game.on('playerDowned', () => this.blip(90, 0.4, 'sawtooth', 0.25));
    game.on('biomeChanged', (e) => this._setAmbient(e.biome));
  }

  _ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
  }

  blip(freq, dur, type = 'sine', gain = 0.2) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.6), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  arp(freqs, step = 0.08, type = 'sine') {
    freqs.forEach((f, i) => setTimeout(() => this.blip(f, step * 1.6, type, 0.16), i * step * 1000));
  }

  noise(dur = 0.05, gain = 0.12) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.master);
    src.start(t);
  }

  _setAmbient(biomeKey) {
    if (!this.ctx || this.muted) return;
    if (this._ambient) { try { this._ambient.osc.stop(); } catch { /* noop */ } this._ambient = null; }
    const base = { clareira: 110, pantano: 82, bosque_cinza: 98, picos: 146, coracao: 65 };
    const freq = base[biomeKey] ?? 96;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.value = 0.04;
    osc.connect(g).connect(this.master);
    osc.start();
    this._ambient = { osc, g };
  }
}
