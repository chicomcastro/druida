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

  it('esmaece o MODELO INTEIRO (grupo), não só a malha atingida (E64)', () => {
    const scene = new THREE.Scene();
    const cam = makeCam();
    // "Casa": um grupo com 2 malhas (parede + telhado) sobre a linha herói→câmera.
    const house = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), new THREE.MeshStandardMaterial({ color: 0x8a6b4a }));
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 3), new THREE.MeshStandardMaterial({ color: 0x5f8a3d }));
    wall.position.set(5.5, 6, 5.5); roof.position.set(5.5, 8, 5.5);
    house.add(wall, roof);
    scene.add(house);
    scene.updateMatrixWorld(true);

    const occ = new OcclusionFade(); occ.every = 1;
    for (let i = 0; i < 30; i++) occ.update(scene, cam, [{ x: 0, y: 0, z: 0 }], new Set(), 1 / 60);
    // AMBAS as malhas ficam translúcidas, mesmo o raio tendo tocado só uma.
    expect(wall.material.opacity).toBeLessThan(0.4);
    expect(roof.material.opacity).toBeLessThan(0.4);

    house.position.set(80, 0, -80); scene.updateMatrixWorld(true);
    for (let i = 0; i < 60; i++) occ.update(scene, cam, [{ x: 0, y: 0, z: 0 }], new Set(), 1 / 60);
    expect(wall.material.opacity).toBe(1);
    expect(roof.material.opacity).toBe(1);
  });

  it('folhagem instanciada na frente ENCOLHE (some) e volta ao sair (E64)', () => {
    const scene = new THREE.Scene();
    const cam = makeCam();
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 4, 2), new THREE.MeshStandardMaterial(), 2);
    const m = new THREE.Matrix4();
    m.makeTranslation(5.5, 6, 5.5); inst.setMatrixAt(0, m);      // árvore NA frente
    m.makeTranslation(80, 6, -80); inst.setMatrixAt(1, m);       // árvore longe
    inst.instanceMatrix.needsUpdate = true;
    inst.geometry.computeBoundingSphere();
    scene.add(inst);
    scene.updateMatrixWorld(true);

    const scaleOf = (i: number) => { const mm = new THREE.Matrix4(); inst.getMatrixAt(i, mm); const s = new THREE.Vector3(); mm.decompose(new THREE.Vector3(), new THREE.Quaternion(), s); return s.x; };
    const occ = new OcclusionFade(); occ.every = 1;
    for (let i = 0; i < 40; i++) occ.update(scene, cam, [{ x: 0, y: 0, z: 0 }], new Set(), 1 / 60);
    expect(scaleOf(0)).toBeLessThan(0.3); // a da frente encolheu
    expect(scaleOf(1)).toBeCloseTo(1, 3); // a de longe intacta
  });

  it('folhagem FINA no corredor some via varredura geométrica (E67)', () => {
    // Tronco estreito (0.5u): o raio fino ERRAVA troncos assim (o herói "passa
    // entre" as árvores), mas a varredura geométrica pega qualquer instância cujo
    // corpo (esfera-limite) cruze o corredor herói→câmera, por mais fina que seja.
    const scene = new THREE.Scene();
    const cam = makeCam();
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 3, 0.5), new THREE.MeshStandardMaterial(), 2);
    const m = new THREE.Matrix4();
    m.makeTranslation(2, 2.5, 2); inst.setMatrixAt(0, m);    // fina, perto do herói, no corredor
    m.makeTranslation(80, 3, -80); inst.setMatrixAt(1, m);   // longe
    inst.instanceMatrix.needsUpdate = true;
    inst.geometry.computeBoundingSphere();
    scene.add(inst);
    scene.updateMatrixWorld(true);

    const scaleOf = (i: number) => { const mm = new THREE.Matrix4(); inst.getMatrixAt(i, mm); const s = new THREE.Vector3(); mm.decompose(new THREE.Vector3(), new THREE.Quaternion(), s); return s.x; };
    const occ = new OcclusionFade(); occ.every = 1;
    for (let i = 0; i < 40; i++) occ.update(scene, cam, [{ x: 0, y: 0, z: 0 }], new Set(), 1 / 60);
    expect(scaleOf(0)).toBeLessThan(0.3); // encolheu (a varredura pegou)
    expect(scaleOf(1)).toBeCloseTo(1, 3); // a de longe intacta
  });

  it('slot escondido (árvore não colocada) nunca é "crescido" pela varredura (E67)', () => {
    // Instância em escala 0 / y=-1000 (o pool esconde slots livres): a varredura
    // deve IGNORÁ-la, senão uma árvore-fantasma apareceria no corredor.
    const scene = new THREE.Scene();
    const cam = makeCam();
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 4, 2), new THREE.MeshStandardMaterial(), 1);
    const m = new THREE.Matrix4();
    // escondido: posição na origem do corredor, mas escala 0
    m.compose(new THREE.Vector3(3, -1000, 3), new THREE.Quaternion(), new THREE.Vector3(0, 0, 0));
    inst.setMatrixAt(0, m); inst.instanceMatrix.needsUpdate = true;
    inst.geometry.computeBoundingSphere();
    scene.add(inst); scene.updateMatrixWorld(true);
    const occ = new OcclusionFade(); occ.every = 1;
    for (let i = 0; i < 10; i++) occ.update(scene, cam, [{ x: 0, y: 0, z: 0 }], new Set(), 1 / 60);
    expect(occ.inst.size).toBe(0); // não rastreou o slot escondido
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
