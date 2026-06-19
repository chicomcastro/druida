import type { Gait } from '../entities/voxelModels.js';

/**
 * Animação procedural dos modelos voxel: anima as PARTES nomeadas
 * (head/torso/armR/legL/…) em torno das juntas conforme o estado do ente
 * (parado/andando/atacando) e o `gait`. Sem clips/asset — tudo por seno/fase.
 *
 * Só mexe em `.rotation` e `.position` das partes/corpo, então é testável com
 * objetos simples (sem WebGL). Chamado no render (ver systems/render.ts).
 */
export interface AnimState {
  moving: boolean;
  speed: number;
  /** Intensidade do ataque em [0..1] (1 = acabou de golpear); 0 = sem ataque. */
  attack: number;
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

  // Bob do corpo: saltitante ao andar, respiração leve parado.
  if (body.position) body.position.y = st.moving ? Math.abs(sw) * 0.06 : idle;

  if (st.gait === 'biped') {
    if (parts.legL) parts.legL.rotation.x = sw * 0.6 * amp;
    if (parts.legR) parts.legR.rotation.x = -sw * 0.6 * amp;
    if (parts.armL) parts.armL.rotation.x = -sw * 0.5 * amp;
    if (parts.armR) parts.armR.rotation.x = sw * 0.5 * amp;
    if (parts.head) parts.head.rotation.z = idle;
  } else if (st.gait === 'quadruped') {
    const a = sw * 0.7 * amp;
    if (parts.legFL) parts.legFL.rotation.x = a;
    if (parts.legBR) parts.legBR.rotation.x = a;
    if (parts.legFR) parts.legFR.rotation.x = -a;
    if (parts.legBL) parts.legBL.rotation.x = -a;
    if (parts.tail) parts.tail.rotation.x = Math.sin(ph * 0.6) * 0.2 + 0.1;
    if (parts.head) parts.head.rotation.x = idle;
  } else if (st.gait === 'bird') {
    const flap = Math.sin(ph * 1.6) * (st.moving ? 0.9 : 0.4);
    if (parts.wingL) parts.wingL.rotation.z = flap;
    if (parts.wingR) parts.wingR.rotation.z = -flap;
  }

  // Sobreposição de ataque: braço direito (e arma) golpeiam à frente e voltam.
  if (st.attack > 0) {
    const a = Math.min(1, st.attack);
    if (parts.armR) parts.armR.rotation.x = -1.5 * a;
    if (parts.armL) parts.armL.rotation.x = -0.4 * a;
    if (parts.weapon) parts.weapon.rotation.x = -0.4 * a;
  } else if (parts.weapon) {
    parts.weapon.rotation.x = 0;
  }
}
