import { describe, it, expect } from 'vitest';
import { mergeBoxes, canopyGeo, pineGeo, rockGeo } from '../src/world/voxelGeo';

describe('voxelGeo (ADR 0074)', () => {
  it('mergeBoxes funde N caixas numa geometria única', () => {
    const g = mergeBoxes([
      { w: 1, h: 1, d: 1, x: 0, y: 0.5, z: 0 },
      { w: 1, h: 1, d: 1, x: 2, y: 0.5, z: 0 },
    ]);
    // 2 caixas × 24 vértices cada (BoxGeometry indexada).
    expect(g.attributes.position.count).toBe(48);
    expect(g.attributes.uv).toBeTruthy();
    expect(g.attributes.normal).toBeTruthy();
  });

  it('mergeBoxes aplica a translação de cada caixa', () => {
    const g = mergeBoxes([{ w: 2, h: 4, d: 2, x: 0, y: 2, z: 0 }]);
    g.computeBoundingBox();
    expect(g.boundingBox.min.y).toBeCloseTo(0);
    expect(g.boundingBox.max.y).toBeCloseTo(4);
  });

  it('pinheiro e rocha são ancorados na base (y=0)', () => {
    for (const geo of [pineGeo(), rockGeo()]) {
      geo.computeBoundingBox();
      expect(geo.boundingBox.min.y).toBeCloseTo(0, 1);
      expect(geo.boundingBox.max.y).toBeGreaterThan(0.5);
    }
  });

  it('copa é um cluster centrado com satélites', () => {
    const g = canopyGeo();
    g.computeBoundingBox();
    // 5 caixas fundidas; alcance lateral maior que o núcleo (satélites).
    expect(g.attributes.position.count).toBe(5 * 24);
    expect(g.boundingBox.max.x).toBeGreaterThan(1.5);
    expect(g.boundingBox.min.x).toBeLessThan(-1.2);
  });
});
