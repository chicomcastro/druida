import { C } from '../core/ecs/components.js';
import { FORMS } from '../gameplay/forms.js';
import { xpForLevel } from '../gameplay/progression.js';

/**
 * HUD em overlay DOM (mais simples e acessível que desenhar no canvas).
 * Um painel por jogador (cor de identidade), banner de bioma/nível, barra de
 * chefe e avisos (queda/revive). Ver docs/adr/0009-ui-dom-overlay.md.
 */
const css = `
#hud-root{position:fixed;inset:0;pointer-events:none;font-family:system-ui,sans-serif;color:#eaf3e6;z-index:10}
#hud-players{position:absolute;left:12px;bottom:12px;display:flex;gap:10px;flex-wrap:wrap;max-width:60vw}
.pp{background:rgba(8,16,10,.72);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px 10px;min-width:170px}
.pp .nm{font-size:12px;font-weight:700;display:flex;justify-content:space-between;align-items:center}
.bar{height:9px;border-radius:5px;background:#23301f;margin-top:5px;overflow:hidden}
.bar > i{display:block;height:100%;border-radius:5px;transition:width .12s}
.hpb > i{background:linear-gradient(90deg,#ff5a5a,#ff9a6a)}
.sapb > i{background:linear-gradient(90deg,#5ad0ff,#7affc0)}
.arts{display:flex;gap:6px;margin-top:6px}
.art{flex:1;height:22px;border-radius:6px;background:#1c2a18;border:1px solid rgba(255,255,255,.12);font-size:10px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;text-align:center}
.art .cd{position:absolute;inset:0;background:rgba(0,0,0,.6);transform-origin:bottom}
.downed{color:#ff8a8a;font-size:11px;margin-top:4px}
#hud-top{position:absolute;top:10px;left:50%;transform:translateX(-50%);text-align:center;text-shadow:0 1px 3px #000}
#hud-top .biome{font-size:18px;font-weight:700}
#hud-top .lvl{font-size:12px;opacity:.85}
#hud-xp{width:240px;height:5px;background:#23301f;border-radius:3px;margin:4px auto 0;overflow:hidden}
#hud-xp > i{display:block;height:100%;background:#ffd56a}
#hud-boss{position:absolute;top:64px;left:50%;transform:translateX(-50%);width:46vw;display:none}
#hud-boss .nm{font-size:13px;font-weight:700;text-align:center;text-shadow:0 1px 3px #000}
#hud-boss .bar{height:14px}
#hud-boss .bar > i{background:linear-gradient(90deg,#a64ad0,#ff5a2a)}
#hud-toast{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:26px;font-weight:800;text-shadow:0 2px 6px #000;opacity:0;transition:opacity .3s}
#hud-hint{position:absolute;bottom:12px;right:12px;text-align:right;font-size:12px;opacity:.7;line-height:1.5;text-shadow:0 1px 2px #000}
#hud-objective{position:absolute;top:14px;left:14px;max-width:300px;background:rgba(8,16,10,.66);border-left:3px solid #ffd56a;border-radius:6px;padding:7px 10px;font-size:13px;text-shadow:0 1px 2px #000}
#hud-objective .t{font-size:10px;letter-spacing:.08em;opacity:.7;text-transform:uppercase}
#hud-prompt{position:absolute;bottom:96px;left:50%;transform:translateX(-50%);background:rgba(8,16,10,.8);border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:8px 14px;font-size:14px;display:none}
#hud-dialogue{position:absolute;bottom:140px;left:50%;transform:translateX(-50%);width:min(620px,80vw);background:rgba(6,12,8,.92);border:1px solid rgba(159,224,106,.4);border-radius:10px;padding:14px 18px;font-size:15px;line-height:1.45;display:none}
#hud-victory{position:absolute;inset:0;background:radial-gradient(circle,rgba(20,40,24,.85),rgba(4,8,5,.97));display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center}
#hud-victory h1{font-size:48px;margin:0;color:#9fe06a;text-shadow:0 3px 12px #000}
#hud-victory p{opacity:.85;max-width:520px}
`;

const FORM_ICON = { humanoid: '🧙', wolf: '🐺', bear: '🐻', raven: '🐦‍⬛', frog: '🐸' };

export class Hud {
  constructor(game) {
    this.game = game;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    this.root = document.createElement('div');
    this.root.id = 'hud-root';
    this.root.innerHTML = `
      <div id="hud-top"><div class="biome"></div><div class="lvl"></div><div id="hud-xp"><i></i></div></div>
      <div id="hud-objective"><div class="t">Objetivo</div><div class="o"></div></div>
      <div id="hud-boss"><div class="nm"></div><div class="bar"><i></i></div></div>
      <div id="hud-players"></div>
      <div id="hud-prompt"></div>
      <div id="hud-dialogue"></div>
      <div id="hud-toast"></div>
      <div id="hud-victory"><h1>A Floresta Renasce</h1><p>Você purificou o Coração Corrompido e derrotou O Apodrecedor. A natureza respira de novo, Druida.</p><p style="opacity:.6;font-size:13px">Continue explorando o mundo livremente.</p></div>
      <div id="hud-hint">WASD mover · Mouse mirar · Clique atacar<br>5–9 trocar forma · U/I/O artefatos · Shift esquivar · E interagir · B inventário · T recuar ao hub</div>`;
    document.body.appendChild(this.root);
    this.objEl = this.root.querySelector('#hud-objective .o');
    this.promptEl = this.root.querySelector('#hud-prompt');
    this.dialogueEl = this.root.querySelector('#hud-dialogue');
    this.victoryEl = this.root.querySelector('#hud-victory');
    this._dialogueQueue = [];
    this.playersEl = this.root.querySelector('#hud-players');
    this.biomeEl = this.root.querySelector('#hud-top .biome');
    this.lvlEl = this.root.querySelector('#hud-top .lvl');
    this.xpEl = this.root.querySelector('#hud-xp > i');
    this.bossEl = this.root.querySelector('#hud-boss');
    this.toastEl = this.root.querySelector('#hud-toast');
    this.panels = new Map();

    game.on('biomeChanged', (e) => this.toast(e.def.name));
    game.on('levelUp', (e) => this.toast(`Nível ${e.level}!`));
    game.on('objective', (e) => this.toast(e.text, 2200));
    game.on('formUnlocked', (e) => this.toast('Nova forma desbloqueada!'));
    game.on('dialogue', (e) => this.showDialogue(e.lines));
    game.on('victory', () => { this.victoryEl.style.display = 'flex'; });
  }

