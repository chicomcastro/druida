import { C } from '../core/ecs/components.js';
import { FORMS } from '../gameplay/forms.js';
import { ENCHANTMENTS, salvageValue } from '../gameplay/loot.js';
import { modText as MODTEXT } from '../gameplay/modifiers.js';
import { itemIconURL } from './itemIcons.js';
import { applyEquipment } from '../gameplay/equip.js';
import { saveToStorage, hasSave } from '../gameplay/save.js';
import { BOONS, chooseBoon } from '../gameplay/boons.js';
import { REBINDABLE, keyLabel } from '../core/input/bindings.js';
import { SKILL_TREES, canLearn, learn, respec, nodeText, ensureSkillState } from '../gameplay/skills.js';
import { ACTIVE_SKILL_TREE, canUnlock, unlock, isUnlocked, respecActive, ensureActiveSkills } from '../gameplay/skillTree.js';
import { ensureHotbar, assignSkill, assignForm, clearSlot, autoFillHotbar, sameEntry } from '../gameplay/hotbar.js';

/**
 * Menus em overlay DOM: menu principal (novo/continuar), pausa e
 * inventário/equipamento/encantamento. Centraliza o controle de pausa e o
 * estado `game.paused`. Ver docs/adr/0009 (mesmo padrão do HUD).
 */
const css = `
@keyframes menu-in{from{transform:translateY(10px) scale(.98);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
.menu{position:fixed;inset:0;z-index:30;display:none;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,rgba(14,26,16,.86),rgba(3,6,4,.94));font-family:system-ui,sans-serif;color:#eaf3e6;backdrop-filter:blur(3px)}
.menu.show{display:flex}
.panel{background:linear-gradient(165deg,#111f14,#0a130c);border:1px solid rgba(159,224,106,.35);border-radius:16px;padding:26px 30px;min-width:330px;max-width:92vw;box-shadow:0 24px 70px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.05);animation:menu-in .28s cubic-bezier(.2,.9,.3,1.2)}
.panel h1{margin:0 0 4px;color:#9fe06a;font-size:38px;font-family:'Cinzel',Georgia,serif;letter-spacing:.05em;text-shadow:0 2px 16px rgba(159,224,106,.35)}
.panel h2{margin:0 0 14px;font-size:19px;font-family:'Cinzel',Georgia,serif;letter-spacing:.04em}
.panel .sub{opacity:.7;margin:0 0 18px;font-size:13px}
.btn{display:block;width:100%;margin:8px 0;padding:12px 15px;border-radius:10px;border:1px solid rgba(159,224,106,.25);background:linear-gradient(160deg,#1d2c18,#141f10);color:#eaf3e6;font-size:15px;cursor:pointer;text-align:left;transition:transform .12s ease,border-color .12s,box-shadow .12s}
.btn:hover{transform:translateY(-1px);border-color:#9fe06a;box-shadow:0 6px 16px rgba(0,0,0,.35),0 0 12px rgba(159,224,106,.15)}
.btn:active{transform:translateY(0) scale(.99)}
.btn:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}
.inv{display:grid;grid-template-columns:1fr 1fr;gap:18px;min-width:640px}
.slot{border:1px solid rgba(159,224,106,.18);border-radius:9px;padding:8px 10px;margin-bottom:8px;font-size:13px;background:rgba(10,18,10,.4)}
.slot .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.1em;opacity:.6;color:#9fe06a}
.items{max-height:260px;overflow:auto;display:flex;flex-direction:column;gap:6px}
.it{display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:6px 9px;font-size:12px;cursor:pointer;transition:background .12s,border-color .12s}
.it:hover{background:#27361f;border-color:rgba(159,224,106,.4)}
.it .dot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:6px;box-shadow:0 0 6px currentColor}
.ench{margin-top:6px}
.ench .row{display:flex;justify-content:space-between;align-items:center;font-size:12px;margin:3px 0}
.mini{padding:3px 9px;border-radius:7px;border:1px solid #9fe06a;background:#1c2a18;color:#eaf3e6;cursor:pointer;transition:background .12s}
.mini:hover{background:#27361f}
.mini:disabled{opacity:.4;cursor:not-allowed;border-color:#555}
.close{float:right;opacity:.6;cursor:pointer}
/* Grade de slots RPG (ADR 0072): quadrados com ícone, raridade na borda,
   tooltip de comparação e preço no mercador. */
.eqrow{display:flex;gap:8px;margin:6px 0 26px}
/* Paperdoll anatômico (ADR 0090): peças em torno da silhueta do avatar. */
.paperdoll{display:grid;grid-template-columns:repeat(3,54px);grid-auto-rows:54px;gap:10px 12px;justify-content:center;margin:10px 0 30px}
.paperdoll .pd-weapon{grid-column:1;grid-row:2}
.paperdoll .pd-head{grid-column:2;grid-row:1}
.paperdoll .pd-body{grid-column:2;grid-row:2}
.paperdoll .pd-legs{grid-column:2;grid-row:3}
.paperdoll .pd-boots{grid-column:2;grid-row:4}
.paperdoll .pd-a0{grid-column:3;grid-row:1}
.paperdoll .pd-a1{grid-column:3;grid-row:2}
.paperdoll .pd-a2{grid-column:3;grid-row:3}
.gslot{width:54px;height:54px;border-radius:10px;border:2px solid rgba(255,255,255,.16);background:linear-gradient(160deg,rgba(20,32,18,.92),rgba(8,14,8,.92));display:flex;align-items:center;justify-content:center;font-size:24px;position:relative;cursor:pointer;transition:transform .1s,border-color .1s,box-shadow .1s;box-shadow:inset 0 2px 6px rgba(0,0,0,.5)}
.gslot:hover{transform:translateY(-2px);border-color:#9fe06a;box-shadow:0 4px 12px rgba(0,0,0,.4)}
.gslot.empty{opacity:.4;cursor:default}
.gslot.empty:hover{transform:none;border-color:rgba(255,255,255,.16);box-shadow:inset 0 2px 6px rgba(0,0,0,.5)}
.gslot.sel{border-color:#ffd56a;box-shadow:0 0 14px rgba(255,213,106,.3)}
.gslot .ic{width:44px;height:44px;image-rendering:pixelated;image-rendering:crisp-edges;border-radius:6px}
.gslot .tag{position:absolute;bottom:-17px;left:50%;transform:translateX(-50%);font-size:8.5px;white-space:nowrap;opacity:.6;text-transform:uppercase;letter-spacing:.06em}
.gslot .price{position:absolute;bottom:1px;right:3px;font-size:9.5px;color:#ffd56a;font-weight:700;text-shadow:0 1px 2px #000}
.ggrid{display:grid;grid-template-columns:repeat(5,54px);gap:7px;max-height:340px;overflow:auto;padding:2px}
@media (max-width:900px){.ggrid{grid-template-columns:repeat(5,46px)}.gslot{width:46px;height:46px}.gslot .ic{width:38px;height:38px}}
.sk-tracks{display:grid;grid-template-columns:repeat(2,1fr);gap:14px 18px;max-height:64vh;overflow:auto;padding:2px 4px}
@media (max-width:760px){.sk-tracks{grid-template-columns:1fr}}
.sk-track{border:1px solid rgba(159,224,106,.18);border-radius:11px;padding:10px 12px;background:rgba(10,18,10,.4)}
.sk-track h3{margin:0 0 8px;font-size:14px;color:#9fe06a;display:flex;justify-content:space-between;align-items:baseline;font-family:'Cinzel',Georgia,serif}
.sk-track h3 .prof{font-size:10px;opacity:.6;font-weight:400;letter-spacing:.05em;font-family:system-ui,sans-serif}
.sk-node{display:flex;align-items:center;gap:9px;padding:6px 0;border-top:1px solid rgba(255,255,255,.05)}
.sk-node:first-of-type{border-top:0}
.sk-node.locked{opacity:.42}
.sk-node .ico{font-size:20px;width:26px;text-align:center;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
.sk-node .body{flex:1;min-width:0}
.sk-node .nm{font-size:12.5px;font-weight:600}
.sk-node .ds{font-size:10.5px;opacity:.62;line-height:1.35}
.sk-node .lv{font-size:10px;opacity:.7;margin-left:2px}
.sk-node .buy{flex:none;width:30px;height:30px;border-radius:8px;border:1px solid rgba(159,224,106,.3);background:linear-gradient(160deg,#1d2c18,#141f10);color:#9fe06a;font-size:16px;font-weight:700;cursor:pointer;line-height:1}
.sk-node .buy:hover:not(:disabled){border-color:#9fe06a;box-shadow:0 0 10px rgba(159,224,106,.2)}
.sk-node .buy:disabled{opacity:.3;cursor:not-allowed}
.sk-node .pips{display:flex;gap:2px;margin-top:3px}
.sk-node .pips i{width:9px;height:5px;border-radius:2px;background:rgba(255,255,255,.14)}
.sk-node .pips i.on{background:#9fe06a;box-shadow:0 0 5px rgba(159,224,106,.5)}
.sk-slots{display:flex;gap:4px;margin-top:5px}
.sk-slots .slot{width:22px;height:22px;border-radius:6px;border:1px solid rgba(255,255,255,.16);background:rgba(20,32,18,.7);color:#cfe6c0;font-size:11px;font-weight:800;cursor:pointer;line-height:1;padding:0}
.sk-slots .slot:hover{border-color:#9fe06a}
.sk-slots .slot.on{border-color:#ffd56a;background:linear-gradient(160deg,#3a3216,#241d0d);color:#ffd56a;box-shadow:0 0 8px rgba(255,213,106,.35)}
#tip{position:fixed;z-index:60;pointer-events:none;display:none;max-width:240px;background:linear-gradient(165deg,#152315,#0a130c);border:1px solid rgba(159,224,106,.4);border-radius:10px;padding:9px 12px;font-size:12px;line-height:1.45;box-shadow:0 12px 32px rgba(0,0,0,.6);color:#eaf3e6;font-family:system-ui,sans-serif}
#tip b{font-size:13px}
#tip .up{color:#8affa0}#tip .down{color:#ff8a8a}
`;

