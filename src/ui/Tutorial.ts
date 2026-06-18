/**
 * Dicas contextuais de onboarding. Cada dica aparece uma única vez (estado
 * "visto" persistido em localStorage) e some sozinha. Disparadas por eventos do
 * jogo + uma sequência introdutória no início. Ver ADR 0019.
 */
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

    game.on('itemPickup', () => this.hint('bag', 'Itens vão para a <span class="k">mochila</span>. Abra o inventário com <span class="k">B</span> para equipar, encantar e desmontar.'));
    game.on('levelUp', () => this.hint('level', 'Você subiu de nível! Gaste <span class="k">pontos de encanto</span> nos itens (inventário <span class="k">B</span>).'));
    game.on('formUnlocked', () => this.hint('form', 'Nova <span class="k">Forma Ancestral</span>! Alterne entre formas com as teclas <span class="k">5–9</span>.'));
    game.on('playerDowned', () => this.hint('downed', 'Você caiu! Um aliado revive chegando perto. A <span class="k">esquiva (Shift)</span> tem invulnerabilidade — use-a.'));
    game.on('biomeChanged', (e) => {
      if (e.biome && e.biome !== 'clareira') this.hint('biome', 'Quanto mais longe do hub, <span class="k">mais perigoso</span> — e melhor o loot. Abra o mapa com <span class="k">M</span>.');
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
    this.hint('move', 'Bem-vindo, Druida. <span class="k">WASD</span> move — você olha para onde anda. <span class="k">J</span>/<span class="k">clique</span> ataca na direção que encara.');
    this.hint('artifacts', 'Use artefatos com <span class="k">U/I/O</span> e esquive com <span class="k">Shift</span>. Fale com a Guardiã (<span class="k">E</span>) para começar.');
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
