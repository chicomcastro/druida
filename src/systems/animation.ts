import type { Gait } from '../entities/voxelModels.js';

/**
 * Animação procedural dos modelos voxel: anima as PARTES nomeadas
 * (head/torso/armR/legL/…) em torno das juntas conforme o estado do ente
 * (parado/andando/atacando/atingido) e o `gait`. Sem clips/asset — tudo por
 * seno/fase. Só mexe em `.rotation`/`.position`, então é testável sem WebGL.
 * A animação de MORTE (tombar) fica no render, pois sobrepõe tudo.
 */
export interface AnimState {
  moving: boolean;
  speed: number;
  /** Intensidade do ataque em [0..1] (1 = acabou de golpear); 0 = sem ataque. */
  attack: number;
  /** Intensidade do recuo ao tomar dano em [0..1]; 0 = sem recuo. */
  react?: number;
  gait: Gait;
}

export function animateBody(body: any, dt: number, st: AnimState): void {
  const parts = body?.userData?.parts;
  if (!parts) return;

  const freq = st.moving ? 7 + Math.min(st.speed, 8) : 2.4;
  body.userData._phase = (body.userData._phase ?? 0) + dt * freq;
  const ph = body.userData._phase;
  const sw = Math.sin(ph);
  const amp = st.moving ? Math.min(1, 0.3 + st.speed * 0.12) : 0;
  const idle = Math.sin(ph * 0.5) * 0.04;
  const a = Math.min(1, st.attack ?? 0);
  const r = Math.min(1, st.react ?? 0);

  // Bob do corpo: saltitante ao andar, respiração leve parado.
  if (body.position) body.position.y = st.moving ? Math.abs(sw) * 0.06 : idle;

  // --- Locomoção por gait --------------------------------------------------
  let headX = 0;
  if (st.gait === 'biped') {
    if (parts.legL) parts.legL.rotation.x = sw * 0.6 * amp;
    if (parts.legR) parts.legR.rotation.x = -sw * 0.6 * amp;
    if (parts.armL) parts.armL.rotation.x = -sw * 0.5 * amp;
    if (parts.armR) parts.armR.rotation.x = sw * 0.5 * amp;
    if (parts.head) parts.head.rotation.z = idle;
  } else if (st.gait === 'quadruped') {
    const g = sw * 0.7 * amp;
    if (parts.legFL) parts.legFL.rotation.x = g;
    if (parts.legBR) parts.legBR.rotation.x = g;
    if (parts.legFR) parts.legFR.rotation.x = -g;
    if (parts.legBL) parts.legBL.rotation.x = -g;
    if (parts.tail) parts.tail.rotation.x = Math.sin(ph * 0.6) * 0.2 + 0.1;
    headX = idle;
  } else if (st.gait === 'bird') {
    const flap = Math.sin(ph * 1.6) * (st.moving ? 0.9 : 0.4);
    if (parts.wingL) parts.wingL.rotation.z = flap;
    if (parts.wingR) parts.wingR.rotation.z = -flap;
  }

  // --- Sobreposição de ataque (investida) ----------------------------------
  if (a > 0) {
    if (parts.armR) parts.armR.rotation.x = -1.5 * a; // braço/arma à frente
    if (parts.armL) parts.armL.rotation.x = -0.4 * a;
    if (parts.weapon) parts.weapon.rotation.x = -0.4 * a;
    headX = -0.35 * a; // investida de cabeça (gore p/ quadrúpedes)
  } else if (parts.weapon) {
    parts.weapon.rotation.x = 0;
  }

  // --- Recuo ao tomar dano (flinch) — domina ataque/idle -------------------
  if (r > 0) {
    headX = 0.6 * r; // cabeça pra trás
  }
  if (parts.head) parts.head.rotation.x = headX;
  if (parts.torso) parts.torso.rotation.x = 0.3 * r; // tronco recua (0 quando r=0)
}