const RCOLOR = { common: '#d6d6d6', rare: '#5aa0ff', unique: '#ffc83a' };

// Rótulos das trilhas de talento (ADR 0093).
const SK_TRACK_NAME = { axe: 'Machado', scythe: 'Foice', claws: 'Garras', staff: 'Cajado', wolf: 'Lobo', bear: 'Urso', raven: 'Corvo', frog: 'Sapo' };
const SK_TRACK_ICON = { axe: '🪓', scythe: '🌾', claws: '🐾', staff: '🪄', wolf: '🐺', bear: '🐻', raven: '🦅', frog: '🐸' };
const SK_ICON = { dmg: '⚔️', atkSpeed: '⚡', combo: '🎯', range: '↔️', formDur: '⏳', dr: '🛡️' };
// Ramos da árvore de skills ATIVAS (E17, ADR 0124).
const SK_BRANCH_NAME = { natureza: 'Natureza', chama: 'Chama', gelo: 'Gelo', tempestade: 'Tempestade', feras: 'Feras', vida: 'Vida' };
const SK_BRANCH_ICON = { natureza: '🌿', chama: '🔥', gelo: '❄️', tempestade: '🌩️', feras: '🐺', vida: '💚' };
const ALL_NODE_NAME: Record<string, string> = {};
for (const nodes of Object.values(SKILL_TREES)) for (const n of nodes) ALL_NODE_NAME[n.id] = n.name;

