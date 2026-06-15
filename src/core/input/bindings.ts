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
  artifact0: ['KeyU', 'Digit1'],
  artifact1: ['KeyI', 'Digit2'],
  artifact2: ['KeyO', 'Digit3'],
  form0: ['Digit5'],
  form1: ['Digit6'],
  form2: ['Digit7'],
  form3: ['Digit8'],
  form4: ['Digit9'],
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
  { action: 'interact', label: 'Interagir' },
  { action: 'form1', label: 'Forma: Lobo' },
  { action: 'form2', label: 'Forma: Urso' },
  { action: 'form3', label: 'Forma: Corvo' },
  { action: 'form4', label: 'Forma: Sapo' },
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
