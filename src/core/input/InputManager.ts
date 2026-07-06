/**
 * Gerencia entrada de múltiplos jogadores locais (same-screen).
 * - P1: teclado + mouse (ou um gamepad, se preferir).
 * - P2..P4: gamepads (Gamepad API).
 *
 * Expõe um snapshot por jogador via `getPlayerInput(index)`. O mapeamento de
 * teclas/botões vive aqui; sistemas consomem apenas o estado abstrato.
 */
import { loadBindings, saveBindings, resetBindings } from './bindings.js';

export class InputManager {
  camera: any;
  keys: Set<string>;
  mouse: { x: number; z: number; down: boolean };
  _justPressed: Set<string>;
  _prevKeys: Set<string>;
  _prevPads: Map<number, boolean[]>;
  _gamepadPlayers: number[];
  bindings: Record<string, string[]>;

  constructor(camera) {
    this.bindings = loadBindings();
    this.camera = camera; // IsoCamera (screenToGround disponível, hoje sem uso para mira)
    this.keys = new Set();
    this.mouse = { x: 0, z: 0, down: false };
    this._justPressed = new Set();
    this._prevKeys = new Set();
    this._prevPads = new Map(); // index -> botões anteriores
    this._gamepadPlayers = []; // index do navigator.getGamepads associado a P2..

    addEventListener('keydown', (e) => {
      if (!e.repeat) this.keys.add(e.code);
      // Evita scroll com setas/espaço/tab quando jogando.
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('mousemove', (e) => {
      const g = this.camera?.screenToGround(e.clientX, e.clientY);
      if (g) {
        this.mouse.x = g.x;
        this.mouse.z = g.z;
      }
    });
    addEventListener('mousedown', (e) => {
      // Só o canvas ataca: cliques/toques na UI não podem virar golpe.
      if (e.button === 0 && (e.target as HTMLElement)?.tagName === 'CANVAS') this.mouse.down = true;
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
    });
    addEventListener('blur', () => this.keys.clear());
  }

  _anyKey(codes) {
    for (const c of codes) if (this.keys.has(c)) return true;
    return false;
  }

  /** Chamar no fim de cada frame de update para detectar "just pressed". */
  endFrame() {
    this.touch?.endFrame();
    this._prevKeys = new Set(this.keys);
    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad) continue;
      this._prevPads.set(pad.index, pad.buttons.map((b) => b.pressed));
    }
  }

  keyJustPressed(action) {
    const codes = this.bindings[action] ?? [];
    for (const c of codes) if (this.keys.has(c) && !this._prevKeys.has(c)) return true;
    return false;
  }

  /** Lista os gamepads conectados (não-nulos). */
  connectedPads() {
    return (navigator.getGamepads?.() ?? []).filter(Boolean);
  }

  /**
   * Estado abstrato de um jogador. playerIndex 0 = teclado/mouse + touch +
   * gamepad LIVRE (controle dedicado em tablet — ADR 0053); 1..3 = gamepads
   * que entraram com START (mapeados via this._gamepadPlayers).
   */
  getPlayerInput(playerIndex) {
    if (playerIndex === 0) {
      const kb = this._keyboardInput();
      const touch = this.touch?.state;
      const pad = this._freePad();
      const merged = pad ? this._merge(kb, this._padInput(pad)) : kb;
      return touch ? this._merge(merged, touch) : merged;
    }
    const padIndex = this._gamepadPlayers[playerIndex - 1];
    if (padIndex === undefined) return this._empty();
    const pad = (navigator.getGamepads?.() ?? [])[padIndex];
    if (!pad) return this._empty();
    return this._padInput(pad);
  }

  /** Controles touch (definido pelo Game quando o dispositivo tem toque). */
  touch: any = null;

  /** Primeiro gamepad não reservado por P2+ — dirige o P1. */
  _freePad() {
    for (const pad of this.connectedPads()) {
      if (!this._gamepadPlayers.includes(pad.index)) return pad;
    }
    return null;
  }