export class Menus {
  game: any;
  main: any; pause: any; inv: any;
  shop: any; stash: any; controls: any; skills: any; tip: any;
  _rebinding: string | null;
  _selSlot: string;
  constructor(game) {
    this.game = game;
    // Despertar de santuário oferece a escolha de um dom (ADR 0050).
    game.on('formUnlocked', (e) => this.openBoonChooser(e.form));
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    this.main = this._make('menu-main');
    this.pause = this._make('menu-pause');
    this.inv = this._make('menu-inv');
    this.shop = this._make('menu-shop');
    this.stash = this._make('menu-stash');
    this.controls = this._make('menu-controls');
    this.skills = this._make('menu-skills');
    this._rebinding = null;
    this._selSlot = 'weapon'; // slot equipado selecionado p/ encantar
    this.tip = document.createElement('div');
    this.tip.id = 'tip';
    document.body.append(this.main, this.pause, this.inv, this.shop, this.stash, this.controls, this.skills, this.tip);

    addEventListener('keydown', (e) => {
      if (game.menuMain) return; // bloqueia até iniciar
      // Tela de controles: captura a próxima tecla (rebind) ou fecha.
      if (this.controls.classList.contains('show')) {
        e.preventDefault();
        if (this._rebinding) {
          if (e.code !== 'Escape') this.game.input.setBinding(this._rebinding, e.code);
          this._rebinding = null;
          this.refreshControls();
        } else if (e.code === 'Escape') {
          this.closeControls();
        }
        return;
      }
      // Loja/baú: E, F ou Esc fecham.
      if (this.shop.classList.contains('show')) {
        if (['Escape', 'KeyE', 'KeyF'].includes(e.code)) this.closeShop();
        return;
      }
      if (this.stash.classList.contains('show')) {
        if (['Escape', 'KeyE', 'KeyF'].includes(e.code)) this.closeStash();
        return;
      }
      // Talentos (ADR 0093): K abre/fecha; Esc fecha.
      if (this.skills.classList.contains('show')) {
        if (['Escape', 'KeyK'].includes(e.code)) this.toggleSkills();
        return;
      }
      const mapOpen = this.game.worldMap?.wrap.style.display === 'flex';
      if (e.code === 'KeyM' && !this.pause.classList.contains('show') && !this.inv.classList.contains('show')) {
        this.game.worldMap.toggle();
      } else if (e.code === 'Escape' && mapOpen) {
        this.game.worldMap.toggle();
      } else if (e.code === 'Escape' || e.code === 'KeyP') this.togglePause();
      else if ((e.code === 'KeyB' || e.code === 'Tab') && !mapOpen) { e.preventDefault(); this.toggleInventory(); }
      else if (e.code === 'KeyK' && !mapOpen && !this.pause.classList.contains('show') && !this.inv.classList.contains('show')) { e.preventDefault(); this.toggleSkills(); }
      else if (e.code === 'KeyT' && !this.game.paused) this.game.recallToHub();
      // Cinto de poções (ADR 0091): Q usa a 1ª poção, R a 2ª. A fileira numérica
      // 1–9 é a hotbar unificada (formas + habilidades atribuíveis), E17.5.
      else if (e.code === 'KeyQ' && !this.game.paused && !this.inv.classList.contains('show')) {
        this.game.useHotbarSlot(0);
      } else if (e.code === 'KeyR' && !this.game.paused && !this.inv.classList.contains('show')) {
        this.game.useHotbarSlot(1);
      }
    });
  }

  _make(id) {
    const d = document.createElement('div');
    d.className = 'menu';
    d.id = id;
    return d;
  }

  // --- Menu principal ------------------------------------------------------
  showMain(onNew, onContinue) {
    this.game.menuMain = true;
    this.game.paused = true;
    this.main.innerHTML = `<div class="panel" style="text-align:center">
      <h1>🌿 Druida</h1>
      <p class="sub">Um dungeon-crawler de mundo aberto · classe Druida · coop local</p>
      <button class="btn" id="m-new" style="text-align:center">🌱 Novo jogo</button>
      <button class="btn" id="m-cont" style="text-align:center" disabled>📖 Continuar</button>
      <p class="sub" style="margin-top:14px">WASD mover (olha p/ onde anda) · J/Clique atacar · 5–9 formas · U/I/O artefatos · Shift esquivar · E interagir · B inventário · Esc pausar</p>
    </div>`;
    this.main.classList.add('show');
    this.main.querySelector('#m-new').onclick = () => { this.main.classList.remove('show'); this.game.menuMain = false; this.game.paused = false; onNew(); };
    const cont = this.main.querySelector('#m-cont');
    cont.onclick = () => { if (cont.disabled) return; this.main.classList.remove('show'); this.game.menuMain = false; this.game.paused = false; onContinue(); };
    // Save é assíncrono (IndexedDB): habilita "Continuar" quando confirmado.
    hasSave().then((has) => { if (has) cont.disabled = false; });
  }

