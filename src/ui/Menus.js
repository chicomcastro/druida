import { C } from '../core/ecs/components.js';
import { FORMS } from '../gameplay/forms.js';
import { ENCHANTMENTS, salvageValue } from '../gameplay/loot.js';
import { applyEquipment } from '../gameplay/equip.js';
import { saveToStorage, hasSave } from '../gameplay/save.js';

/**
 * Menus em overlay DOM: menu principal (novo/continuar), pausa e
 * inventário/equipamento/encantamento. Centraliza o controle de pausa e o
 * estado `game.paused`. Ver docs/adr/0009 (mesmo padrão do HUD).
 */
const css = `
.menu{position:fixed;inset:0;z-index:30;display:none;align-items:center;justify-content:center;background:rgba(4,8,5,.82);font-family:system-ui,sans-serif;color:#eaf3e6}
.menu.show{display:flex}
.panel{background:#0f1a12;border:1px solid rgba(159,224,106,.3);border-radius:14px;padding:24px 28px;min-width:320px;max-width:90vw;box-shadow:0 12px 40px rgba(0,0,0,.5)}
.panel h1{margin:0 0 4px;color:#9fe06a;font-size:34px}
.panel h2{margin:0 0 14px;font-size:18px}
.panel .sub{opacity:.7;margin:0 0 18px;font-size:13px}
.btn{display:block;width:100%;margin:8px 0;padding:11px 14px;border-radius:9px;border:1px solid rgba(255,255,255,.16);background:#1c2a18;color:#eaf3e6;font-size:15px;cursor:pointer;text-align:left}
.btn:hover{background:#27361f;border-color:#9fe06a}
.btn:disabled{opacity:.4;cursor:not-allowed}
.inv{display:grid;grid-template-columns:1fr 1fr;gap:18px;min-width:640px}
.slot{border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:13px}
.slot .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.08em;opacity:.6}
.items{max-height:260px;overflow:auto;display:flex;flex-direction:column;gap:6px}
.it{display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:6px 9px;font-size:12px;cursor:pointer}
.it:hover{background:#27361f}
.it .dot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:6px}
.ench{margin-top:6px}
.ench .row{display:flex;justify-content:space-between;align-items:center;font-size:12px;margin:3px 0}
.mini{padding:3px 8px;border-radius:6px;border:1px solid #9fe06a;background:#1c2a18;color:#eaf3e6;cursor:pointer}
.mini:disabled{opacity:.4;cursor:not-allowed;border-color:#555}
.close{float:right;opacity:.6;cursor:pointer}
`;

const RCOLOR = { common: '#d6d6d6', rare: '#5aa0ff', unique: '#ffc83a' };