  showDialogue(lines) {
    this._dialogueQueue = [...lines];
    this._nextDialogue();
  }

  _nextDialogue() {
    clearTimeout(this._dlgT);
    const line = this._dialogueQueue.shift();
    if (!line) { this.dialogueEl.style.display = 'none'; return; }
    this.dialogueEl.style.display = 'block';
    this.dialogueEl.textContent = line;
    this._dlgT = setTimeout(() => this._nextDialogue(), 3200);
  }

  toast(text, ms = 1400) {
    this.toastEl.textContent = text;
    this.toastEl.style.opacity = '1';
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => { this.toastEl.style.opacity = '0'; }, ms);
  }

  update() {
    const { game } = this;
    const seen = new Set();
    for (const [id, pc, hp, sap] of game.world.query(C.PlayerControlled, C.Health, C.Sap)) {
      seen.add(id);
      let p = this.panels.get(id);
      if (!p) {
        const el = document.createElement('div');
        el.className = 'pp';
        el.innerHTML = `<div class="nm"><span class="who"></span><span class="form"></span></div>
          <div class="bar hpb"><i></i></div><div class="bar sapb"><i></i></div>
          <div class="arts"><div class="art"><span></span><div class="cd"></div></div><div class="art"><span></span><div class="cd"></div></div><div class="art"><span></span><div class="cd"></div></div></div>
          <div class="downed"></div>`;
        this.playersEl.appendChild(el);
        p = { el, hp: el.querySelector('.hpb > i'), sap: el.querySelector('.sapb > i'), who: el.querySelector('.who'), form: el.querySelector('.form'), arts: el.querySelectorAll('.art'), downed: el.querySelector('.downed') };
        this.panels.set(id, p);
      }
      p.el.style.borderColor = '#' + pc.color.toString(16).padStart(6, '0');
      p.who.textContent = `P${pc.index + 1}`;
      const form = game.world.get(id, C.Form);
      p.form.textContent = `${FORM_ICON[form.current] ?? ''} ${FORMS[form.current].name}`;
      p.hp.style.width = Math.max(0, (hp.hp / hp.max) * 100) + '%';
      p.sap.style.width = Math.max(0, (sap.value / sap.max) * 100) + '%';

      const loadout = game.world.get(id, C.Loadout);
      const cds = game.world.get(id, C.Cooldowns);
      for (let i = 0; i < 3; i++) {
        const art = loadout.artifacts[i];
        const span = p.arts[i].querySelector('span');
        const cd = p.arts[i].querySelector('.cd');
        span.textContent = art ? art.name.split(' ')[0] : '—';
        const remain = art ? (cds.map[art.ability] ?? 0) : 0;
        const total = art ? (game.abilityCooldown(art.ability) || 1) : 1;
        cd.style.transform = `scaleY(${Math.max(0, Math.min(1, remain / total))})`;
      }
      p.downed.textContent = pc.downed ? `CAÍDO! ${pc.reviveProgress > 0 ? 'Revivendo…' : 'Revivam!'}` : '';
    }
    for (const [id, p] of this.panels) {
      if (!seen.has(id)) { p.el.remove(); this.panels.delete(id); }
    }

    this.biomeEl.textContent = game.currentBiomeName();
    this.lvlEl.textContent = `Nível ${game.progress.level} · ${game.partyEssence()} essência`;
    this.xpEl.style.width = (game.progress.xp / xpForLevel(game.progress.level)) * 100 + '%';

    // Barra de chefe.
    const boss = game.world.first(C.Boss, C.Health);
    if (boss) {
      const [, , hp] = boss;
      this.bossEl.style.display = 'block';
      this.bossEl.querySelector('.nm').textContent = game.world.get(boss[0], C.Boss).name;
      this.bossEl.querySelector('.bar > i').style.width = Math.max(0, (hp.hp / hp.max) * 100) + '%';
    } else {
      this.bossEl.style.display = 'none';
    }

    // Objetivo da campanha (+ progresso de abate quando aplicável).
    if (game.story) {
      const step = game.story.current();
      let txt = game.story.objective();
      if (step.id === 'purify_clearing') txt += ` (${game.story.kills}/${step.kills})`;
      this.objEl.textContent = txt;
    }

    // Prompt de interação.
    if (game.interactPrompt) {
      this.promptEl.style.display = 'block';
      this.promptEl.textContent = game.interactPrompt;
    } else {
      this.promptEl.style.display = 'none';
    }
  }
}
