import { describe, it, expect } from 'vitest';
import { npcPlace, classifyVenues, type Venue } from '../src/gameplay/npcSchedule.js';

const VENUES: Venue[] = [
  { themeId: 'market', service: 'shop', x: 10, z: 0 },
  { themeId: 'weapons', service: 'shop', x: 12, z: 2 },
  { themeId: 'tavern', service: 'rest', x: 0, z: 8 },
  { themeId: 'hall', service: 'talk', x: -4, z: 6 },
];

describe('Cronograma dos moradores (E34)', () => {
  it('classifica recintos em trabalho (loja) e social (taverna/salão)', () => {
    const { work, social } = classifyVenues(VENUES);
    expect(work.map(v => v.themeId).sort()).toEqual(['market', 'weapons']);
    expect(social.map(v => v.themeId).sort()).toEqual(['hall', 'tavern']);
  });

  it('é determinístico: mesmo NPC, hora e dia → mesmo lugar', () => {
    const npc = { seed: 1234, archetype: 'social' as const };
    const a = npcPlace(npc, 0.8, 3, VENUES);
    const b = npcPlace(npc, 0.8, 3, VENUES);
    expect(a).toEqual(b);
  });

  it('num dado horário o NPC está em UM lugar só (dentro XOR fora)', () => {
    for (const t of [0.1, 0.3, 0.45, 0.62, 0.85]) {
      const p = npcPlace({ seed: 77, archetype: 'social' }, t, 1, VENUES);
      // inside é um themeId conhecido ou null; nunca ambíguo
      if (p.inside) expect(VENUES.some(v => v.themeId === p.inside)).toBe(true);
    }
  });

  it('persiste no mesmo bloco/dia: sair e voltar encontra o NPC no mesmo recinto', () => {
    const npc = { seed: 42, archetype: 'social' as const };
    // dois instantes dentro da mesma fase "noite" (>=0.70) e mesmo dia
    const p1 = npcPlace(npc, 0.72, 5, VENUES);
    const p2 = npcPlace(npc, 0.9, 5, VENUES);
    expect(p1.inside).toBe(p2.inside);
  });

  it('à noite parte dos moradores fica num recinto social (dá pra encontrar alguém)', () => {
    let inside = 0;
    for (let s = 0; s < 40; s++) {
      const p = npcPlace({ seed: s * 101 + 7, archetype: 'social' }, 0.8, 2, VENUES);
      if (p.inside) { inside++; expect(['tavern', 'hall']).toContain(p.inside); }
    }
    expect(inside).toBeGreaterThan(10); // uma boa parte está recolhida num recinto
  });

  it('varia de um dia pro outro (delta diário) no mesmo horário', () => {
    const npc = { seed: 9001, archetype: 'social' as const };
    const places = new Set<string>();
    for (let day = 0; day < 12; day++) places.add(JSON.stringify(npcPlace(npc, 0.8, day, VENUES)));
    expect(places.size).toBeGreaterThan(1); // não é sempre igual
  });

  it('sem recintos, o NPC nunca está "dentro" (fica na rotina externa)', () => {
    for (const t of [0.1, 0.45, 0.62, 0.85]) {
      expect(npcPlace({ seed: 5, archetype: 'social' }, t, 0, []).inside).toBeNull();
    }
  });
});
