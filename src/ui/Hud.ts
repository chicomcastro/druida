import { C } from '../core/ecs/components.js';
import { FORMS } from '../gameplay/forms.js';
import { xpForLevel } from '../gameplay/progression.js';
import { isTouchDevice } from './TouchControls.js';
import { ensureHotbar, FORM_SLOT_START as HB_FORM_START } from '../gameplay/hotbar.js';
import { abilityBranch } from '../gameplay/skillTree.js';

/**
 * HUD em overlay DOM (mais simples e acessível que desenhar no canvas).
 * Um painel por jogador (cor de identidade), banner de bioma/nível, barra de
 * chefe e avisos (queda/revive). Ver docs/adr/0009-ui-dom-overlay.md.
 */
const css = `
@keyframes hud-pop{0%{transform:translate(-50%,-46%) scale(.92);opacity:0}12%{transform:translate(-50%,-50%) scale(1.02);opacity:1}18%{transform:translate(-50%,-50%) scale(1)}82%{opacity:1}100%{opacity:0}}
@keyframes hud-slide{from{transform:translateX(-14px);opacity:0}to{transform:translateX(0);opacity:1}}
#hud-root{position:fixed;inset:0;pointer-events:none;font-family:system-ui,sans-serif;color:#eaf3e6;z-index:10}
#hud-root .title-font{font-family:'Cinzel',Georgia,serif;letter-spacing:.04em}
#hud-players{position:absolute;left:14px;bottom:14px;display:flex;gap:10px;flex-wrap:wrap;max-width:60vw}
/* Cluster do jogador estilo MCD (ADR 0071): orbe de vida circular com o
   ícone da forma, coluna de Seiva e slots quadrados — chromeless, flutuando
   sobre o mundo com sombra (como no jogo de referência). */
.pp{padding:0;min-width:0}
.pp .nm{font-size:11px;font-weight:700;display:flex;gap:8px;align-items:baseline;letter-spacing:.04em;text-shadow:0 1px 3px #000;margin-left:2px}
.pp .nm .form{opacity:.75;font-weight:600;font-size:10px}
.pp .row{display:flex;align-items:flex-end;gap:7px;margin-top:4px}
.orb{width:62px;height:62px;border-radius:50%;position:relative;overflow:hidden;border:3px solid rgba(20,32,20,.9);background:rgba(26,10,10,.8);box-shadow:0 5px 16px rgba(0,0,0,.55),inset 0 2px 8px rgba(0,0,0,.65)}
.orb > i{position:absolute;left:0;right:0;bottom:0;height:100%;background:linear-gradient(180deg,#ff9a5a,#e84a4a);transition:height .18s cubic-bezier(.3,.8,.4,1)}
.orb .ic{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:27px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.8))}
.sapv{width:13px;height:56px;border-radius:8px;position:relative;overflow:hidden;border:2px solid rgba(20,32,20,.9);background:rgba(8,14,20,.8);box-shadow:0 4px 12px rgba(0,0,0,.45)}
.sapv > i{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(180deg,#6fe8b0,#3ab8ef);transition:height .18s}
.bar{height:10px;border-radius:6px;background:rgba(10,18,10,.9);margin-top:5px;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.6)}
.bar > i{display:block;height:100%;border-radius:6px;transition:width .18s cubic-bezier(.3,.8,.4,1)}
.arts{display:flex;gap:5px;align-items:flex-end}
.art{width:37px;height:37px;flex:none;border-radius:9px;background:linear-gradient(160deg,rgba(24,36,20,.94),rgba(10,16,8,.92));border:2px solid rgba(159,224,106,.3);font-size:8.5px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.45);line-height:1.1;padding:2px}
.art .cd{position:absolute;inset:0;background:rgba(0,0,0,.66);transform-origin:bottom}
.downed{color:#ff8a8a;font-size:11px;margin-top:4px;text-shadow:0 1px 3px #000;font-weight:700}
#hud-top{position:absolute;top:12px;left:50%;transform:translateX(-50%);text-align:center;text-shadow:0 2px 6px rgba(0,0,0,.8)}
#hud-top .biome{font-size:19px;font-weight:700;font-family:'Cinzel',Georgia,serif;letter-spacing:.06em}
#hud-top .lvl{font-size:12px;opacity:.85}
#hud-xp{width:250px;height:5px;background:rgba(10,18,10,.85);border-radius:3px;margin:5px auto 0;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.6)}
#hud-xp > i{display:block;height:100%;background:linear-gradient(90deg,#e8b23a,#ffd56a);transition:width .3s}
#hud-boss{position:absolute;top:64px;left:50%;transform:translateX(-50%);width:46vw;display:none}
#hud-boss .nm{font-size:14px;font-weight:700;text-align:center;text-shadow:0 1px 3px #000;font-family:'Cinzel',Georgia,serif}
#hud-boss .bar{height:14px;border:1px solid rgba(255,90,42,.4)}
#hud-boss .bar > i{background:linear-gradient(90deg,#a64ad0,#ff5a2a)}
#hud-toast{position:absolute;top:46%;left:50%;transform:translate(-50%,-50%);font-size:27px;font-weight:800;font-family:'Cinzel',Georgia,serif;text-shadow:0 2px 10px rgba(0,0,0,.9),0 0 24px rgba(159,224,106,.35);opacity:0}
#hud-toast.show{animation:hud-pop 2.2s ease forwards}
#hud-hint{position:absolute;bottom:12px;right:12px;text-align:right;font-size:11.5px;opacity:.6;line-height:1.55;text-shadow:0 1px 2px #000}
#hud-objective{position:absolute;top:14px;left:14px;max-width:310px;background:linear-gradient(160deg,rgba(14,26,16,.9),rgba(6,12,8,.84));border:1px solid rgba(255,213,106,.3);border-left:3px solid #ffd56a;border-radius:10px;padding:8px 12px;font-size:13px;text-shadow:0 1px 2px #000;box-shadow:0 6px 18px rgba(0,0,0,.4);animation:hud-slide .4s ease}
#hud-objective .t{font-size:9.5px;letter-spacing:.14em;opacity:.65;text-transform:uppercase;color:#ffd56a}
#hud-objective .d{font-size:11px;opacity:.72;margin-top:3px;line-height:1.4;font-style:italic}
#hud-save{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);font-size:12px;background:rgba(8,16,10,.8);border:1px solid rgba(159,224,106,.3);border-radius:8px;padding:4px 12px;opacity:0;transition:opacity .35s;text-shadow:0 1px 2px #000}
#hud-prompt{position:absolute;bottom:96px;left:50%;transform:translateX(-50%);background:linear-gradient(160deg,rgba(14,26,16,.94),rgba(6,12,8,.9));border:1px solid rgba(159,224,106,.4);border-radius:10px;padding:9px 16px;font-size:14px;display:none;box-shadow:0 8px 24px rgba(0,0,0,.5)}
#hud-dialogue{position:absolute;bottom:140px;left:50%;transform:translateX(-50%);width:min(620px,80vw);background:linear-gradient(160deg,rgba(10,20,12,.96),rgba(5,10,7,.94));border:1px solid rgba(159,224,106,.45);border-radius:12px;padding:15px 20px;font-size:15px;line-height:1.5;display:none;box-shadow:0 12px 36px rgba(0,0,0,.6);backdrop-filter:blur(4px)}
#hud-victory{position:absolute;inset:0;background:radial-gradient(circle,rgba(20,40,24,.85),rgba(4,8,5,.97));display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center}
#hud-victory h1{font-size:52px;margin:0;color:#9fe06a;text-shadow:0 3px 18px rgba(159,224,106,.5);font-family:'Cinzel',Georgia,serif}
#hud-victory p{opacity:.85;max-width:520px}
.dmgnum{position:absolute;font-weight:800;font-size:15px;text-shadow:0 1px 3px #000,0 0 8px rgba(0,0,0,.6);pointer-events:none;transform:translate(-50%,-50%);transition:none}
/* Barra de combo (ADR 0092): enche no tempo de execução; zona verde = sweet
   spot (60–90%); acertar encadeia e aumenta o DPS. */
#hud-combo{position:absolute;top:96px;left:50%;transform:translateX(-50%);width:260px;height:16px;display:none;z-index:6;text-align:center}
#hud-combo .track{position:relative;height:12px;border-radius:7px;background:rgba(8,14,8,.7);border:1px solid rgba(255,255,255,.18);overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,.5)}
#hud-combo .zone{position:absolute;top:0;bottom:0;left:60%;width:30%;background:rgba(122,224,120,.35);border-left:1px solid rgba(160,255,150,.6);border-right:1px solid rgba(160,255,150,.6)}
#hud-combo .fill{position:absolute;top:0;bottom:0;left:0;width:0;background:linear-gradient(90deg,#ffd56a,#ff9a3a)}
#hud-combo .cnt{margin-top:2px;font-size:12px;font-weight:800;color:#ffd56a;text-shadow:0 1px 3px #000}
#hud-combo.flash .track{box-shadow:0 0 14px rgba(160,255,150,.8)}
/* Hotbar 1–9 (ADR 0091): itens rápidos (poções) na base central. */
#hud-hotbar{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:5px;z-index:6}
#hud-hotbar .hb{width:44px;height:44px;border-radius:9px;border:2px solid rgba(255,255,255,.16);background:linear-gradient(160deg,rgba(20,32,18,.9),rgba(8,14,8,.9));position:relative;box-shadow:inset 0 2px 6px rgba(0,0,0,.5),0 3px 10px rgba(0,0,0,.4)}
#hud-hotbar .hb.empty{opacity:.4}
#hud-hotbar .hb.form{border-color:rgba(159,224,106,.28)}
#hud-hotbar .hb.active{border-color:#ffd56a;box-shadow:inset 0 2px 6px rgba(0,0,0,.5),0 0 12px rgba(255,213,106,.5)}
#hud-hotbar .hb .ic{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:24px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.8))}
#hud-hotbar .hb .k{position:absolute;top:1px;left:3px;font-size:9px;font-weight:800;color:#ffd56a;text-shadow:0 1px 2px #000;z-index:2}
#hud-hotbar .hb .n{position:absolute;bottom:1px;right:3px;font-size:11px;font-weight:800;color:#eaf3e6;text-shadow:0 1px 2px #000;z-index:2}
#hud-hotbar .hb .cd{position:absolute;inset:0;background:rgba(0,0,0,.62);transform-origin:bottom;transform:scaleY(0);border-radius:7px}
#hud-root.touch #hud-hotbar{bottom:auto;top:120px;transform:scale(.85);transform-origin:top center}
/* Touch: os slots de artefato do painel duplicam os botões U/I/O na tela —
   esconde e o painel volta a ser compacto (nome + barras). */
#hud-root.touch .arts{display:none}
#hud-root.touch .pp{min-width:150px}
/* Mobile (ADR 0068): objetivo vira faixa no topo, título de bioma desce,
   painéis encolhem e diálogo sobe acima dos botões de toque. */
@media (max-width:620px){
  #hud-objective{top:8px;left:8px;right:8px;max-width:none;font-size:12px;padding:6px 10px}
  #hud-top{top:76px}
  #hud-top .biome{font-size:15px}
  #hud-xp{width:160px}
  #hud-boss{top:120px;width:78vw}
  #hud-toast{font-size:20px;top:36%;width:88vw;text-align:center}
  #hud-players{left:8px;bottom:8px;transform:scale(.78);transform-origin:bottom left}
  .pp{min-width:150px}
  #hud-dialogue{bottom:232px;width:min(560px,92vw);font-size:13px;padding:10px 14px}
  #hud-prompt{bottom:188px;font-size:12.5px}
  #hud-save{bottom:auto;top:120px}
}
`;

