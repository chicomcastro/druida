import { describe, it, expect } from 'vitest';
import { dayPhase, routineGoal, goalSpread, ROUTINE_ARCHETYPES } from '../src/gameplay/routine.js';

describe('routine — fases do dia (E22)', () => {
  it('mapeia a hora ∈ [0,1) para a fase certa', () => {
    expect(dayPhase(0.05)).toBe('manha');
    expect(dayPhase(0.30)).toBe('almoco');
    expect(dayPhase(0.45)).toBe('tarde');
    expect(dayPhase(0.60)).toBe('entardecer');
    expect(dayPhase(0.85)).toBe('noite');
    expect(dayPhase(1.2)).toBe('manha'); // normaliza
  });
});

describe('routine — objetivos por arquétipo', () => {
  const opts = { seed: 123, day: 0 };

  it('ao entardecer todos vão ao salão (menos o notívago, que ainda dorme)', () => {
    for (const a of ['worker', 'homebody', 'wanderer', 'social'] as const) {
      expect(routineGoal(a, 0.6, opts)).toBe('hall');
    }
    expect(routineGoal('nightowl', 0.6, opts)).toBe('sleep');
  });

  it('à noite dormem em casa; o notívago perambula', () => {
    expect(routineGoal('worker', 0.85, opts)).toBe('sleep');
    expect(routineGoal('homebody', 0.85, opts)).toBe('sleep');
    expect(routineGoal('nightowl', 0.85, opts)).toBe('roam');
  });

  it('de dia cada arquétipo cuida do seu', () => {
    expect(routineGoal('worker', 0.1, opts)).toBe('work');
    expect(routineGoal('homebody', 0.1, opts)).toBe('home');
    expect(routineGoal('wanderer', 0.1, opts)).toBe('roam');
    expect(routineGoal('nightowl', 0.1, opts)).toBe('sleep');
  });

  it('no almoço aparecem casa E salão ao longo da população (vila orgânica)', () => {
    const goals = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      for (let day = 0; day < 4; day++) goals.add(routineGoal('social', 0.30, { seed, day }));
    }
    expect(goals.has('hall')).toBe(true);
    expect(goals.has('home')).toBe(true);
    expect([...goals].every((g) => g === 'hall' || g === 'home')).toBe(true);
  });

  it('social nunca sai de manhã E à tarde no mesmo dia; e os dois turnos ocorrem na população', () => {
    let sawMorningOut = false, sawAfternoonOut = false;
    for (let seed = 0; seed < 30; seed++) {
      for (let day = 0; day < 4; day++) {
        const m = routineGoal('social', 0.1, { seed, day });
        const t = routineGoal('social', 0.45, { seed, day });
        if (m === 'roam') sawMorningOut = true;
        if (t === 'roam') sawAfternoonOut = true;
        expect(m === 'roam' && t === 'roam').toBe(false); // só um turno por dia
      }
    }
    expect(sawMorningOut && sawAfternoonOut).toBe(true);
  });

  it('goalSpread: perambular espalha mais que dormir', () => {
    expect(goalSpread('roam')).toBeGreaterThan(goalSpread('home'));
    expect(goalSpread('sleep')).toBeLessThan(goalSpread('hall'));
  });

  it('há um arquétipo notívago no rol de sorteio', () => {
    expect(ROUTINE_ARCHETYPES).toContain('nightowl');
  });
});
