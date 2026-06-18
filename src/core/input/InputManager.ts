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
      if (e.button === 0) this.mouse.down = true;
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
   * Estado abstrato de um jogador. playerIndex 0 = teclado/mouse;
   * 1..3 = gamepad (mapeado via this._gamepadPlayers).
   */
  getPlayerInput(playerIndex) {
    if (playerIndex === 0) return this._keyboardInput();
    const padIndex = this._gamepadPlayers[playerIndex - 1];
    if (padIndex === undefined) return this._empty();
    const pad = (navigator.getGamepads?.() ?? [])[padIndex];
    if (!pad) return this._empty();
    return this._padInput(pad);
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
      switchForm,
      interact: jp(4), // LB
    };
  }
}
