import { describe, it, expect } from 'vitest';
import { evalCombo, comboMul, COMBO } from '../src/gameplay/combo.js';

describe('Combo por timing (ADR 0092)', () => {
  it('sweet spot (0.75) é acerto de qualidade máxima', () => {
    const r = evalCombo(0.75);
    expect(r.ok).toBe(true);
    expect(r.quality).toBeCloseTo(1, 5);
  });

  it('dentro da janela 0.60–0.90 acerta, com qualidade < 1 nas bordas', () => {
    expect(evalCombo(0.60).ok).toBe(true);
    expect(evalCombo(0.90).ok).toBe(true);
    expect(evalCombo(0.62).quality).toBeLessThan(1);
    expect(evalCombo(0.88).quality).toBeLessThan(1);
  });

  it('cedo demais (<0.60) e tarde demais (>0.90) falham', () => {
    expect(evalCombo(0.4).ok).toBe(false);
    expect(evalCombo(0.95).ok).toBe(false);
  });

  it('qualidade cai conforme afasta do sweet spot', () => {
    expect(evalCombo(0.70).quality).toBeGreaterThan(evalCombo(0.62).quality);
    expect(evalCombo(0.80).quality).toBeGreaterThan(evalCombo(0.88).quality);
  });

  it('multiplicador de dano cresce com stacks até o teto', () => {
    expect(comboMul(0)).toBe(1);
    expect(comboMul(3)).toBeCloseTo(1 + 3 * COMBO.dmgPerStack, 5);
    expect(comboMul(999)).toBeCloseTo(1 + COMBO.cap * COMBO.dmgPerStack, 5);
  });
});
