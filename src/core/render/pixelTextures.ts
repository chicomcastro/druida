import * as THREE from 'three';

/**
 * Texturas pixel-art procedurais 16×16 (ADR 0062 — direção de arte estilo
 * Minecraft Dungeons). Geradas via canvas em tons de LUMINÂNCIA (base branca
 * com variação de valor): a cor final vem do `material.color`/`instanceColor`,
 * então todo o sistema de recolorir por bioma/pureza continua funcionando.
 * NearestFilter dá o pixel duro; mipmap linear no min evita cintilar de longe.
 * Headless-safe: sem `document`, devolve null (testes em node).
 */

const SIZE = 16;
const _cache = new Map<string, THREE.Texture | null>();

/** RNG determinístico (mulberry32): texturas idênticas a cada sessão. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Kind = 'grass' | 'dirt' | 'stone' | 'planks' | 'log' | 'leaves' | 'thatch' | 'snow' | 'cloth';

/** Preenche a grade 16×16 com valores [0..1] de luminância por tipo. */
function values(kind: Kind): number[] {
  const r = rng(kind.length * 1009 + kind.charCodeAt(0) * 97);
  const v: number[] = new Array(SIZE * SIZE).fill(0.86);
  const at = (x: number, y: number) => ((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE);

  for (let i = 0; i < v.length; i++) v[i] = 0.82 + r() * 0.16; // jitter base

  if (kind === 'grass') {
    for (let i = 0; i < 26; i++) v[at(Math.floor(r() * 16), Math.floor(r() * 16))] *= 0.74; // tufos escuros
    for (let i = 0; i < 10; i++) v[at(Math.floor(r() * 16), Math.floor(r() * 16))] = 1.0; // lâminas claras
  } else if (kind === 'dirt') {
    for (let i = 0; i < 7; i++) {
      const cx = Math.floor(r() * 16), cy = Math.floor(r() * 16), s = 1 + Math.floor(r() * 2);
      for (let dx = 0; dx <= s; dx++) for (let dy = 0; dy <= s; dy++) v[at(cx + dx, cy + dy)] *= 0.72;
    }
  } else if (kind === 'stone') {
    for (let i = 0; i < 5; i++) {
      const cx = Math.floor(r() * 16), cy = Math.floor(r() * 16), s = 2 + Math.floor(r() * 3);
      for (let dx = 0; dx <= s; dx++) for (let dy = 0; dy <= Math.max(1, s - dx); dy++) v[at(cx + dx, cy + dy)] *= 0.78;
    }
    for (let i = 0; i < 6; i++) v[at(Math.floor(r() * 16), Math.floor(r() * 16))] = 1.0; // brilho mineral
  } else if (kind === 'planks') {
    for (let y = 0; y < 16; y++) {
      const board = Math.floor(y / 4);
      const bias = 0.9 + (board % 2) * 0.08;
      for (let x = 0; x < 16; x++) v[at(x, y)] = (0.8 + r() * 0.12) * bias;
      if (y % 4 === 0) for (let x = 0; x < 16; x++) v[at(x, y)] *= 0.62; // ranhura
    }
    for (let b = 0; b < 4; b++) { // emendas verticais alternadas + nós
      const x = Math.floor(r() * 16);
      for (let y = b * 4 + 1; y < b * 4 + 4; y++) v[at(x, y)] *= 0.68;
      v[at(Math.floor(r() * 16), b * 4 + 1 + Math.floor(r() * 3))] *= 0.6;
    }
  } else if (kind === 'log') {
    for (let x = 0; x < 16; x++) {
      const stripe = 0.72 + r() * 0.3;
      for (let y = 0; y < 16; y++) v[at(x, y)] = stripe * (0.9 + r() * 0.16);
    }
  } else if (kind === 'leaves') {
    for (let i = 0; i < 30; i++) v[at(Math.floor(r() * 16), Math.floor(r() * 16))] *= 0.68; // buracos
    for (let i = 0; i < 14; i++) v[at(Math.floor(r() * 16), Math.floor(r() * 16))] = 1.0; // folhas ao sol
  } else if (kind === 'thatch') {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const band = (x + y) % 5;
      v[at(x, y)] = (band === 0 ? 0.68 : 0.84 + band * 0.04) * (0.92 + r() * 0.12);
    }
  } else if (kind === 'snow') {
    for (let i = 0; i < v.length; i++) v[i] = 0.93 + r() * 0.07;
    for (let i = 0; i < 8; i++) v[at(Math.floor(r() * 16), Math.floor(r() * 16))] *= 0.9;
  } else if (kind === 'cloth') {
    // Tecido dos personagens (ADR 0066): trama sutil, sem contraste forte —
    // é textura de pele/roupa, não de bloco.
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      v[at(x, y)] = 0.92 + ((x + y) % 2) * 0.035 + r() * 0.045;
    }
  }

  // Moldura 1px levemente escura: a leitura de "bloco" ao repetir no chão.
  if (kind === 'grass' || kind === 'dirt' || kind === 'stone' || kind === 'snow') {
    for (let i = 0; i < 16; i++) {
      v[at(i, 0)] *= 0.9; v[at(0, i)] *= 0.9;
    }
  }
  return v;
}

/** Textura compartilhada por tipo (cache). `null` em ambiente sem DOM. */
export function pixelTexture(kind: Kind): THREE.Texture | null {
  if (_cache.has(kind)) return _cache.get(kind)!;
  if (typeof document === 'undefined') { _cache.set(kind, null); return null; }
  const cv = document.createElement('canvas');
  cv.width = cv.height = SIZE;
  const ctx = cv.getContext('2d');
  if (!ctx) { _cache.set(kind, null); return null; }
  const img = ctx.createImageData(SIZE, SIZE);
  const v = values(kind);
  for (let i = 0; i < v.length; i++) {
    const c = Math.round(Math.min(1, v[i]) * 255);
    img.data[i * 4] = c; img.data[i * 4 + 1] = c; img.data[i * 4 + 2] = c; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter; // pixel duro perto, sem shimmer longe
  tex.colorSpace = THREE.SRGBColorSpace;
  _cache.set(kind, tex);
  return tex;
}

/**
 * Clone com repeat próprio (mesma imagem na GPU): superfícies grandes mantêm
 * a densidade de ~16px por unidade de mundo — a régua do estilo.
 */
const _tiledCache = new Map<string, THREE.Texture | null>();
export function tiledPixelTexture(kind: Kind, rx: number, ry: number): THREE.Texture | null {
  const kx = Math.max(1, Math.round(rx)), ky = Math.max(1, Math.round(ry));
  const key = `${kind}:${kx}:${ky}`;
  if (_tiledCache.has(key)) return _tiledCache.get(key)!;
  const base = pixelTexture(kind);
  if (!base) { _tiledCache.set(key, null); return null; }
  const t = base.clone();
  t.repeat.set(kx, ky);
  t.needsUpdate = true;
  _tiledCache.set(key, t);
  return t;
}
