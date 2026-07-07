import { C } from '../core/ecs/components.js';

/**
 * Controles de toque para tablet/mobile (ADR 0053): joystick virtual de
 * origem dinâmica na metade esquerda da tela + botões de ação à direita
 * (atacar segurável; esquiva/interagir/artefatos/forma com semântica de
 * "just pressed"). Publica um snapshot em `this.state`, que o InputManager
 * mescla ao teclado/gamepad do P1; `endFrame()` limpa os pulsos.
 * Só é criado quando o dispositivo tem toque.
 */
export function isTouchDevice() {
  return typeof window !== 'undefined' &&
    (('ontouchstart' in window) || (navigator.maxTouchPoints ?? 0) > 0);
}

const BTN = (id: string, label: string, size: number, extra = '') =>
  `<div class="tbtn" id="${id}" style="width:${size}px;height:${size}px;font-size:${size * 0.34}px;${extra}">${label}</div>`;

export class TouchControls {
  game: any;
  state: any;
  root: HTMLElement;
  _stick: { id: number; ox: number; oy: number } | null;
  _base: HTMLElement;
  _knob: HTMLElement;

  constructor(game) {
    this.game = game;
    this.state = this._empty();
    this._stick = null;

    const style = document.createElement('style');
    style.textContent = `
      #touch-root{position:fixed;inset:0;z-index:14;pointer-events:none;font-family:system-ui,sans-serif;user-select:none;-webkit-user-select:none}
      #touch-root .tbtn{position:absolute;border-radius:50%;background:rgba(10,20,12,.45);border:2px solid rgba(159,224,106,.45);color:#eaf3e6;display:flex;align-items:center;justify-content:center;pointer-events:auto;touch-action:none;backdrop-filter:blur(2px)}
      #touch-root .tbtn:active,#touch-root .tbtn.on{background:rgba(159,224,106,.35)}
      #tc-base{position:absolute;width:110px;height:110px;border-radius:50%;border:2px solid rgba(159,224,106,.35);background:rgba(10,20,12,.3);display:none;pointer-events:none}
      #tc-knob{position:absolute;width:48px;height:48px;border-radius:50%;background:rgba(159,224,106,.5);display:none;pointer-events:none}
      #tc-zone{position:absolute;left:0;top:0;bottom:0;width:45%;pointer-events:auto;touch-action:none}
      /* Telas estreitas (celular em pé): aglomerado mais compacto, sem
         invadir o painel do P1 à esquerda (ADR 0068). */
      @media (max-width:540px){
        #tc-attack{right:16px !important;bottom:84px !important;width:72px !important;height:72px !important;font-size:30px !important}
        #tc-dodge{right:100px !important;bottom:38px !important}
        #tc-interact{right:102px !important;bottom:138px !important}
        #tc-form{right:26px !important;bottom:176px !important}
        #tc-a0{right:160px !important;bottom:30px !important}
        #tc-a1{right:202px !important;bottom:62px !important}
        #tc-a2{right:234px !important;bottom:104px !important}
      }
    `;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'touch-root';
    root.innerHTML = `
      <div id="tc-zone"></div>
      <div id="tc-base"></div><div id="tc-knob"></div>
      ${BTN('tc-attack', '⚔️', 84, 'right:26px;bottom:88px')}
      ${BTN('tc-dodge', '💨', 60, 'right:126px;bottom:40px')}
      ${BTN('tc-interact', '✋', 60, 'right:126px;bottom:150px')}
      ${BTN('tc-form', '🐾', 56, 'right:38px;bottom:196px')}
      ${BTN('tc-a0', 'U', 46, 'right:216px;bottom:26px')}
      ${BTN('tc-a1', 'I', 46, 'right:272px;bottom:52px')}
      ${BTN('tc-a2', 'O', 46, 'right:318px;bottom:98px')}
      ${BTN('tc-pause', '⏸', 42, 'right:14px;top:14px')}
      ${BTN('tc-map', '🗺️', 42, 'right:66px;top:14px')}
      ${BTN('tc-inv', '🎒', 42, 'right:118px;top:14px')}
      ${BTN('tc-skills', '🌿', 42, 'right:170px;top:14px')}
    `;
    document.body.appendChild(root);
    this.root = root;
    this._base = root.querySelector('#tc-base') as HTMLElement;
    this._knob = root.querySelector('#tc-knob') as HTMLElement;

    this._bindStick(root.querySelector('#tc-zone') as HTMLElement);
    this._bindHold('tc-attack', 'attack');
    this._bindPulse('tc-dodge', () => (this.state.dodge = true));
    this._bindPulse('tc-interact', () => (this.state.interact = true));
    this._bindPulse('tc-a0', () => (this.state.artifact[0] = true));
    this._bindPulse('tc-a1', () => (this.state.artifact[1] = true));
    this._bindPulse('tc-a2', () => (this.state.artifact[2] = true));
    this._bindPulse('tc-form', () => (this.state.switchForm = this._nextForm()));
    this._bindPulse('tc-pause', () => this.game.menus.togglePause());
    this._bindPulse('tc-map', () => this.game.worldMap.toggle());
    // Sem teclado no tablet (E23.4): mochila e talentos viram botões de toque.
    this._bindPulse('tc-inv', () => this.game.menus.toggleInventory());
    this._bindPulse('tc-skills', () => this.game.menus.toggleSkills());
  }