  /** Combina duas fontes de entrada do mesmo jogador (teclado+pad+touch). */
  _merge(a, b) {
    return {
      moveX: Math.abs(b.moveX) > Math.abs(a.moveX) ? b.moveX : a.moveX,
      moveZ: Math.abs(b.moveZ) > Math.abs(a.moveZ) ? b.moveZ : a.moveZ,
      aimX: 0, aimZ: 0, hasAim: false, aimIsWorldPoint: false,
      attack: a.attack || b.attack,
      dodge: a.dodge || b.dodge,
      artifact: [0, 1, 2].map((i) => a.artifact[i] || b.artifact[i]),
      hotbar: [0, 1, 2, 3].map((i) => a.hotbar[i] || b.hotbar[i]),
      switchForm: b.switchForm || a.switchForm,
      interact: a.interact || b.interact,
    };
  }

  assignPad(playerIndex, padIndex) {
    this._gamepadPlayers[playerIndex - 1] = padIndex;
  }

  /** Redefine a tecla de uma ação (rebind do P1) e persiste. */
  setBinding(action, code) {
    this.bindings[action] = [code];
    saveBindings(this.bindings);
  }

  resetBindings() {
    resetBindings();
    this.bindings = loadBindings();
  }

  _empty() {
    return {
      moveX: 0, moveZ: 0, aimX: 0, aimZ: 0, hasAim: false,
      attack: false, dodge: false, artifact: [false, false, false],
      hotbar: [false, false, false, false],
      switchForm: 0, interact: false,
    };
  }

  _keyboardInput() {
    const mx = (this._anyKey(this.bindings.right) ? 1 : 0) - (this._anyKey(this.bindings.left) ? 1 : 0);
    const mz = (this._anyKey(this.bindings.down) ? 1 : 0) - (this._anyKey(this.bindings.up) ? 1 : 0);
    let switchForm = 0;
    for (let i = 0; i < 5; i++) if (this.keyJustPressed(`form${i}`)) switchForm = i + 1;
    return {
      moveX: mx,
      moveZ: mz,
      // Sem mira por cursor: o personagem olha para onde se move (resolvido no
      // playerControl pela direção do movimento; mantém a última ao parar).
      aimX: 0,
      aimZ: 0,
      hasAim: false,
      aimIsWorldPoint: false,
      attack: this.mouse.down || this._anyKey(this.bindings.attack),
      dodge: this.keyJustPressed('dodge'),
      artifact: [
        this.keyJustPressed('artifact0'),
        this.keyJustPressed('artifact1'),
        this.keyJustPressed('artifact2'),
      ],
      hotbar: [
        this.keyJustPressed('hotbar0'),
        this.keyJustPressed('hotbar1'),
        this.keyJustPressed('hotbar2'),
        this.keyJustPressed('hotbar3'),
      ],
      switchForm,
      interact: this.keyJustPressed('interact'),
    };
  }

  _padInput(pad) {
    const dz = 0.22;
    const ax = Math.abs(pad.axes[0]) > dz ? pad.axes[0] : 0;
    const az = Math.abs(pad.axes[1]) > dz ? pad.axes[1] : 0;
    const prev = this._prevPads.get(pad.index) ?? [];
    const jp = (i) => pad.buttons[i]?.pressed && !prev[i];
    let switchForm = 0;
    // D-pad (12..15) troca formas no gamepad.
    if (jp(14)) switchForm = 1;
    else if (jp(15)) switchForm = 2;
    else if (jp(12)) switchForm = 3;
    else if (jp(13)) switchForm = 4;
    return {
      moveX: ax,
      moveZ: az,
      // Olha para a direção do movimento (sem mira independente por stick).
      aimX: 0,
      aimZ: 0,
      hasAim: false,
      aimIsWorldPoint: false,
      attack: pad.buttons[0]?.pressed || pad.buttons[7]?.pressed, // A / RT
      dodge: jp(1) || jp(5), // B / RB
      artifact: [jp(2), jp(3), jp(6)], // X, Y, LT
      hotbar: [false, false, false, false], // hotbar 1–4 é teclado (E17.3b)
      switchForm,
      interact: jp(4), // LB
    };
  }
}
