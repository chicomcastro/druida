/**
 * Direção "esperta" dos aldeões (E23.5). Antes eles andavam em linha reta até um
 * alvo aleatório e se batiam entre si, nas casas e na Carvalho-Mãe. Aqui ficam as
 * forças de steering (puras/testáveis) que o SettlementManager soma ao rumo:
 *
 *  - **separação**: afasta de vizinhos muito próximos (não se amontoam/empurram);
 *  - **desvio**: empurra para longe de retângulos de estrutura (footprints) que o
 *    aldeão esteja prestes a atravessar — casas, banca, árvore-mãe;
 *  - **pointInRects**: rejeita alvos que caiam dentro de uma estrutura (não mirar
 *    dentro da árvore/casa).
 *
 * Footprints usam coordenadas LOCAIS da vila (x0..x1,z0..z1); como o steering só
 * devolve DIREÇÕES (sem rotação da vila), a mesma direção vale em mundo.
 */

export interface Rect { x0: number; x1: number; z0: number; z1: number }
export interface Pt { x: number; z: number }

/** Está o ponto dentro de algum retângulo (com margem)? */
export function pointInRects(x: number, z: number, rects: Rect[], margin = 0): boolean {
  for (const r of rects) {
    if (x > r.x0 - margin && x < r.x1 + margin && z > r.z0 - margin && z < r.z1 + margin) return true;
  }
  return false;
}

/** Força de separação: soma de vetores para longe de vizinhos dentro do raio. */
export function separationForce(x: number, z: number, neighbors: Pt[], radius = 1.5): Pt {
  let sx = 0, sz = 0;
  for (const n of neighbors) {
    const dx = x - n.x, dz = z - n.z;
    const d = Math.hypot(dx, dz);
    if (d > 1e-4 && d < radius) {
      const w = (radius - d) / radius; // mais forte quanto mais perto
      sx += (dx / d) * w; sz += (dz / d) * w;
    }
  }
  return { x: sx, z: sz };
}

/**
 * Força de desvio de estruturas: para cada retângulo próximo, empurra o aldeão
 * para longe do ponto mais próximo do retângulo (ou para fora, se já dentro).
 */
export function avoidForce(x: number, z: number, rects: Rect[], radius = 2.0): Pt {
  let ax = 0, az = 0;
  for (const r of rects) {
    const cx = Math.max(r.x0, Math.min(x, r.x1));
    const cz = Math.max(r.z0, Math.min(z, r.z1));
    const dx = x - cx, dz = z - cz;
    const d = Math.hypot(dx, dz);
    if (d >= radius) continue;
    if (d < 1e-3) {
      // Dentro do retângulo: empurra pela saída mais curta.
      const toL = x - r.x0, toR = r.x1 - x, toB = z - r.z0, toT = r.z1 - z;
      const m = Math.min(toL, toR, toB, toT);
      if (m === toL) ax -= 1; else if (m === toR) ax += 1; else if (m === toB) az -= 1; else az += 1;
    } else {
      const w = (radius - d) / radius;
      ax += (dx / d) * w; az += (dz / d) * w;
    }
  }
  return { x: ax, z: az };
}

/**
 * Rua explícita (ADR 0163): puxa o aldeão para a laje de rua mais próxima quando
 * ele está FORA dos caminhos (além da `deadzone`). Faz o povo andar pelas ruas
 * em vez de cortar reto pela grama — combina-se com o rumo ao alvo. `cells` são
 * pares [x,z] no MESMO referencial de (x,z). Devolve direção (unitária) ou zero.
 */
export function streetForce(x: number, z: number, cells: [number, number][], deadzone = 1.0): Pt {
  let bx = 0, bz = 0, bd = Infinity;
  for (const [cx, cz] of cells) {
    const d = (cx - x) * (cx - x) + (cz - z) * (cz - z);
    if (d < bd) { bd = d; bx = cx; bz = cz; }
  }
  if (bd === Infinity) return { x: 0, z: 0 };
  const dist = Math.sqrt(bd);
  if (dist <= deadzone) return { x: 0, z: 0 }; // já está na rua
  const dx = bx - x, dz = bz - z, m = Math.hypot(dx, dz) || 1;
  return { x: dx / m, z: dz / m };
}

/**
 * Combina o rumo desejado com separação e desvio, devolvendo um vetor unitário
 * (ou zero se nada empurra). Pesos: desvio manda mais que separação, que manda
 * mais que o rumo — evita atravessar casas, depois vizinhos, senão segue o alvo.
 */
export function steer(desire: Pt, sep: Pt, avoid: Pt, wSep = 1.3, wAvoid = 1.8): Pt {
  const x = desire.x + sep.x * wSep + avoid.x * wAvoid;
  const z = desire.z + sep.z * wSep + avoid.z * wAvoid;
  const d = Math.hypot(x, z);
  return d > 1e-4 ? { x: x / d, z: z / d } : { x: 0, z: 0 };
}

/**
 * Filtro passa-baixa (E46): aproxima um valor do alvo em ~`tau` segundos. Usado
 * para SUAVIZAR a velocidade dos aldeões/bichos — sem isso, quando as forças de
 * steering (desejo × desvio × rua) se invertem na borda de uma estrutura, a
 * direção pula 180° a cada frame e o NPC "vibra" pra frente/trás na tela. Com o
 * filtro, uma inversão de 1 frame só freia o NPC (ele PÁRA na borda), não o joga
 * pra trás. `dt/tau` limitado a 1 (nunca ultrapassa o alvo).
 */
export function approach(cur: number, target: number, dt: number, tau = 0.18): number {
  return cur + (target - cur) * Math.min(1, dt / Math.max(1e-4, tau));
}

/**
 * Gira `cur` em direção a `target` (radianos) pelo menor arco, no máximo
 * `dt*rate` por frame — evita o "flip" instantâneo de 180° na rotação quando o
 * rumo se inverte. Normaliza a diferença para [-π, π].
 */
export function turnToward(cur: number, target: number, dt: number, rate = 8): number {
  let diff = target - cur;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return cur + diff * Math.min(1, dt * rate);
}
