/**
 * Mapeamento de teclas (rebindável) do jogador 1. Padrão + overrides salvos em
 * localStorage. Cada ação mapeia para uma lista de `KeyboardEvent.code`.
 * Ver ADR 0023.
 */
export const DEFAULT_BINDINGS: Record<string, string[]> = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  attack: ['KeyJ', 'Space'],
  dodge: ['ShiftLeft', 'KeyL'],
  artifact0: ['KeyU'],
  artifact1: ['KeyI'],
  artifact2: ['KeyO'],
  hotbar0: ['Digit1'],
  hotbar1: ['Digit2'],
  hotbar2: ['Digit3'],
  hotbar3: ['Digit4'],
  hotbar4: ['Digit5'],
  hotbar5: ['Digit6'],
  hotbar6: ['Digit7'],
  hotbar7: ['Digit8'],
  hotbar8: ['Digit9'],
  interact: ['KeyE', 'KeyF'],
  pause: ['Escape', 'KeyP'],
  inventory: ['KeyB', 'Tab'],
};

/** Ações expostas na tela de rebind (apenas as de gameplay do P1). */
export const REBINDABLE: Array<{ action: string; label: string }> = [
  { action: 'up', label: 'Mover ↑' },
  { action: 'down', label: 'Mover ↓' },
  { action: 'left', label: 'Mover ←' },
  { action: 'right', label: 'Mover →' },
  { action: 'attack', label: 'Atacar' },
  { action: 'dodge', label: 'Esquivar' },
  { action: 'artifact0', label: 'Artefato 1' },
  { action: 'artifact1', label: 'Artefato 2' },
  { action: 'artifact2', label: 'Artefato 3' },
  { action: 'hotbar0', label: 'Hotbar 1' },
  { action: 'hotbar1', label: 'Hotbar 2' },
  { action: 'hotbar2', label: 'Hotbar 3' },
  { action: 'hotbar3', label: 'Hotbar 4' },
  { action: 'hotbar4', label: 'Hotbar 5' },
  { action: 'hotbar5', label: 'Hotbar 6' },
  { action: 'hotbar6', label: 'Hotbar 7' },
  { action: 'hotbar7', label: 'Hotbar 8' },
  { action: 'hotbar8', label: 'Hotbar 9' },
  { action: 'interact', label: 'Interagir' },
];

const KEY = 'druida.bindings.v1';

export function loadBindings(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const k of Object.keys(DEFAULT_BINDINGS)) map[k] = [...DEFAULT_BINDINGS[k]];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      for (const k of Object.keys(stored)) if (map[k]) map[k] = stored[k];
    }
  } catch { /* noop */ }
  return map;
}

export function saveBindings(map: Record<string, string[]>) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* noop */ }
}

export function resetBindings() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

/** Rótulo amigável de um KeyboardEvent.code. */
export function keyLabel(code: string): string {
  if (!code) return '—';
  return code
    .replace(/^Key/, '')
    .replace(/^Digit/, '')
    .replace(/^Arrow/, '')
    .replace('ShiftLeft', 'Shift')
    .replace('ShiftRight', 'Shift')
    .replace('Space', 'Espaço');
}