const FORM_ICON = { humanoid: '🧙', wolf: '🐺', bear: '🐻', raven: '🐦‍⬛', frog: '🐸' };
const BRANCH_ICON = { natureza: '🌿', chama: '🔥', gelo: '❄️', tempestade: '🌩️', feras: '🐺', vida: '💚' };

export class Hud {
  game: any;
  root: any;
  playersEl: any; biomeEl: any; lvlEl: any; xpEl: any;
  bossEl: any; objEl: any; objDescEl: any; promptEl: any;
  dialogueEl: any; victoryEl: any; toastEl: any; saveEl: any;
  panels: Map<number, any>;
  hotbarEl: any; _hotbarKey: string;
  comboEl: any; comboFill: any; comboCnt: any; _comboFlash: any;
  _dialogueQueue: string[];
  _dlgT: any; _toastT: any; _saveT: any;
  constructor(game) {
    this.game = game;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    this.root = document.createElement('div');
    this.root.id = 'hud-root';
    this.root.innerHTML = `
      <div id="hud-top"><div class="biome"></div><div class="lvl"></div><div id="hud-xp"><i></i></div></div>
      <div id="hud-objective"><div class="t">Objetivo</div><div class="o"></div><div class="d"></div></div>
      <div id="hud-boss"><div class="nm"></div><div class="bar"><i></i></div></div>
      <div id="hud-players"></div>
      <div id="hud-prompt"></div>
      <div id="hud-dialogue"></div>
      <div id="hud-toast"></div>
      <div id="hud-save">💾 Salvo</div>
      <div id="hud-hotbar"></div>
      <div id="hud-combo"><div class="track"><div class="zone"></div><div class="fill"></div></div><div class="cnt"></div></div>
      <div id="hud-victory"><h1>A Floresta Renasce</h1><p>Você purificou o Coração Corrompido e derrotou O Apodrecedor. A natureza respira de novo, Druida.</p><p style="opacity:.6;font-size:13px">Continue explorando o mundo livremente.</p></div>
      <div id="hud-hint">WASD andar · J atacar · Shift esquivar · E falar<br>1–9 hotbar (formas + skills) · U/I/O dons · Q/R poção · B mochila · M mapa · T voltar ao Carvalho</div>`;
    document.body.appendChild(this.root);
    // Touch não tem teclado: as dicas de atalho só confundem (ADR 0068).
    if (isTouchDevice()) {
      this.root.classList.add('touch');
      (this.root.querySelector('#hud-hint') as HTMLElement).style.display = 'none';
    }
    this.objEl = this.root.querySelector('#hud-objective .o');
    this.objDescEl = this.root.querySelector('#hud-objective .d');
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
    this.saveEl = this.root.querySelector('#hud-save');
    this.hotbarEl = this.root.querySelector('#hud-hotbar');
    this._hotbarKey = '';
    this.comboEl = this.root.querySelector('#hud-combo');
    this.comboFill = this.comboEl.querySelector('.fill');
    this.comboCnt = this.comboEl.querySelector('.cnt');
    game.on('combo', () => { this.comboEl.classList.add('flash'); clearTimeout(this._comboFlash); this._comboFlash = setTimeout(() => this.comboEl.classList.remove('flash'), 140); });
    this.panels = new Map();

    game.on('biomeChanged', (e) => this.toast(e.def.name));
    game.on('levelUp', (e) => this.toast(`Nível ${e.level}!`));
    game.on('objective', (e) => this.toast(e.text, 2200));
    game.on('formUnlocked', (e) => this.toast('Nova forma desbloqueada!'));
    game.on('dialogue', (e) => this.showDialogue(e.lines));
    game.on('victory', () => { this.victoryEl.style.display = 'flex'; });
    game.on('saved', () => this.flashSaved());
  }

