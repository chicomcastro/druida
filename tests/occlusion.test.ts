import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { OcclusionFade } from '../src/core/render/OcclusionFade.js';

/** Câmera ortográfica no offset isométrico do jogo, olhando a origem. */
function makeCam() {
  const cam = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 500);
  cam.position.set(24, 28, 24);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
  return cam;
}

describe('OcclusionFade (E56)', () => {
  it('cenário entre herói e câmera fica translúcido e volta ao opaco ao sair', () => {
    const scene = new THREE.Scene();
    const cam = makeCam();
    // Caixa sobre a linha herói→câmera (dir ~ (0.55,0.62,0.55) a partir de (0,1,0)).
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a6b4a });
    const box = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), mat);
    box.position.set(5.5, 7, 5.5);
    scene.add(box);
    scene.updateMatrixWorld(true);

    const occ = new OcclusionFade();
    occ.every = 1; // recalcula todo frame no teste
    const players = [{ x: 0, y: 0, z: 0 }];
    // Alguns frames: a opacidade cai em direção ao alvo (0.22).
    for (let i = 0; i < 30; i++) occ.update(scene, cam, players, new Set(), 1 / 60);
    expect(box.material.transparent).toBe(true);
    expect(box.material.opacity).toBeLessThan(0.4); // ficou translúcida

    // Sai da frente (bem longe da linha): volta ao opaco e restaura o material.
    box.position.set(80, 7, -80);
    scene.updateMatrixWorld(true);
    for (let i = 0; i < 60; i++) occ.update(scene, cam, players, new Set(), 1 / 60);
    expect(box.material).toBe(mat);        // material original restaurado
    expect(box.material.opacity).toBe(1);
  });

  it('não apaga entidades (jogador/inimigos) mesmo entre herói e câmera', () => {
    const scene = new THREE.Scene();
    const cam = makeCam();
    const mat = new THREE.MeshStandardMaterial({ color: 0x99ccff });
    const enemy = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat);
    enemy.position.set(5.5, 7, 5.5);
    scene.add(enemy);
    scene.updateMatrixWorld(true);
    const occ = new OcclusionFade(); occ.every = 1;
    const roots = new Set<any>([enemy]); // registrada como entidade → nunca apaga
    for (let i = 0; i < 20; i++) occ.update(scene, cam, [{ x: 0, y: 0, z: 0 }], roots, 1 / 60);
    expect(enemy.material).toBe(mat);
    expect(enemy.material.transparent).toBe(false);
  });
});
