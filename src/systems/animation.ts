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
  /** Gesto ocioso do interior (E32): comer/beber (mão à boca) ou servir (braço à frente). */
  gesture?: 'eat' | 'drink' | 'serve' | null;
  /** Semente de fase do gesto (id do ente) — desincroniza os aldeões à mesa. */
  gestureSeed?: number;
  /** Qual golpe da sequência (E60): 0 machadada, 1/2 cortes laterais, 3 estocada. */
  attackKind?: number;
  /** Contagem de combo atual — dá amplitude/brilho ao golpe conforme sobe. */
  combo?: number;
}

export function animateBody(body: any, dt: number, st: AnimState): void {
  const parts = body?.userData?.parts;
  if (!parts) return;
  const ud = body.userData;

  // Amplitude com easing: entra/sai da caminhada em ~0.1s em vez de "pop"
  // de pose ao começar/parar. Cadência ligada à velocidade (passada curta).
  const targetAmp = st.moving ? Math.min(1, 0.35 + st.speed * 0.11) : 0;
  ud._amp = (ud._amp ?? 0) + (targetAmp - (ud._amp ?? 0)) * Math.min(1, dt * 12);
  const amp = ud._amp;
  const freq = st.moving ? 5.5 + Math.min(st.speed, 8) : 2.4;
  ud._phase = (ud._phase ?? 0) + dt * freq;
  const ph = ud._phase;
  const sw = Math.sin(ph);
  const idle = Math.sin(ph * 0.5) * 0.04;
  const a = Math.min(1, st.attack ?? 0);
  const r = Math.min(1, st.react ?? 0);
  const walk = Math.min(1, amp * 3); // 0 = parado, 1 = andando (p/ blends)

  // Bob do corpo: dois apoios por ciclo (2×freq), afundando no contato do
  // pé — o "peso" da passada; respiração leve quando parado.
  if (body.position) {
    const step = (0.5 - 0.5 * Math.cos(ph * 2)) * 0.075 * amp;
    body.position.y = step * walk + idle * (1 - walk);
    body.position.z = 0; // investida (estocada) re-aplica abaixo; zera pra não derivar
  }

  // --- Locomoção por gait --------------------------------------------------
  let headX = 0;
  if (st.gait === 'biped') {
    if (parts.legL) parts.legL.rotation.x = sw * 0.72 * amp;
    if (parts.legR) parts.legR.rotation.x = -sw * 0.72 * amp;
    // Braços contra-balançam com leve atraso (follow-through) e abertos.
    const arm = Math.sin(ph - 0.3);
    if (parts.armL) { parts.armL.rotation.x = -arm * 0.5 * amp; parts.armL.rotation.z = 0.09 * amp; }
    if (parts.armR) { parts.armR.rotation.x = arm * 0.5 * amp; parts.armR.rotation.z = -0.09 * amp; }
    // Tronco torce contra o quadril e rola de leve a cada apoio; a cabeça
    // compensa a torção (o olhar fica estável — vida sem robotismo).
    if (parts.torso) {
      parts.torso.rotation.y = sw * 0.1 * amp;
      parts.torso.rotation.z = Math.sin(ph * 2) * 0.03 * amp;
    }
    if (parts.head) {
      parts.head.rotation.y = -sw * 0.08 * amp;
      parts.head.rotation.z = idle * (1 - walk);
    }
    headX = Math.sin(ph * 2 + 0.6) * 0.05 * amp; // aceno sutil no passo
  } else if (st.gait === 'quadruped') {
    const g = sw * 0.75 * amp;
    if (parts.legFL) parts.legFL.rotation.x = g;
    if (parts.legBR) parts.legBR.rotation.x = g;
    if (parts.legFR) parts.legFR.rotation.x = -g;
    if (parts.legBL) parts.legBL.rotation.x = -g;
    // Coluna ondula no trote; cauda balança nos dois eixos.
    if (parts.torso) parts.torso.rotation.x = Math.sin(ph * 2) * 0.05 * amp;
    if (parts.tail) {
      parts.tail.rotation.x = Math.sin(ph * 0.6) * 0.2 + 0.1;
      parts.tail.rotation.y = Math.sin(ph * 1.3) * 0.25 * (0.4 + amp);
    }
    headX = idle + Math.sin(ph * 2) * 0.04 * amp;
  } else if (st.gait === 'bird') {
    const flap = Math.sin(ph * 1.6) * (st.moving ? 0.9 : 0.4);
    if (parts.wingL) parts.wingL.rotation.z = flap;
    if (parts.wingR) parts.wingR.rotation.z = -flap;
  } else if (st.gait === 'ooze') {
    // Chefe amorfo (E39): a massa se ondula — esmaga e estica com peso, o núcleo
    // pulsa e os tentáculos-clava balançam preguiçosamente. Não há passada.
    const s = Math.sin(ph);
    if (parts.torso) { parts.torso.scale.y = 1 + 0.09 * s; parts.torso.scale.x = 1 - 0.05 * s; parts.torso.scale.z = 1 - 0.05 * s; }
    if (parts.base) { parts.base.scale.x = 1 + 0.06 * s; parts.base.scale.z = 1 + 0.06 * s; }
    if (parts.core) parts.core.scale.setScalar(1 + 0.2 * (0.5 - 0.5 * Math.cos(ph * 1.3)));
    if (parts.armL) { parts.armL.rotation.z = 0.24 * Math.sin(ph * 0.85); parts.armL.rotation.x = 0.14 * Math.sin(ph * 0.85 + 1); }
    if (parts.armR) { parts.armR.rotation.z = -0.24 * Math.sin(ph * 0.85 + 0.7); parts.armR.rotation.x = 0.14 * Math.sin(ph * 0.85 + 2); }
    if (parts.head) parts.head.rotation.z = 0.1 * Math.sin(ph * 0.6);
    if (body.position) body.position.y += 0.05 * s;
    headX = 0.1 * Math.sin(ph * 0.55);
  } else if (st.gait === 'floating') {
    // Espectro que paira (E39): flutua acima do chão, a cauda de névoa balança e
    // os cacos de gelo orbitam. Sem pés — a altura é constante + respiração.
    const orb = ph * 0.7;
    if (body.position) body.position.y += 0.35 + 0.13 * Math.sin(ph * 0.8);
    if (parts.wisp) { parts.wisp.rotation.z = 0.2 * Math.sin(ph * 0.9); parts.wisp.rotation.x = 0.1 * Math.sin(ph * 0.7 + 1); }
    if (parts.shardL) parts.shardL.rotation.y = orb;
    if (parts.shardR) parts.shardR.rotation.y = -orb;
    if (parts.shardT) { parts.shardT.rotation.y = orb * 1.4; parts.shardT.position.y = 0.12 * Math.sin(ph * 0.9); }
    if (parts.core) parts.core.scale.setScalar(1 + 0.14 * (0.5 - 0.5 * Math.cos(ph)));
    headX = 0.05 * Math.sin(ph * 0.5);
  } else if (st.gait === 'rooted') {
    // Horror arraigado (E39): não caminha — balança o tronco no lugar e as raízes
    // se contorcem, cada uma com sua fase; o núcleo em brasa pulsa.
    for (let i = 1; i <= 4; i++) {
      const rt = parts['root' + i];
      if (rt) { rt.rotation.x = 0.18 * Math.sin(ph * 0.8 + i * 1.5); rt.rotation.z = 0.14 * Math.sin(ph * 0.6 + i); }
    }
    if (parts.armL) parts.armL.rotation.z = 0.16 * Math.sin(ph * 0.7);
    if (parts.armR) parts.armR.rotation.z = -0.16 * Math.sin(ph * 0.7 + 0.5);
    if (parts.core) parts.core.scale.setScalar(1 + 0.16 * (0.5 - 0.5 * Math.cos(ph * 1.3)));
    if (parts.head) parts.head.rotation.z = 0.05 * Math.sin(ph * 0.5);
    headX = 0.08 * Math.sin(ph * 0.5);
  }

  // --- Sobreposição de ataque: golpes VARIADOS por swing (E60) -------------
  // Cada golpe da sequência usa uma pose distinta (machadada de cima, cortes
  // laterais espelhados, estocada). O combo dá amplitude — quanto mais alto o
  // streak, mais amplo e "pesado" o movimento, tornando encadear empolgante.
  // Inimigos (sem attackKind/combo) caem na estocada padrão.
  if (a > 0) {
    const kind = (((st.attackKind ?? 3) % 4) + 4) % 4;
    const flair = 1 + Math.min(st.combo ?? 0, 12) * 0.03; // até +36% de amplitude
    const A = Math.min(1.4, a * flair);
    if (parts.armR) { parts.armR.rotation.x = 0; parts.armR.rotation.z = 0; }
    if (kind === 0) {
      // Machadada de cima: braço desce à frente, tronco projeta.
      if (parts.armR) parts.armR.rotation.x = -1.9 * A;
      if (parts.armL) parts.armL.rotation.x = -0.5 * a;
      headX = -0.4 * a;
    } else if (kind === 1) {
      // Corte horizontal (direita→esquerda): varredura + giro do tronco.
      if (parts.armR) { parts.armR.rotation.x = -0.9 * A; parts.armR.rotation.z = 1.3 * A; }
      if (parts.armL) parts.armL.rotation.z = 0.35 * a;
      if (parts.torso) parts.torso.rotation.y = 0.45 * A;
      headX = -0.2 * a;
    } else if (kind === 2) {
      // Corte horizontal (esquerda→direita): espelho.
      if (parts.armR) { parts.armR.rotation.x = -0.9 * A; parts.armR.rotation.z = -1.3 * A; }
      if (parts.armL) parts.armL.rotation.z = -0.2 * a;
      if (parts.torso) parts.torso.rotation.y = -0.45 * A;
      headX = -0.2 * a;
    } else {
      // Estocada: braço reto + investida do corpo pra frente.
      if (parts.armR) parts.armR.rotation.x = -1.4 * A;
      if (parts.armL) parts.armL.rotation.x = -0.6 * a;
      if (body.position) body.position.z = 0.18 * a;
      headX = -0.45 * a;
    }
    if (parts.weapon) parts.weapon.rotation.x = -0.35 * a;
  } else if (parts.weapon) {
    // Arma acompanha a passada com um leve atraso (peso na mão).
    parts.weapon.rotation.x = -Math.sin(ph - 0.6) * 0.08 * amp;
  }

  // --- Gesto ocioso do interior (E32): comer/beber/servir sem sair do lugar -
  // Só quando parado e sem ataque/recuo — a mão vai à boca (comer/beber) ou o
  // braço se estende à frente (servir), com fase própria pra não sincronizar.
  if (st.gesture && a === 0 && r === 0 && walk < 0.2) {
    if (ud._gph === undefined) ud._gph = (st.gestureSeed ?? 0) % 6.28;
    ud._gph += dt * (st.gesture === 'serve' ? 2.0 : 1.4);
    const g = 0.5 - 0.5 * Math.cos(ud._gph); // 0..1 suave
    if (st.gesture === 'serve') {
      if (parts.armR) parts.armR.rotation.x = -0.6 - 0.6 * g; // oferece o prato/concha
      if (parts.armL) parts.armL.rotation.x = -0.2 * g;
    } else {
      if (parts.armR) parts.armR.rotation.x = -1.7 * g; // leva a mão à boca
      headX = 0.3 * g;                                   // inclina a cabeça pro prato/caneca
    }
  }

  // --- Recuo ao tomar dano (flinch) — domina ataque/idle -------------------
  if (r > 0) {
    headX = 0.6 * r; // cabeça pra trás
  }
  if (parts.head) parts.head.rotation.x = headX;
  // Tronco: bípede inclina à frente com a passada (quadrúpede já ondulou a
  // coluna acima); o recuo do flinch domina.
  if (parts.torso) {
    const lean = st.gait === 'quadruped' ? parts.torso.rotation.x : -0.1 * amp;
    parts.torso.rotation.x = lean * (1 - r) + 0.3 * r;
  }
}
