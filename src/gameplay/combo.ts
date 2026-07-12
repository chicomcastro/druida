/**
 * Sistema de combo por timing (ADR 0092). Cada ataque tem um tempo de
 * execução; uma barra central enche 0→1 nesse tempo. Apertar o próximo
 * ataque no SWEET SPOT (0.75, janela 0.60–0.90) encadeia ANTES do fim —
 * mais ataques por segundo (DPS↑) e bônus de dano acumulável. Fora da
 * janela, o encadeamento falha e o combo quebra; quanto mais longe do
 * sweet spot, pior. Tudo em data para tunar no playtest (Gate B).
 */
export const COMBO = {
  earlyEnd: 0.56,   // antes disso: cedo demais (janela alargada — E60, menos punitivo)
  sweet: 0.75,      // ponto ideal
  lateEnd: 0.94,    // depois disso: tarde demais (janela alargada)
  cap: 40,          // teto da CONTAGEM exibida (streak alto = empolgante)
  dmgCap: 8,        // stacks que contam para o DANO (teto de balanceamento — não muda)
  dmgPerStack: 0.12, // +12% de dano por stack (até dmgCap → +96% no máximo, como antes)
  graceMul: 1.8,    // combo expira em castTotal × isto sem novo acerto (um tico mais generoso)
  missPenalty: 0.18, // s extra de recuperação ao errar (era 0.3)
  missKeepFrac: 0.5, // ao errar o timing, mantém esta fração do combo (não zera de vez)
};

/**
 * Avalia um input no progresso `p` (0..1) da barra. `widen` (fração, dos
 * talentos de ritmo — ADR 0093) alarga a janela simetricamente.
 */
export function evalCombo(p: number, widen = 0): { ok: boolean; quality: number } {
  const early = COMBO.earlyEnd - widen, late = COMBO.lateEnd + widen;
  const ok = p >= early && p <= late;
  if (!ok) return { ok: false, quality: 0 };
  // Qualidade 1.0 no sweet spot, caindo linearmente até as bordas da janela.
  const half = p <= COMBO.sweet ? COMBO.sweet - early : late - COMBO.sweet;
  const quality = half > 0 ? 1 - Math.abs(p - COMBO.sweet) / half : 1;
  return { ok: true, quality: Math.max(0, quality) };
}

/**
 * Multiplicador de dano para uma contagem de combo. O bônus satura em `dmgCap`
 * stacks (teto de balanceamento), mas a CONTAGEM exibida vai bem mais alto
 * (`cap`) — o streak sobe e empolga sem estourar o dano.
 */
export function comboMul(count: number): number {
  return 1 + Math.min(count, COMBO.dmgCap) * COMBO.dmgPerStack;
}
