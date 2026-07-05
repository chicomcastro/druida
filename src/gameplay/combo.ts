/**
 * Sistema de combo por timing (ADR 0092). Cada ataque tem um tempo de
 * execução; uma barra central enche 0→1 nesse tempo. Apertar o próximo
 * ataque no SWEET SPOT (0.75, janela 0.60–0.90) encadeia ANTES do fim —
 * mais ataques por segundo (DPS↑) e bônus de dano acumulável. Fora da
 * janela, o encadeamento falha e o combo quebra; quanto mais longe do
 * sweet spot, pior. Tudo em data para tunar no playtest (Gate B).
 */
export const COMBO = {
  earlyEnd: 0.60,   // antes disso: cedo demais
  sweet: 0.75,      // ponto ideal
  lateEnd: 0.90,    // depois disso: tarde demais
  cap: 8,           // teto de stacks
  dmgPerStack: 0.12, // +12% de dano por stack
  graceMul: 1.6,    // combo expira em castTotal × isto sem novo acerto
  missPenalty: 0.3, // s extra de recuperação ao errar
};

/** Avalia um input no progresso `p` (0..1) da barra. */
export function evalCombo(p: number): { ok: boolean; quality: number } {
  const ok = p >= COMBO.earlyEnd && p <= COMBO.lateEnd;
  if (!ok) return { ok: false, quality: 0 };
  // Qualidade 1.0 no sweet spot, caindo linearmente até as bordas da janela.
  const half = p <= COMBO.sweet ? COMBO.sweet - COMBO.earlyEnd : COMBO.lateEnd - COMBO.sweet;
  const quality = 1 - Math.abs(p - COMBO.sweet) / half;
  return { ok: true, quality: Math.max(0, quality) };
}

/** Multiplicador de dano para uma contagem de combo. */
export function comboMul(count: number): number {
  return 1 + Math.min(count, COMBO.cap) * COMBO.dmgPerStack;
}
