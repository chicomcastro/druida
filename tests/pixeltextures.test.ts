import { describe, it, expect } from 'vitest';
import { pixelTexture, tiledPixelTexture } from '../src/core/render/pixelTextures.js';

describe('pixelTextures (ADR 0062)', () => {
  it('é headless-safe: sem document devolve null e não lança', () => {
    // Vitest roda em node puro (sem DOM) — o caminho coberto é o de fallback,
    // o mesmo que protege os testes de mundo/vilas que criam materiais.
    expect(pixelTexture('grass')).toBeNull();
    expect(pixelTexture('planks')).toBeNull();
    expect(tiledPixelTexture('stone', 4, 2)).toBeNull();
  });

  it('cacheia por tipo e por repeat (não regenera)', () => {
    expect(pixelTexture('grass')).toBe(pixelTexture('grass'));
    expect(tiledPixelTexture('log', 3, 4)).toBe(tiledPixelTexture('log', 3.2, 4.4)); // arredonda pro mesmo slot
  });
});