export class Menus {
  constructor(game) {
    this.game = game;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    this.main = this._make('menu-main');
    this.pause = this._make('menu-pause');
    this.inv = this._make('menu-inv');
    document.body.append(this.main, this.pause, this.inv);

    addEventListener('keydown', (e) => {
      if (game.menuMain) return; // bloqueia até iniciar
      if (e.code === 'Escape' || e.code === 'KeyP') this.togglePause();
      else if (e.code === 'KeyB' || e.code === 'Tab') { e.preventDefault(); this.toggleInventory(); }
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
      <button class="btn" id="m-cont" style="text-align:center" ${hasSave() ? '' : 'disabled'}>📖 Continuar</button>
      <p class="sub" style="margin-top:14px">WASD mover · Mouse mirar · Clique atacar · 5–9 formas · U/I/O artefatos · Shift esquivar · E interagir · B inventário · Esc pausar</p>
    </div>`;
    this.main.classList.add('show');
    this.main.querySelector('#m-new').onclick = () => { this.main.classList.remove('show'); this.game.menuMain = false; this.game.paused = false; onNew(); };
    const cont = this.main.querySelector('#m-cont');
    if (!cont.disabled) cont.onclick = () => { this.main.classList.remove('show'); this.game.menuMain = false; this.game.paused = false; onContinue(); };
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
    </div>`;
    this.pause.querySelector('#p-resume').onclick = () => this.togglePause();
    this.pause.querySelector('#p-save').onclick = (ev) => {
      const ok = saveToStorage(this.game);
      ev.target.textContent = ok ? '✓ Salvo!' : '✗ Erro ao salvar';
    };
    this.pause.querySelector('#p-mute').onclick = (ev) => {
      this.game.audio.setMuted(!this.game.audio.muted);
      ev.target.textContent = `🔊 Som: ${this.game.audio.muted ? 'desligado' : 'ligado'}`;
    };
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

    this.inv.innerHTML = `<div class="panel">
      <span class="close" id="iv-close">✕ (B)</span>
      <h2>Inventário — P1</h2>
      <p class="sub">Pontos de encanto: <b>${loadout.enchantPoints}</b> · Essência: <b>${inv.essence}</b> · Formas: ${forms}</p>
      <div class="inv">
        <div>
          <div class="lbl" style="margin-bottom:4px">Equipado</div>
          ${this._slotHtml('Arma', loadout.weapon)}
          ${this._slotHtml('Armadura', loadout.armor)}
          ${this._slotHtml('Artefato 1', loadout.artifacts[0])}
          ${this._slotHtml('Artefato 2', loadout.artifacts[1])}
          ${this._slotHtml('Artefato 3', loadout.artifacts[2])}
        </div>
        <div>
          <div class="lbl" style="margin-bottom:4px">Mochila (clique p/ equipar · botão direito p/ desmontar)</div>
          <div class="items" id="iv-items">
            ${inv.items.length ? inv.items.map((it, i) => this._itemHtml(it, i)).join('') : '<div class="sub">Vazia. Derrote inimigos para coletar loot.</div>'}
          </div>
        </div>
      </div>
    </div>`;

    this.inv.querySelector('#iv-close').onclick = () => this.toggleInventory();
    this.inv.querySelectorAll('.it').forEach((el) => {
      const i = +el.dataset.i;
      el.onclick = () => this._equipFromBag(id, i);
      el.oncontextmenu = (e) => { e.preventDefault(); this._salvage(id, i); };
    });
    this.inv.querySelectorAll('.mini[data-ench]').forEach((el) => {
      el.onclick = () => this._invest(id, el.dataset.slot, +el.dataset.ench);
    });
  }

  _slotHtml(label, item) {
    if (!item) return `<div class="slot"><div class="lbl">${label}</div>— vazio —</div>`;
    const enchHtml = (item.enchants ?? []).map((e, ei) => {
      const def = ENCHANTMENTS[e.id];
      const can = this._canInvest(item, e);
      return `<div class="row"><span title="${def?.desc ?? ''}">• ${def?.name ?? e.id} <b>${e.level}/${e.max}</b></span>
        <button class="mini" data-ench="${ei}" data-slot="${this._slotKey(label)}" ${can ? '' : 'disabled'}>+1</button></div>`;
    }).join('');
    const stat = item.type === 'weapon' ? `dano ${item.damage} · ${item.element}`
      : item.type === 'armor' ? `armadura ${(item.armor * 100) | 0}%`
      : `concede habilidade`;
    return `<div class="slot"><div class="lbl">${label}</div>
      <span class="dot" style="background:${RCOLOR[item.rarity]}"></span><b>${item.name}</b>
      <div class="sub" style="margin:2px 0">${stat}</div>
      <div class="ench">${enchHtml || '<span class="sub">sem slots de encanto</span>'}</div></div>`;
  }

  _slotKey(label) {
    if (label.startsWith('Arma')) return label === 'Armadura' ? 'armor' : 'weapon';
    if (label.startsWith('Armadura')) return 'armor';
    if (label.startsWith('Artefato')) return 'artifact' + (label.split(' ')[1] - 1);
    return 'weapon';
  }

  _itemHtml(it, i) {
    const stat = it.type === 'weapon' ? `dano ${it.damage}` : it.type === 'armor' ? `arm ${(it.armor * 100) | 0}%` : 'artefato';
    return `<div class="it" data-i="${i}"><span><span class="dot" style="background:${RCOLOR[it.rarity]}"></span>${it.name}</span><span class="sub">${stat}</span></div>`;
  }

  _canInvest(item, ench) {
    const id = this._playerId();
    const loadout = this.game.world.get(id, C.Loadout);
    return loadout.enchantPoints > 0 && ench.level < ench.max;
  }

  _invest(id, slotKey, ei) {
    const loadout = this.game.world.get(id, C.Loadout);
    const item = slotKey === 'weapon' ? loadout.weapon : slotKey === 'armor' ? loadout.armor : loadout.artifacts[+slotKey.replace('artifact', '')];
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
}