  flashSaved() {
    this.saveEl.style.opacity = '1';
    clearTimeout(this._saveT);
    this._saveT = setTimeout(() => { this.saveEl.style.opacity = '0'; }, 1200);
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
    // Reinicia a animação de pop (remove/reflow/adiciona a classe).
    this.toastEl.classList.remove('show');
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toastEl.classList.remove('show'), Math.max(ms, 2200));
  }

  /**
   * Hotbar estilo Minecraft (E17.5). 9 células unificadas: cada slot é uma
   * FORMA (faixa contígua a partir de FORM_SLOT_START, na ordem de form.list) ou
   * uma HABILIDADE atribuída — o resto fica vazio. Reconstrói o DOM só quando o
   * layout muda; cooldown e destaque da forma atual são atualizados por frame.
   */
  _updateHotbar() {
    const { game } = this;
    let pid = null;
    for (const [id, pc] of game.world.query(C.PlayerControlled)) {
      if (pc.index === 0) { pid = id; break; }
    }
    const hb = ensureHotbar(game);
    const form = pid != null ? game.world.get(pid, C.Form) : null;
    const forms = form?.list ?? ['humanoid'];

    // Um slot é de forma se cai na faixa das formas desbloqueadas.
    const formOf = (s) => (s >= HB_FORM_START && s - HB_FORM_START < forms.length
      ? forms[s - HB_FORM_START] : null);

    // Assinatura de layout: para cada slot, forma ou skill.
    const sig = Array.from({ length: 9 }, (_, s) => formOf(s) ? `f:${formOf(s)}` : `s:${hb[s] ?? ''}`).join('|');
    if (sig !== this._hotbarKey) {
      this._hotbarKey = sig;
      this.hotbarEl.innerHTML = Array.from({ length: 9 }, (_, s) => {
        const fm = formOf(s);
        if (fm) {
          return `<div class="hb form" data-form="${fm}"><span class="k">${s + 1}</span>`
            + `<span class="ic">${FORM_ICON[fm] ?? '🧙'}</span></div>`;
        }
        const ab = hb[s];
        const icon = ab ? (BRANCH_ICON[abilityBranch(ab) ?? ''] ?? '✦') : '';
        const empty = ab ? '' : ' empty';
        return `<div class="hb skill${empty}" data-skill="${s}"><span class="k">${s + 1}</span>`
          + `<span class="ic">${icon}</span><div class="cd"></div></div>`;
      }).join('');
    }

    // Atualização por frame: cooldown das skills + forma ativa destacada.
    const cds = pid != null ? game.world.get(pid, C.Cooldowns) : null;
    const cells = this.hotbarEl.children;
    for (let s = 0; s < 9; s++) {
      const cell = cells[s];
      if (!cell) continue;
      const fm = formOf(s);
      if (fm) {
        cell.classList.toggle('active', fm === form?.current);
        continue;
      }
      const ab = hb[s];
      const cd = cell.querySelector('.cd');
      if (!cd) continue;
      const remain = ab && cds ? (cds.map[ab] ?? 0) : 0;
      const total = ab ? (game.abilityCooldown(ab) || 1) : 1;
      cd.style.transform = `scaleY(${Math.max(0, Math.min(1, remain / total))})`;
    }
  }

  /** Barra de combo (ADR 0092): visível só durante a janela do P1. */
  _updateCombo() {
    const { game } = this;
    let pc = null;
    for (const [, p] of game.world.query(C.PlayerControlled)) { if (p.index === 0) { pc = p; break; } }
    const active = pc && pc.attackTimer > 0 && pc.castTotal > 0;
    if (!active) { if (this.comboEl.style.display !== 'none') this.comboEl.style.display = 'none'; return; }
    this.comboEl.style.display = 'block';
    const p = 1 - pc.attackTimer / pc.castTotal;
    this.comboFill.style.width = Math.max(0, Math.min(1, p)) * 100 + '%';
    this.comboCnt.textContent = pc.combo > 0 ? `Combo ×${pc.combo}` : '';
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
          <div class="row">
            <div class="orb"><i></i><span class="ic"></span></div>
            <div class="sapv"><i></i></div>
            <div class="arts"><div class="art"><span></span><div class="cd"></div></div><div class="art"><span></span><div class="cd"></div></div><div class="art"><span></span><div class="cd"></div></div></div>
          </div>
          <div class="downed"></div>`;
        this.playersEl.appendChild(el);
        p = { el, orb: el.querySelector('.orb'), hp: el.querySelector('.orb > i'), ic: el.querySelector('.orb .ic'), sap: el.querySelector('.sapv > i'), who: el.querySelector('.who'), form: el.querySelector('.form'), arts: el.querySelectorAll('.art'), downed: el.querySelector('.downed') };
        this.panels.set(id, p);
      }
      p.orb.style.borderColor = '#' + pc.color.toString(16).padStart(6, '0');
      p.who.textContent = `P${pc.index + 1}`;
      const form = game.world.get(id, C.Form);
      p.form.textContent = FORMS[form.current].name;
      p.ic.textContent = FORM_ICON[form.current] ?? '🧙';
      p.hp.style.height = Math.max(0, (hp.hp / hp.max) * 100) + '%';
      p.sap.style.height = Math.max(0, (sap.value / sap.max) * 100) + '%';

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

    this._updateHotbar();
    this._updateCombo();

    this.biomeEl.textContent = `${game.currentBiomeName()} ${game.dayNight?.icon?.() ?? ''}`;
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
      if (this.objDescEl) this.objDescEl.textContent = game.story.description?.() ?? '';
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
