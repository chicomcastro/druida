/**
 * Ícones de item pixel-art procedurais (ADR 0090 — UI MCD 2.0). Desenha um
 * glifo reconhecível por tipo/família/peça num canvas pequeno e devolve um
 * data URL (cacheado) para usar como `background-image` nos slots. Nada de
 * assets externos. Headless-safe: sem `document`, devolve '' (testes em node).
 */
const GRID = 12;
const SCALE = 4;
const _cache = new Map<string, string>();

const ELEMENT: Record<string, string> = {
  nature: '#6ab04a', fire: '#ff7a3a', ice: '#7ac8ff', storm: '#c8a0ff',
};
const RARITY: Record<string, string> = {
  common: '#c9c9c9', rare: '#5aa0ff', unique: '#ffc83a',
};

type Cell = [number, number, string];

function paint(cells: Cell[], bg: string): string {
  if (typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = cv.height = GRID * SCALE;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  // Fundo levemente arredondado (leitura de slot).
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cv.width, cv.height);
  for (const [x, y, c] of cells) {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
    ctx.fillStyle = c;
    ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
  }
  return cv.toDataURL();
}

/** Sombra/contorno escuro sob uma célula (dá volume voxel). */
function shade(c: string): string {
  return c === '#000' ? '#000' : darken(c, 0.55);
}
function darken(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

// --- Glifos ---------------------------------------------------------------
function axe(el: string): Cell[] {
  const h = '#6b4a2f', b = el;
  const c: Cell[] = [];
  for (let i = 0; i < 8; i++) c.push([4 + i * 0.0 | 0, 3 + i, h]); // cabo diagonal aprox
  // cabeça do machado
  for (const [x, y] of [[5, 2], [6, 2], [7, 2], [5, 3], [6, 3], [7, 3], [8, 3], [6, 4], [7, 4], [8, 4]]) c.push([x, y, b]);
  return c;
}
function scythe(el: string): Cell[] {
  const h = '#6b4a2f', b = el;
  const c: Cell[] = [];
  for (let i = 0; i < 8; i++) c.push([4, 3 + i, h]);
  for (const [x, y] of [[4, 2], [5, 2], [6, 3], [7, 3], [8, 4], [3, 3]]) c.push([x, y, b]);
  return c;
}
function claws(el: string): Cell[] {
  const b = el;
  const c: Cell[] = [];
  for (const cx of [3, 6, 9]) for (let i = 0; i < 5; i++) c.push([cx, 3 + i, b]);
  return c;
}
function staff(el: string): Cell[] {
  const h = '#8a6b4a', b = el;
  const c: Cell[] = [];
  for (let i = 0; i < 8; i++) c.push([6, 4 + i, h]);
  for (const [x, y] of [[5, 2], [6, 2], [7, 2], [5, 3], [6, 3], [7, 3], [6, 1]]) c.push([x, y, b]);
  return c;
}
function helmet(): Cell[] {
  const m = '#9aa0ad';
  const c: Cell[] = [];
  for (let x = 3; x <= 8; x++) for (let y = 3; y <= 6; y++) c.push([x, y, m]);
  for (let x = 3; x <= 8; x++) c.push([x, 7, '#3a3a45']); // visor
  return c;
}
function chest(): Cell[] {
  const m = '#9aa0ad';
  const c: Cell[] = [];
  for (let x = 3; x <= 8; x++) for (let y = 3; y <= 8; y++) c.push([x, y, m]);
  c.push([2, 3, m], [9, 3, m]); // ombreiras
  return c;
}
function legs(): Cell[] {
  const m = '#9aa0ad';
  const c: Cell[] = [];
  for (const cx of [4, 7]) for (let y = 3; y <= 9; y++) { c.push([cx, y, m]); c.push([cx + 1, y, m]); }
  return c;
}
function boots(): Cell[] {
  const m = '#9aa0ad';
  const c: Cell[] = [];
  for (const cx of [3, 7]) { for (let y = 4; y <= 7; y++) { c.push([cx, y, m]); c.push([cx + 1, y, m]); } c.push([cx + 2, 7, m]); }
  return c;
}
function artifact(el: string): Cell[] {
  const b = el;
  return [[6, 2, b], [5, 3, b], [6, 3, b], [7, 3, b], [4, 4, b], [5, 4, b], [6, 4, b], [7, 4, b], [8, 4, b], [5, 5, b], [6, 5, b], [7, 5, b], [6, 6, b]] as Cell[];
}
function flask(color: string): Cell[] {
  const g = '#cfe8ff';
  const c: Cell[] = [];
  c.push([6, 1, g], [5, 2, g], [6, 2, g]); // gargalo
  for (let x = 4; x <= 8; x++) for (let y = 4; y <= 9; y++) c.push([x, y, y >= 6 ? color : g]); // corpo + líquido
  return c;
}

/** data URL do ícone de um item (cacheado). */
export function itemIconURL(item: any): string {
  if (!item) return '';
  const el = ELEMENT[item.element] ?? '#b6c07a';
  const key = `${item.type}:${item.family ?? item.slot ?? item.effect ?? ''}:${item.element ?? ''}:${item.rarity ?? ''}`;
  const hit = _cache.get(key);
  if (hit !== undefined) return hit;

  let cells: Cell[] = [];
  if (item.type === 'weapon') {
    cells = item.family === 'axe' ? axe(el) : item.family === 'scythe' ? scythe(el)
      : item.family === 'claws' ? claws(el) : staff(el);
  } else if (item.type === 'armor') {
    cells = item.slot === 'head' ? helmet() : item.slot === 'legs' ? legs()
      : item.slot === 'boots' ? boots() : chest();
  } else if (item.type === 'consumable') {
    cells = flask(item.rarityColor ? '#ff6a8a' : '#ff6a8a');
  } else {
    cells = artifact(el);
  }
  // Contorno de raridade: moldura fina.
  const rc = RARITY[item.rarity] ?? '#c9c9c9';
  const frame: Cell[] = [];
  for (let i = 0; i < GRID; i++) { frame.push([i, 0, rc], [i, GRID - 1, rc], [0, i, rc], [GRID - 1, i, rc]); }
  // Sombra 1px deslocada sob o glifo (volume).
  const shadow: Cell[] = cells.map(([x, y, c]) => [x + 1, y + 1, shade(c)] as Cell);

  const url = paint([...frame, ...shadow, ...cells], '#1a1712');
  _cache.set(key, url);
  return url;
}
