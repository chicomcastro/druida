import { describe, it, expect } from 'vitest';
import { assignHouseholds } from '../src/gameplay/households.js';

function members(n: number) {
  // Espalha em círculo para o agrupamento por ângulo ser estável.
  return Array.from({ length: n }, (_, i) => ({
    seed: 1000 + i * 7,
    x: Math.cos((i / n) * Math.PI * 2) * 10,
    z: Math.sin((i / n) * Math.PI * 2) * 10,
  }));
}

describe('households — famílias e lares (E22.2)', () => {
  it('atribui todo morador a um lar (1–3 pessoas) sem deixar ninguém de fora', () => {
    const ms = members(9);
    const a = assignHouseholds(ms);
    expect(a).toHaveLength(9);
    expect(a.every((x) => x && x.home)).toBe(true);
    // tamanhos entre 1 e 3
    const byHome: Record<number, number> = {};
    a.forEach((x) => { byHome[x.householdId] = (byHome[x.householdId] ?? 0) + 1; });
    for (const size of Object.values(byHome)) expect(size >= 1 && size <= 3).toBe(true);
    // membros do mesmo lar dividem a MESMA âncora de casa
    const homeOf = (hid: number) => a.find((x) => x.householdId === hid)!.home;
    a.forEach((x) => expect(x.home).toEqual(homeOf(x.householdId)));
  });

  it('o casal (2 primeiros de um lar) tem gêneros opostos', () => {
    const a = assignHouseholds(members(8));
    const groups: Record<number, typeof a> = {};
    a.forEach((x) => { (groups[x.householdId] ??= [] as any).push(x); });
    for (const g of Object.values(groups)) {
      if (g.length >= 2) {
        const adults = g.filter((m) => m.role === 'adult');
        expect(new Set(adults.map((m) => m.gender)).size).toBe(2); // um m e um f
      }
    }
  });

  it('só lares de 3 têm criança; casais/solteiros são adultos', () => {
    const a = assignHouseholds(members(12));
    const groups: Record<number, typeof a> = {};
    a.forEach((x) => { (groups[x.householdId] ??= [] as any).push(x); });
    for (const g of Object.values(groups)) {
      const kids = g.filter((m) => m.role === 'child');
      if (g.length < 3) expect(kids.length).toBe(0);
      else expect(kids.length).toBeLessThanOrEqual(1);
    }
  });

  it('é determinístico', () => {
    expect(assignHouseholds(members(7))).toEqual(assignHouseholds(members(7)));
  });

  it('lida com vila vazia e morador solteiro', () => {
    expect(assignHouseholds([])).toHaveLength(0);
    const solo = assignHouseholds(members(1));
    expect(solo).toHaveLength(1);
    expect(solo[0].size).toBe(1);
    expect(solo[0].role).toBe('adult');
  });
});