  // --- Pausa ---------------------------------------------------------------
  togglePause() {
    if (this.inv.classList.contains('show')) { this.toggleInventory(); return; }
    const showing = this.pause.classList.toggle('show');
    this.game.paused = showing;
    if (!showing) return;
    this.pause.innerHTML = `<div class="panel" style="text-align:center">
      <h2>Pausado</h2>
      <button class="btn" id="p-resume" style="text-align:center">▶ Continuar</button>
      <button class="btn" id="p-save" style="text-align:center">💾 Salvar</button>
      <button class="btn" id="p-mute" style="text-align:center">🔊 Som: ${this.game.audio.muted ? 'desligado' : 'ligado'}</button>
      <button class="btn" id="p-music" style="text-align:center">🎵 Música: ${this.game.audio.musicMuted ? 'desligada' : 'ligada'}</button>
      <button class="btn" id="p-fx" style="text-align:center">✨ Efeitos visuais: ${this.game.renderer.post ? 'altos' : 'baixos'}</button>
      <button class="btn" id="p-telemetry" style="text-align:center">📊 Telemetria local: ${this.game.telemetry?.enabled ? 'ligada' : 'desligada'}</button>
      <button class="btn" id="p-export" style="text-align:center">📋 Copiar dados de jogo</button>
      <button class="btn" id="p-skills" style="text-align:center">🌟 Talentos (K)</button>
      <button class="btn" id="p-controls" style="text-align:center">🎮 Controles</button>
    </div>`;
    this.pause.querySelector('#p-skills').onclick = () => { this.togglePause(); this.toggleSkills(); };
    this.pause.querySelector('#p-resume').onclick = () => this.togglePause();
    this.pause.querySelector('#p-save').onclick = async (ev) => {
      ev.target.textContent = 'Salvando…';
      const ok = await saveToStorage(this.game);
      ev.target.textContent = ok ? '✓ Salvo!' : '✗ Erro ao salvar';
    };
    this.pause.querySelector('#p-mute').onclick = (ev) => {
      this.game.audio.setMuted(!this.game.audio.muted);
      ev.target.textContent = `🔊 Som: ${this.game.audio.muted ? 'desligado' : 'ligado'}`;
    };
    this.pause.querySelector('#p-music').onclick = (ev) => {
      this.game.audio.setMusicMuted(!this.game.audio.musicMuted);
      ev.target.textContent = `🎵 Música: ${this.game.audio.musicMuted ? 'desligada' : 'ligada'}`;
    };
    this.pause.querySelector('#p-fx').onclick = (ev) => {
      this.game.renderer.setPostEnabled(!this.game.renderer.post);
      ev.target.textContent = `✨ Efeitos visuais: ${this.game.renderer.post ? 'altos' : 'baixos'}`;
    };
    this.pause.querySelector('#p-telemetry').onclick = (ev) => {
      this.game.telemetry.setEnabled(!this.game.telemetry.enabled);
      ev.target.textContent = `📊 Telemetria local: ${this.game.telemetry.enabled ? 'ligada' : 'desligada'}`;
    };
    this.pause.querySelector('#p-export').onclick = async (ev) => {
      try {
        await navigator.clipboard.writeText(this.game.telemetry.export());
        ev.target.textContent = '✓ Copiado!';
      } catch {
        ev.target.textContent = '✗ Não foi possível copiar';
      }
    };
    this.pause.querySelector('#p-controls').onclick = () => { this.pause.classList.remove('show'); this.openControls(); };
  }

  // --- Controles (rebind do P1) -------------------------------------------
  openControls() {
    this.controls.classList.add('show');
    this.game.paused = true;
    this._rebinding = null;
    this.refreshControls();
  }

  refreshControls() {
    const b = this.game.input.bindings;
    const rows = REBINDABLE.map(({ action, label }) => {
      const cur = keyLabel((b[action] ?? [])[0]);
      const active = this._rebinding === action;
      return `<div class="row" style="display:flex;justify-content:space-between;align-items:center;font-size:13px;margin:4px 0">
        <span>${label}</span>
        <button class="mini" data-rb="${action}">${active ? '› pressione ‹' : cur}</button></div>`;
    }).join('');
    this.controls.innerHTML = `<div class="panel" style="min-width:340px">
      <span class="close" id="ct-close">✕ (Esc)</span>
      <h2>🎮 Controles (P1)</h2>
      <p class="sub">Clique numa ação e pressione a nova tecla. O personagem olha para onde se move.</p>
      ${rows}
      <button class="btn" id="ct-reset" style="text-align:center;margin-top:12px">↺ Restaurar padrão</button>
    </div>`;
    this.controls.querySelector('#ct-close').onclick = () => this.closeControls();
    this.controls.querySelector('#ct-reset').onclick = () => { this.game.input.resetBindings(); this._rebinding = null; this.refreshControls(); };
    this.controls.querySelectorAll('.mini[data-rb]').forEach((el) => {
      el.onclick = () => { this._rebinding = el.dataset.rb; this.refreshControls(); };
    });
  }

  closeControls() {
    this.controls.classList.remove('show');
    this._rebinding = null;
    this.game.paused = false;
  }

  // --- Talentos / Especialização (ADR 0093) --------------------------------
  toggleSkills() {
    if (this.pause.classList.contains('show') || this.inv.classList.contains('show')) return;
    const showing = this.skills.classList.toggle('show');
    this.game.paused = showing;
    if (showing) this.refreshSkills();
  }

