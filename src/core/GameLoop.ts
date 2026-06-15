/**
 * Loop com timestep fixo para simulação (determinístico) e render por frame.
 * Acumula tempo real e roda N passos fixos; o excedente vira `alpha` para
 * interpolação visual (usada opcionalmente pelo render).
 */
export class GameLoop {
  update: (dt: number) => void;
  render: (alpha: number) => void;
  step: number;
  maxSubSteps: number;
  _acc: number;
  _last: number;
  _raf: number;
  _running: boolean;

  constructor({ update, render, step = 1 / 60, maxSubSteps = 5 }) {
    this.update = update;
    this.render = render;
    this.step = step;
    this.maxSubSteps = maxSubSteps;
    this._acc = 0;
    this._last = 0;
    this._raf = 0;
    this._running = false;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._tick);
  }

  stop() {
    this._running = false;
    cancelAnimationFrame(this._raf);
  }

  _tick(now) {
    if (!this._running) return;
    let frame = (now - this._last) / 1000;
    this._last = now;
    // Evita "spiral of death" após abas em background.
    if (frame > 0.25) frame = 0.25;
    this._acc += frame;

    let steps = 0;
    while (this._acc >= this.step && steps < this.maxSubSteps) {
      this.update(this.step);
      this._acc -= this.step;
      steps++;
    }
    // Descarta backlog se estourou os sub-steps.
    if (steps === this.maxSubSteps) this._acc = 0;

    const alpha = this._acc / this.step;
    this.render(alpha);
    this._raf = requestAnimationFrame(this._tick);
  }
}
