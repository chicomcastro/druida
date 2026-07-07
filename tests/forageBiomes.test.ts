import { describe, it, expect } from 'vitest';
import { INGREDIENTS, forageOf } from '../src/gameplay/ingredients.js';
import { BIOMES } from '../src/data/biomes.js';
import { FAUNA_BY_BIOME } from '../src/data/fauna.js';

/**
 * Ingredientes por bioma (ADR 0158): as chaves de bioma dos forrageáveis têm de
 * casar com as de `biomeAt`/`BIOMES` (antes 'cinza'/'degelo' não batiam e Bosque
 * Cinza/Picos ficavam sem forrageamento), e todo bioma jogável precisa de ≥2
 * forrageáveis para nenhum ficar pobre.
 */
const PLAYABLE = Object.keys(BIOMES).filter((b) => b !== 'coracao');

describe('Forrageamento por bioma (ADR 0158)', () => {
  it('toda chave de bioma de ingrediente é um bioma real', () => {
    const valid = new Set(Object.keys(BIOMES));
    const bad: string[] = [];
    for (const ing of Object.values(INGREDIENTS)) {
      for (const b of ing.biomes) if (!valid.has(b)) bad.push(`${ing.id}:${b}`);
    }
    expect(bad, `chaves de bioma inválidas: ${bad.join(', ')}`).toEqual([]);
  });

  it('todo bioma jogável tem ≥2 forrageáveis distintos', () => {
    for (const b of PLAYABLE) {
      const opts = forageOf(b).map((i) => i.id);
      expect(opts.length, `${b} tem só [${opts.join(', ')}]`).toBeGreaterThanOrEqual(2);
    }
  });
});

/**
 * Caça (ADR 0157): fauna caçável solta ingredientes reais; e todo bioma jogável
 * tem pelo menos uma espécie caçável — a fonte de carne/sebo/ovo vinda dos
 * animais, não só dos monstros.
 */
describe('Fauna caçável (ADR 0157)', () => {
  it('drops de fauna referenciam ingredientes existentes e qty>0', () => {
    for (const list of Object.values(FAUNA_BY_BIOME)) {
      for (const f of list) {
        if (!f.drops) continue;
        expect(f.hp, `${f.id} tem drops mas não tem hp`).toBeGreaterThan(0);
        for (const [ing, qty] of Object.entries(f.drops)) {
          expect(INGREDIENTS[ing], `${f.id} dropa ingrediente inexistente ${ing}`).toBeTruthy();
          expect(qty).toBeGreaterThan(0);
        }
      }
    }
  });

  it('todo bioma jogável tem ≥1 fauna caçável', () => {
    for (const b of PLAYABLE) {
      const huntable = (FAUNA_BY_BIOME[b] ?? []).filter((f) => f.hp && f.drops);
      expect(huntable.length, `${b} não tem fauna caçável`).toBeGreaterThanOrEqual(1);
    }
  });
});
