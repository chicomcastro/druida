import { describe, it, expect } from 'vitest';
import { pointInRects, separationForce, avoidForce, steer, streetForce } from '../src/gameplay/steering.js';

const rect = (x0, z0, x1, z1) => ({ x0, z0, x1, z1 });

describe('steering — IA dos aldeões (E23.5)', () => {
  it('pointInRects detecta ponto dentro de uma estrutura (com margem)', () => {
    const rects = [rect(-1, -1, 1, 1)]; // árvore-mãe no centro
    expect(pointInRects(0, 0, rects)).toBe(true);
    expect(pointInRects(3, 3, rects)).toBe(false);
    expect(pointInRects(1.4, 0, rects, 0.6)).toBe(true); // dentro da margem
  });

  it('separação empurra para longe de um vizinho próximo', () => {
    const f = separationForce(0, 0, [{ x: 0.5, z: 0 }], 1.5);
    expect(f.x).toBeLessThan(0);           // vizinho à direita → empurra à esquerda
    expect(Math.abs(f.z)).toBeLessThan(1e-6);
  });

  it('separação ignora vizinhos fora do raio', () => {
    const f = separationForce(0, 0, [{ x: 5, z: 0 }], 1.5);
    expect(f.x).toBe(0); expect(f.z).toBe(0);
  });

  it('desvio empurra para fora de uma estrutura à frente', () => {
    const f = avoidForce(2.2, 0, [rect(-1, -1, 1, 1)], 2.0); // ponto perto da borda direita
    expect(f.x).toBeGreaterThan(0);        // empurra para longe (direita)
  });

  it('desvio: dentro do retângulo empurra pela saída mais curta', () => {
    const f = avoidForce(0.8, 0, [rect(-1, -1, 1, 1)], 2.0); // perto da borda direita interna
    expect(f.x).toBeGreaterThan(0);        // sai pela direita
  });

  it('steer devolve vetor unitário priorizando desvio > separação > rumo', () => {
    const dir = steer({ x: 1, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 0 });
    expect(Math.hypot(dir.x, dir.z)).toBeCloseTo(1, 5);
    // Desvio forte contra o rumo vira o aldeão.
    const turned = steer({ x: 1, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 1 });
    expect(turned.z).toBeGreaterThan(0);
  });

  it('steer sem forças e sem rumo devolve zero', () => {
    const dir = steer({ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 0 });
    expect(dir).toEqual({ x: 0, z: 0 });
  });

  it('streetForce puxa para a laje mais próxima quando fora da rua (ADR 0163)', () => {
    const cells: [number, number][] = [[5, 0], [6, 0], [7, 0]];
    const f = streetForce(0, 0, cells, 0.9); // longe da rua em +x
    expect(f.x).toBeGreaterThan(0.9); // aponta para a rua (unitário em +x)
    expect(Math.abs(f.z)).toBeLessThan(0.1);
  });

  it('streetForce é zero quando já na rua (dentro da deadzone)', () => {
    const cells: [number, number][] = [[0.5, 0]];
    expect(streetForce(0, 0, cells, 0.9)).toEqual({ x: 0, z: 0 });
    expect(streetForce(0, 0, [], 0.9)).toEqual({ x: 0, z: 0 }); // sem ruas: neutro
  });
});
