/**
 * Dicas contextuais de onboarding. Cada dica aparece uma única vez (estado
 * "visto" persistido em localStorage) e some sozinha. Disparadas por eventos do
 * jogo + uma sequência introdutória no início. Ver ADR 0019.
 */
import { isTouchDevice } from './TouchControls.js';

const KEY = 'druida.tutorial.v1';

const css = `
#tut{position:fixed;top:96px;left:50%;transform:translateX(-50%);z-index:12;max-width:min(560px,82vw);
  background:rgba(8,16,10,.9);border:1px solid rgba(159,224,106,.5);border-left:4px solid #9fe06a;border-radius:10px;
  padding:10px 16px;color:#eaf3e6;font-family:system-ui,sans-serif;font-size:14px;line-height:1.4;text-align:center;
  opacity:0;transition:opacity .3s;pointer-events:none;text-shadow:0 1px 2px #000}
#tut.show{opacity:1}
#tut .k{color:#ffd56a;font-weight:700}
`;

export class Tutorial {
  game: any;
  seen: Set<string>;
  el: HTMLElement;
  queue: Array<{ id: string; text: string }>;
  _showing: boolean;
  _t: any;

  constructor(game) {
    this.game = game;
    this.seen = this._load();
    this.queue = [];
    this._showing = false;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    this.el = document.createElement('div');
    this.el.id = 'tut';
    document.body.appendChild(this.el);

    // Copy com voz de mundo (ADR 0070): a floresta ensina, não um manual.
    // Cada dica tem versão por dispositivo — touch vê botões, teclado vê teclas.
    const t = isTouchDevice();
    game.on('itemPickup', () => this.hint('bag', t
      ? 'O que a mata dá, a <span class="k">mochila</span> guarda. Toque em <span class="k">⏸</span> para equipar, encantar e desmontar.'
      : 'O que a mata dá, a <span class="k">mochila</span> guarda. Abra com <span class="k">B</span> para equipar, encantar e desmontar.'));
    game.on('levelUp', () => this.hint('level', 'Você cresce como cresce o carvalho. Gaste <span class="k">pontos de encanto</span> nos itens — eles florescem junto.'));
    game.on('formUnlocked', () => this.hint('form', t
      ? 'Uma nova <span class="k">Forma Ancestral</span> corre nas suas veias! Troque de pele com <span class="k">🐾</span>.'
      : 'Uma nova <span class="k">Forma Ancestral</span> corre nas suas veias! Troque de pele com <span class="k">5–9</span>.'));
    game.on('playerDowned', () => this.hint('downed', t
      ? 'Suas raízes falharam! Um aliado te ergue chegando perto — e <span class="k">💨</span> te faz intocável por um instante.'
      : 'Suas raízes falharam! Um aliado te ergue chegando perto — e a <span class="k">esquiva (Shift)</span> te faz intocável por um instante.'));
    game.on('biomeChanged', (e) => {
      if (e.biome && e.biome !== 'clareira') this.hint('biome', t
        ? 'Longe do Carvalho, a Corrupção engrossa — e os tesouros também. O <span class="k">🗺️</span> conhece os caminhos.'
        : 'Longe do Carvalho, a Corrupção engrossa — e os tesouros também. O mapa (<span class="k">M</span>) conhece os caminhos.');
    });
  }

  _load(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]') as string[]); } catch { return new Set(); }
  }
  _save() {
    try { localStorage.setItem(KEY, JSON.stringify([...this.seen])); } catch { /* noop */ }
  }

  /** Sequência inicial (chamada ao começar o jogo). */
  intro() {
    if (isTouchDevice()) {
      this.hint('move', 'A floresta acorda com seus passos, Druida. Deslize o <span class="k">polegar esquerdo</span> para caminhar — <span class="k">⚔️</span> golpeia por onde você olha.');
      this.hint('artifacts', 'Seus dons vivem nos botões <span class="k">U/I/O</span> — e <span class="k">💨</span> desvia como o vento. A Guardiã espera junto ao Carvalho-Mãe: chegue perto e toque <span class="k">✋</span>.');
    } else {
      this.hint('move', 'A floresta acorda com seus passos, Druida. <span class="k">WASD</span> caminha — <span class="k">J</span> ou <span class="k">clique</span> golpeia por onde você olha.');
      this.hint('artifacts', 'Seus dons vivem em <span class="k">U/I/O</span> — e <span class="k">Shift</span> desvia como o vento. A Guardiã espera junto ao Carvalho-Mãe (<span class="k">E</span>).');
    }
  }

  hint(id, text) {
    if (this.seen.has(id)) return;
    this.seen.add(id);
    this._save();
    this.queue.push({ id, text });
    this._pump();
  }

  _pump() {
    if (this._showing || this.queue.length === 0) return;
    const { text } = this.queue.shift();
    this._showing = true;
    this.el.innerHTML = text;
    this.el.classList.add('show');
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      this.el.classList.remove('show');
      this._showing = false;
      setTimeout(() => this._pump(), 400);
    }, 5000);
  }
}