  refreshSkills() {
    ensureSkillState(this.game);
    const pr = this.game.progress;
    const id = this._playerId();
    // Trilha ativa (arma equipada + forma atual) recebe destaque.
    const eq = id != null ? this.game.world.get(id, C.Equipment) : null;
    const form = id != null ? this.game.world.get(id, C.Form) : null;
    const activeFam = eq?.weapon?.family;
    const activeForm = form && form.current !== 'humanoid' ? form.current : null;

    const tracks = Object.entries(SKILL_TREES).map(([track, nodes]) => {
      const active = track === activeFam || track === activeForm;
      const prof = pr.proficiency?.[track] ?? 0;
      const rows = nodes.map((node) => {
        const lv = pr.skills?.[node.id] ?? 0;
        const learnable = canLearn(this.game, node.id);
        const reqLocked = node.req && (pr.skills?.[node.req] ?? 0) < 1;
        const pips = Array.from({ length: node.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
        return `<div class="sk-node${reqLocked ? ' locked' : ''}">
          <span class="ico">${SK_ICON[node.effect] ?? '✦'}</span>
          <div class="body">
            <div class="nm">${node.name} <span class="lv">${lv}/${node.max}</span></div>
            <div class="ds">${nodeText(node, lv)}${reqLocked ? ` · requer ${ALL_NODE_NAME[node.req]}` : ''}</div>
            <div class="pips">${pips}</div>
          </div>
          <button class="buy" data-node="${node.id}" ${learnable ? '' : 'disabled'} title="Investir 1 ponto">+</button>
        </div>`;
      }).join('');
      return `<div class="sk-track" style="${active ? 'border-color:#ffd56a55;box-shadow:0 0 14px rgba(255,213,106,.12)' : ''}">
        <h3>${SK_TRACK_ICON[track] ?? '✦'} ${SK_TRACK_NAME[track] ?? track}${active ? ' ·' : ''}
          <span class="prof">uso ${prof}</span></h3>
        ${rows}
      </div>`;
    }).join('');

    // Árvore de SKILLS ATIVAS (E17, ADR 0124): cada nó libera uma habilidade.
    ensureActiveSkills(this.game);
    const hbSlots = ensureHotbar(this.game); // 9 entradas tipadas (E18)
    const ALL_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8]; // hotbar livre: qualquer slot
    // Botões de slot 1–9 para uma entrada; destaca o slot atual.
    const slotButtons = (entry: any) => `<div class="sk-slots">${ALL_SLOTS.map((i) =>
      `<button class="slot${sameEntry(hbSlots[i], entry) ? ' on' : ''}" data-assign='${JSON.stringify(entry)}' data-slot="${i}" title="Atribuir à tecla ${i + 1}">${i + 1}</button>`,
    ).join('')}</div>`;
    const branches = Object.entries(ACTIVE_SKILL_TREE).map(([branch, nodes]) => {
      const rows = (nodes as any[]).map((node) => {
        const has = isUnlocked(this.game, node.id);
        const unlockable = canUnlock(this.game, node.id);
        const reqLocked = node.req && !isUnlocked(this.game, node.req);
        // Atribuição à hotbar: só para skills já liberadas. Um botão por slot
        // (1–9), destacando o atual; clicar de novo desatribui.
        const slots = has ? slotButtons({ k: 'skill', id: node.ability }) : '';
        return `<div class="sk-node${reqLocked && !has ? ' locked' : ''}">
          <span class="ico">${SK_BRANCH_ICON[branch] ?? '✦'}</span>
          <div class="body">
            <div class="nm">${node.name} ${has ? '<span class="lv">✓ liberada</span>' : `<span class="lv">${node.cost}★</span>`}</div>
            <div class="ds">${node.desc}${reqLocked && !has ? ` · requer ${nodes.find((n: any) => n.id === node.req)?.name ?? ''}` : ''}</div>
            ${slots}
          </div>
          <button class="buy" data-skill="${node.id}" ${has ? 'disabled title="Já liberada"' : (unlockable ? 'title="Liberar habilidade"' : 'disabled')}>${has ? '✓' : '+'}</button>
        </div>`;
      }).join('');
      return `<div class="sk-track"><h3>${SK_BRANCH_ICON[branch] ?? '✦'} ${SK_BRANCH_NAME[branch] ?? branch}</h3>${rows}</div>`;
    }).join('');

    // Formas na hotbar (E18): cada forma desbloqueada pode ir em qualquer slot.
    const FORM_ICON = { humanoid: '🧙', wolf: '🐺', bear: '🐻', raven: '🐦‍⬛', frog: '🐸' };
    const formRows = (form?.list ?? []).map((fm) => `<div class="sk-node">
      <span class="ico">${FORM_ICON[fm] ?? '🐾'}</span>
      <div class="body">
        <div class="nm">${FORMS[fm]?.name ?? fm}</div>
        ${slotButtons({ k: 'form', id: fm })}
      </div>
    </div>`).join('');
    const formsSection = formRows
      ? `<div class="sk-track"><h3>🐾 Formas</h3>${formRows}</div>` : '';

    this.skills.innerHTML = `<div class="panel" style="min-width:min(760px,92vw)">
      <span class="close" id="sk-close">✕ (K)</span>
      <h2>🌟 Talentos</h2>
      <p class="sub">Pontos disponíveis: <b>${pr.skillPoints ?? 0}</b> · trilhas destacadas seguem sua arma/forma ativa. Especialize usando cada arma e forma.</p>
      <h3 style="margin:6px 0 4px;color:#9fe06a">✦ Habilidades ativas</h3>
      <p class="sub">Libere magias e atribua a <b>qualquer</b> tecla da hotbar (1–9). Skills, formas, poções e equipamentos convivem na mesma barra — monte do seu jeito. Cada ramo tem seu efeito visual.</p>
      <div class="sk-tracks">${branches}</div>
      <button class="btn" id="sk-respec-active" style="text-align:center;margin:8px 0 16px">↺ Redistribuir habilidades (grátis)</button>
      ${formsSection ? `<h3 style="margin:6px 0 4px;color:#cfe6c0">🐾 Formas na hotbar</h3><div class="sk-tracks">${formsSection}</div>` : ''}
      <h3 style="margin:6px 0 4px;color:#ffd56a">⚔️ Passivas por arma/forma</h3>
      <div class="sk-tracks">${tracks}</div>
      <button class="btn" id="sk-respec" style="text-align:center;margin-top:14px">↺ Redistribuir passivas (grátis)</button>
    </div>`;

    this.skills.querySelector('#sk-close').onclick = () => this.toggleSkills();
    this.skills.querySelector('#sk-respec').onclick = () => { respec(this.game); this.refreshSkills(); };
    this.skills.querySelector('#sk-respec-active').onclick = () => { respecActive(this.game); this.refreshSkills(); };
    this.skills.querySelectorAll('.buy[data-node]').forEach((el: any) => {
      el.onclick = () => { if (learn(this.game, el.dataset.node)) this.refreshSkills(); };
    });
    this.skills.querySelectorAll('.buy[data-skill]').forEach((el: any) => {
      el.onclick = () => {
        // Ao liberar, auto-equipa no 1º slot vago — conveniência.
        if (unlock(this.game, el.dataset.skill)) { autoFillHotbar(this.game); this.refreshSkills(); }
      };
    });
    this.skills.querySelectorAll('.slot[data-assign]').forEach((el: any) => {
      el.onclick = () => {
        const slot = +el.dataset.slot;
        const entry = JSON.parse(el.dataset.assign);
        const hb = ensureHotbar(this.game);
        if (sameEntry(hb[slot], entry)) clearSlot(this.game, slot); // clicar de novo desatribui
        else if (entry.k === 'form') assignForm(this.game, slot, entry.id);
        else assignSkill(this.game, slot, entry.id);
        this.refreshSkills();
      };
    });
  }

  // --- Inventário / Equipamento / Encantamento -----------------------------
  toggleInventory() {
    if (this.pause.classList.contains('show')) return;
    const showing = this.inv.classList.toggle('show');
    this.game.paused = showing;
    if (showing) this.refreshInventory();
  }

  _playerId() {
    for (const [id, pc] of this.game.world.query(C.PlayerControlled)) if (pc.index === 0) return id;
    return null;
  }

  refreshInventory() {
    const id = this._playerId();
    if (id == null) return;
    const loadout = this.game.world.get(id, C.Loadout);
    const inv = this.game.world.get(id, C.Inventory);
    const forms = this.game.world.get(id, C.Form).list.map((f) => FORMS[f].name).join(', ');

    const ar = loadout.armor ?? {};
    // Paperdoll anatômico (ADR 0090): posição no grid via classe pd-*.
    const EQ = [
      { key: 'weapon', label: 'Arma', item: loadout.weapon, pd: 'pd-weapon' },
      { key: 'armor:head', label: 'Elmo', item: ar.head, pd: 'pd-head' },
      { key: 'armor:body', label: 'Peito', item: ar.body, pd: 'pd-body' },
      { key: 'armor:legs', label: 'Calças', item: ar.legs, pd: 'pd-legs' },
      { key: 'armor:boots', label: 'Botas', item: ar.boots, pd: 'pd-boots' },
      { key: 'artifact0', label: 'Dom 1', item: loadout.artifacts[0], pd: 'pd-a0' },
      { key: 'artifact1', label: 'Dom 2', item: loadout.artifacts[1], pd: 'pd-a1' },
      { key: 'artifact2', label: 'Dom 3', item: loadout.artifacts[2], pd: 'pd-a2' },
    ];
    const sel = EQ.find((e) => e.key === this._selSlot) ?? EQ[0];
    // Grade fixa 5×10 (ADR 0090): itens preenchem, resto vazio até 50.
    const CAP = Math.max(50, Math.ceil(inv.items.length / 5) * 5);
    let bag = '';
    for (let i = 0; i < CAP; i++) bag += this._gslot(inv.items[i] ?? null, inv.items[i] ? { data: `data-i="${i}"` } : {});
    this.inv.innerHTML = `<div class="panel">
      <span class="close" id="iv-close">✕ (B)</span>
      <h2>Mochila do Druida</h2>
      <p class="sub">Pontos de encanto: <b>${loadout.enchantPoints}</b> · Essência: <b>${inv.essence}</b> ✦ · Formas: ${forms}</p>
      <div class="inv">
        <div>
          <div class="lbl" style="margin-bottom:4px">Equipado — clique para ver/encantar</div>
          <div class="paperdoll">
            ${EQ.map((e) => this._gslot(e.item, { tag: e.label, sel: e.key === this._selSlot, data: `data-slot="${e.key}"`, extra: e.pd })).join('')}
          </div>
          <div id="iv-detail">${this._detailHtml(sel.label, sel.item)}</div>
        </div>
        <div>
          <div class="lbl" style="margin-bottom:4px">Mochila (5×10) — clique equipa/usa · direito desmonta (+✦)</div>
          <div class="ggrid" id="iv-items">${bag}</div>
        </div>
      </div>
    </div>`;

    this.inv.querySelector('#iv-close').onclick = () => this.toggleInventory();
    this.inv.querySelectorAll('.gslot[data-i]').forEach((el: any) => {
      const i = +el.dataset.i;
      el.onclick = () => { this._hideTip(); this._equipFromBag(id, i); };
      el.oncontextmenu = (e) => { e.preventDefault(); this._hideTip(); this._salvage(id, i); };
      this._bindTip(el, inv.items[i], loadout);
    });
    this.inv.querySelectorAll('.gslot[data-slot]').forEach((el: any) => {
      el.onclick = () => { this._selSlot = el.dataset.slot; this.refreshInventory(); };
      const eq = EQ.find((q) => q.key === el.dataset.slot);
      if (eq?.item) this._bindTip(el, eq.item, null);
    });
    this.inv.querySelectorAll('.mini[data-ench]').forEach((el: any) => {
      el.onclick = () => this._invest(id, el.dataset.slot, +el.dataset.ench);
    });
  }

  /** Slot quadrado com ícone e raridade na borda (grade RPG — ADR 0072). */
  _gslot(item, { tag = '', sel = false, data = '', price = null, extra = '' }: any = {}) {
    const ICON = { weapon: '⚔️', armor: '🛡️', artifact: '🌿', consumable: '🧪' };
    // Ícone ilustrado (ADR 0090); emoji como fallback headless/sem canvas.
    const url = item ? itemIconURL(item) : '';
    const glyph = url ? `<img class="ic" src="${url}" alt="">` : (item ? (ICON[item.type] ?? '🌿') : '');
    const border = item ? `style="border-color:${RCOLOR[item.rarity]}"` : '';
    const cls = `gslot${item ? '' : ' empty'}${sel ? ' sel' : ''}${extra ? ' ' + extra : ''}`;
    return `<div class="${cls}" ${border} ${data}>${glyph}
      ${price != null ? `<span class="price">${price}✦</span>` : ''}
      ${tag ? `<span class="tag">${tag}</span>` : ''}</div>`;
  }

  /** Painel de detalhes do slot equipado selecionado (encantos). */
  _detailHtml(label, item) {
    if (!item) return `<div class="slot"><div class="lbl">${label}</div>— vazio —</div>`;
    const enchHtml = (item.enchants ?? []).map((e, ei) => {
      const def = ENCHANTMENTS[e.id];
      const can = this._canInvest(item, e);
      return `<div class="row"><span title="${def?.desc ?? ''}">• ${def?.name ?? e.id} <b>${e.level}/${e.max}</b></span>
        <button class="mini" data-ench="${ei}" data-slot="${this._selSlot}" ${can ? '' : 'disabled'}>+1</button></div>`;
    }).join('');
    return `<div class="slot"><div class="lbl">${label}</div>
      <span class="dot" style="background:${RCOLOR[item.rarity]}"></span><b>${item.name}</b>
      <div class="sub" style="margin:2px 0">${this._statText(item)}</div>
      <div class="ench">${enchHtml || '<span class="sub">sem slots de encanto</span>'}</div></div>`;
  }

  _statText(it) {
    const base = it.type === 'weapon' ? `dano ${it.damage} · ${it.element}`
      : it.type === 'armor' ? `armadura ${(it.armor * 100) | 0}%`
      : it.type === 'consumable' ? (it.effect === 'heal' ? `cura ${it.magnitude}` : `${it.effect} ${it.magnitude}`)
      : 'concede habilidade';
    const mods = (it.mods ?? []).map((m) => MODTEXT(m)).filter(Boolean);
    return mods.length ? `${base} · ${mods.join(' · ')}` : base;
  }

  /** Tooltip com comparação contra o equipado (mochila/mercador). */
  _bindTip(el, item, loadout) {
    if (!item) return;
    el.onmouseenter = () => {
      let cmp = '';
      if (loadout) {
        if (item.type === 'weapon' && loadout.weapon) {
          const d = item.damage - loadout.weapon.damage;
          cmp = `<div class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)} dano vs equipada</div>`;
        } else if (item.type === 'armor' && loadout.armor) {
          const cur = loadout.armor[item.slot];
          const d = Math.round((item.armor - (cur?.armor ?? 0)) * 100);
          cmp = `<div class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}% armadura vs equipada</div>`;
        }
      }
      const ench = (item.enchants ?? []).map((e) => `• ${ENCHANTMENTS[e.id]?.name ?? e.id} ${e.level}/${e.max}`).join('<br>');
      this.tip.innerHTML = `<b style="color:${RCOLOR[item.rarity]}">${item.name}</b><br>
        <span style="opacity:.8">${this._statText(item)}</span>${cmp}${ench ? `<div style="opacity:.75;margin-top:4px">${ench}</div>` : ''}`;
      const r = el.getBoundingClientRect();
      this.tip.style.display = 'block';
      this.tip.style.left = Math.min(innerWidth - 250, r.right + 10) + 'px';
      this.tip.style.top = Math.max(8, r.top - 8) + 'px';
    };
    el.onmouseleave = () => this._hideTip();
  }

  _hideTip() { this.tip.style.display = 'none'; }

  _canInvest(item, ench) {
    const id = this._playerId();
    const loadout = this.game.world.get(id, C.Loadout);
    return loadout.enchantPoints > 0 && ench.level < ench.max;
  }

  _invest(id, slotKey, ei) {
    const loadout = this.game.world.get(id, C.Loadout);
    const item = slotKey === 'weapon' ? loadout.weapon
      : slotKey.startsWith('armor:') ? loadout.armor[slotKey.split(':')[1]]
      : loadout.artifacts[+slotKey.replace('artifact', '')];
    const ench = item?.enchants?.[ei];
    if (!ench || loadout.enchantPoints <= 0 || ench.level >= ench.max) return;
    ench.level++;
    loadout.enchantPoints--;
    applyEquipment(this.game, id);
    this.game.emit('cast', {});
    this.refreshInventory();
  }

  _equipFromBag(id, i) {
    const inv = this.game.world.get(id, C.Inventory);
    const item = inv.items[i];
    if (!item) return;
    // Consumível: usa (se surtir efeito) em vez de equipar.
    if (item.type === 'consumable') {
      if (this.game.useConsumable(id, item)) { inv.items.splice(i, 1); this.refreshInventory(); }
      return;
    }
    inv.items.splice(i, 1);
    this.game.equip(id, item);
    this.game.emit('itemEquipped', { id, item });
    this.refreshInventory();
  }

  _salvage(id, i) {
    const inv = this.game.world.get(id, C.Inventory);
    const item = inv.items[i];
    if (!item) return;
    inv.items.splice(i, 1);
    inv.essence += salvageValue(item);
    this.refreshInventory();
  }

  // --- Mercador ------------------------------------------------------------
  openShop() {
    if (this.game.paused) return;
    if (!this.game.shopStock) this.game.rerollShop();
    this.shop.classList.add('show');
    this.game.paused = true;
    this.refreshShop();
  }

  refreshShop() {
    const essence = this.game.partyEssence();
    const pid = this._playerId();
    const loadout = pid != null ? this.game.world.get(pid, C.Loadout) : null;
    const slots = this.game.shopStock.map((s, i) =>
      this._gslot(s.item, { data: `data-buy="${i}"`, price: s.price })).join('');
    this.shop.innerHTML = `<div class="panel">
      <span class="close" id="sh-close">✕ (E/Esc)</span>
      <h2>🪙 Mercador</h2>
      <p class="sub">"Pegue o que a floresta mandou — e deixe a essência." · Grupo: <b>${essence}</b> ✦</p>
      <div class="ggrid" style="grid-template-columns:repeat(4,54px)">${slots}</div>
      <button class="btn" id="sh-reroll" style="text-align:center;margin-top:14px" ${essence >= 5 ? '' : 'disabled'}>🔄 Renovar estoque (5 ✦)</button>
    </div>`;
    this.shop.querySelectorAll('.gslot[data-buy]').forEach((el: any) => {
      const i = +el.dataset.buy;
      const offer = this.game.shopStock[i];
      if (offer) this._bindTip(el, offer.item, loadout);
      if (offer && essence < offer.price) { el.style.opacity = '.45'; el.style.cursor = 'not-allowed'; }
    });
    this.shop.querySelector('#sh-close').onclick = () => this.closeShop();
    this.shop.querySelector('#sh-reroll').onclick = () => {
      if (this.game.spendEssence(5)) { this.game.rerollShop(); this.refreshShop(); }
    };
    this.shop.querySelectorAll('.gslot[data-buy]').forEach((el: any) => {
      el.onclick = () => { this._hideTip(); this._buy(+el.dataset.buy); };
    });
  }

  _buy(i) {
    const s = this.game.shopStock[i];
    if (!s || !this.game.spendEssence(s.price)) return;
    this.game.giveItem(s.item);
    this.game.emit('purchase', { price: s.price, item: s.item }); // telemetria (ADR 0102)
    this.game.shopStock.splice(i, 1);
    this.refreshShop();
  }

  closeShop() {
    this.shop.classList.remove('show');
    this.game.paused = false;
  }

  // --- Baú compartilhado ---------------------------------------------------
  openStash() {
    if (this.game.paused) return;
    this.stash.classList.add('show');
    this.game.paused = true;
    this.refreshStash();
  }

  _p1Inv() {
    for (const [id, pc] of this.game.world.query(C.PlayerControlled)) if (pc.index === 0) return this.game.world.get(id, C.Inventory);
    return null;
  }

  refreshStash() {
    const inv = this._p1Inv();
    const chest = this.game.sharedChest;
    const itemRow = (it, attr) => {
      const stat = it.type === 'weapon' ? `dano ${it.damage}` : it.type === 'armor' ? `arm ${(it.armor * 100) | 0}%` : 'artefato';
      return `<div class="it" ${attr}><span><span class="dot" style="background:${RCOLOR[it.rarity]}"></span>${it.name}</span><span class="sub">${stat}</span></div>`;
    };
    this.stash.innerHTML = `<div class="panel">
      <span class="close" id="st-close">✕ (E/Esc)</span>
      <h2>📦 Baú compartilhado</h2>
      <div class="inv">
        <div><div class="lbl" style="margin-bottom:4px">Mochila (P1) — clique para guardar</div>
          <div class="items" id="st-bag">${inv.items.length ? inv.items.map((it, i) => itemRow(it, `data-dep="${i}"`)).join('') : '<div class="sub">Vazia.</div>'}</div></div>
        <div><div class="lbl" style="margin-bottom:4px">Baú — clique para retirar</div>
          <div class="items" id="st-chest">${chest.length ? chest.map((it, i) => itemRow(it, `data-wd="${i}"`)).join('') : '<div class="sub">Vazio.</div>'}</div></div>
      </div>
    </div>`;
    this.stash.querySelector('#st-close').onclick = () => this.closeStash();
    this.stash.querySelectorAll('.it[data-dep]').forEach((el) => {
      el.onclick = () => { chest.push(inv.items.splice(+el.dataset.dep, 1)[0]); this.refreshStash(); };
    });
    this.stash.querySelectorAll('.it[data-wd]').forEach((el) => {
      el.onclick = () => { inv.items.push(chest.splice(+el.dataset.wd, 1)[0]); this.refreshStash(); };
    });
  }

  closeStash() {
    this.stash.classList.remove('show');
    this.game.paused = false;
  }

  // --- Dom do Santuário (ADR 0050) ------------------------------------------
  openBoonChooser(form) {
    const opts = BOONS[form];
    if (!opts || this.game.boons?.[form]) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:32;display:flex;align-items:center;justify-content:center;background:rgba(4,8,5,.88);font-family:system-ui,sans-serif;color:#eaf3e6';
    wrap.innerHTML = `<div style="background:rgba(10,20,12,.96);border:1px solid rgba(159,224,106,.4);border-radius:12px;padding:22px 26px;max-width:560px;text-align:center">
      <h2 style="margin:0 0 6px;color:#9fe06a">✨ Dom do Santuário</h2>
      <p style="opacity:.8;margin:0 0 16px">A Forma desperta e oferece um dom permanente. Escolha com sabedoria.</p>
      <div style="display:flex;gap:12px;justify-content:center">${opts.map((b) => `
        <button data-boon="${b.id}" style="flex:1;cursor:pointer;background:rgba(159,224,106,.08);border:1px solid rgba(159,224,106,.35);border-radius:10px;padding:14px;color:#eaf3e6">
          <div style="font-size:26px">${b.icon}</div>
          <div style="font-weight:700;margin:6px 0 4px">${b.name}</div>
          <div style="font-size:12px;opacity:.75">${b.desc}</div>
        </button>`).join('')}
      </div></div>`;
    document.body.appendChild(wrap);
    this.game.paused = true;
    wrap.querySelectorAll('button[data-boon]').forEach((el) => {
      (el as HTMLElement).onclick = () => {
        chooseBoon(this.game, form, (el as HTMLElement).dataset.boon);
        wrap.remove();
        this.game.paused = false;
      };
    });
  }

}