  /** Cicla para a próxima forma desbloqueada do P1 (1-based p/ o intent). */
  _nextForm() {
    for (const [, pc, form] of this.game.world.query(C.PlayerControlled, C.Form)) {
      if (pc.index !== 0) continue;
      const i = form.list.indexOf(form.current);
      return ((i + 1) % form.list.length) + 1;
    }
    return 0;
  }

  _bindStick(zone: HTMLElement) {
    const MAX = 52; // raio útil do stick (px)
    zone.addEventListener('pointerdown', (e) => {
      if (this._stick) return;
      this._stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
      try { zone.setPointerCapture(e.pointerId); } catch { /* ponteiro sintético/expirado */ }
      this._base.style.display = this._knob.style.display = 'block';
      this._place(this._base, e.clientX, e.clientY);
      this._place(this._knob, e.clientX, e.clientY);
    });
    zone.addEventListener('pointermove', (e) => {
      if (this._stick?.id !== e.pointerId) return;
      let dx = e.clientX - this._stick.ox;
      let dy = e.clientY - this._stick.oy;
      const len = Math.hypot(dx, dy);
      if (len > MAX) { dx *= MAX / len; dy *= MAX / len; }
      this._place(this._knob, this._stick.ox + dx, this._stick.oy + dy);
      const dead = 0.18;
      const nx = dx / MAX, ny = dy / MAX;
      this.state.moveX = Math.abs(nx) > dead ? nx : 0;
      this.state.moveZ = Math.abs(ny) > dead ? ny : 0;
    });
    const end = (e: PointerEvent) => {
      if (this._stick?.id !== e.pointerId) return;
      this._stick = null;
      this.state.moveX = this.state.moveZ = 0;
      this._base.style.display = this._knob.style.display = 'none';
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  _place(el: HTMLElement, x: number, y: number) {
    el.style.left = `${x - el.offsetWidth / 2}px`;
    el.style.top = `${y - el.offsetHeight / 2}px`;
  }

  _bindHold(id: string, key: string) {
    const el = this.root.querySelector(`#${id}`) as HTMLElement;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); this.state[key] = true; el.classList.add('on'); });
    const off = () => { this.state[key] = false; el.classList.remove('on'); };
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('pointerleave', off);
  }

  _bindPulse(id: string, fn: () => void) {
    const el = this.root.querySelector(`#${id}`) as HTMLElement;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); });
  }

  /** Limpa os pulsos "just pressed" (chamado pelo InputManager.endFrame). */
  endFrame() {
    this.state.dodge = false;
    this.state.interact = false;
    this.state.switchForm = 0;
    this.state.artifact = [false, false, false];
  }

  _empty() {
    return {
      moveX: 0, moveZ: 0, aimX: 0, aimZ: 0, hasAim: false, aimIsWorldPoint: false,
      attack: false, dodge: false, artifact: [false, false, false],
      hotbar: [false, false, false, false, false, false, false, false, false],
      switchForm: 0, interact: false,
    };
  }
}
