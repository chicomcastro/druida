import { describe, it, expect } from 'vitest';
import { evalCombo, comboMul, COMBO } from '../src/gameplay/combo.js';

describe('Combo por timing (ADR 0092)', () => {
  it('sweet spot (0.75) é acerto de qualidade máxima', () => {
    const r = evalCombo(0.75);
    expect(r.ok).toBe(true);
    expect(r.quality).toBeCloseTo(1, 5);
  });

  it('dentro da janela alargada (0.56–0.94) acerta, com qualidade < 1 nas bordas', () => {
    expect(evalCombo(COMBO.earlyEnd).ok).toBe(true);
    expect(evalCombo(COMBO.lateEnd).ok).toBe(true);
    expect(evalCombo(0.62).quality).toBeLessThan(1);
    expect(evalCombo(0.88).quality).toBeLessThan(1);
  });

  it('cedo demais (<earlyEnd) e tarde demais (>lateEnd) falham', () => {
    expect(evalCombo(0.4).ok).toBe(false);
    expect(evalCombo(0.97).ok).toBe(false);
  });

  it('qualidade cai conforme afasta do sweet spot', () => {
    expect(evalCombo(0.70).quality).toBeGreaterThan(evalCombo(0.60).quality);
    expect(evalCombo(0.80).quality).toBeGreaterThan(evalCombo(0.90).quality);
  });

  it('dano satura no dmgCap, mas a contagem exibida vai bem mais alto (E60)', () => {
    expect(comboMul(0)).toBe(1);
    expect(comboMul(3)).toBeCloseTo(1 + 3 * COMBO.dmgPerStack, 5);
    // Além do dmgCap o dano NÃO cresce mais (balanceamento intacto)...
    expect(comboMul(999)).toBeCloseTo(1 + COMBO.dmgCap * COMBO.dmgPerStack, 5);
    expect(comboMul(COMBO.dmgCap + 20)).toBe(comboMul(COMBO.dmgCap));
    // ...mas o teto de CONTAGEM é bem maior que o de dano (streak empolgante).
    expect(COMBO.cap).toBeGreaterThan(COMBO.dmgCap);
  });
});
