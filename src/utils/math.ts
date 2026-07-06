// Utilidades de matemática e RNG seedável usadas em todo o jogo.

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist2 = (ax, az, bx, bz) => {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
};
export const dist = (ax, az, bx, bz) => Math.sqrt(dist2(ax, az, bx, bz));

export function normalize(x, z) {
  const len = Math.hypot(x, z);
  if (len < 1e-6) return { x: 0, z: 0, len: 0 };
  return { x: x / len, z: z / len, len };
}

export const angleTo = (fromX, fromZ, toX, toZ) =>
  Math.atan2(toX - fromX, toZ - fromZ);

/** RNG determinístico (mulberry32) — útil para geração de mundo reprodutível. */
export function makeRng(seed) {
  let a = seed >>> 0;
  const rng = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (min, max) => min + rng() * (max - min);
  rng.int = (min, max) => Math.floor(rng.range(min, max + 1));
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.chance = (p) => rng() < p;
  return rng;
}

/** Hash determinístico de uma célula inteira -> [0,1). */
function hash2(ix, iz) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Value-noise 2D suave e determinístico em [-1,1] (bilerp com smoothstep sobre
 * uma grade de hashes). Sem estado nem Math.random — seguro para geração de
 * mundo reprodutível e para funções puras como `biomeAt`.
 */
export function valueNoise2(x, z) {
  const x0 = Math.floor(x), z0 = Math.floor(z);
  const fx = x - x0, fz = z - z0;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const n00 = hash2(x0, z0), n10 = hash2(x0 + 1, z0);
  const n01 = hash2(x0, z0 + 1), n11 = hash2(x0 + 1, z0 + 1);
  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return (nx0 + (nx1 - nx0) * sz) * 2 - 1;
}

/** Escolha ponderada: items = [{weight, ...}] */
export function weightedPick(items, rng = Math.random) {
  let total = 0;
  for (const it of items) total += it.weight ?? 1;
  let r = rng() * total;
  for (const it of items) {
    r -= it.weight ?? 1;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}
