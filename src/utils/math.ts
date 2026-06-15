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
