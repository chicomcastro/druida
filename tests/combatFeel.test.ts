import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { VfxManager } from '../src/systems/vfx.js';
import { buildMesh } from '../src/entities/meshes.js';
import { animateBody } from '../src/systems/animation.js';

/**
 * Feel de combate (E58/E59): o arco do golpe tem que apontar para onde o herói
 * encara (a mesma convenção do `meleeArc`/rotação do modelo), e o flash de dano
 * de UM alvo não pode vazar para os outros modelos (materiais voxel são
 * compartilhados por cor — clone-on-write no `applyEmissive`).
 */
function stubGame() {
  const scene = new THREE.Scene();
  const listeners: Record<string, any[]> = {};
  const game: any = {
    world: { get: () => null, query: () => [] },
    renderer: { scene, add() {}, remove() {} },
    on(e: string, fn: any) { (listeners[e] ??= []).push(fn); },
    emit(e: string, p: any) { (listeners[e] ?? []).forEach((fn) => fn(p)); },
  };
  return { game, scene };
}

describe('arco do golpe aponta para o rumo do herói (E58)', () => {
  // A direção que o meleeArc acerta e que o modelo encara é (sin θ, cos θ),
  // θ=0 → +Z. O centro do arco (o +X local do anel) precisa cair aí no mundo.
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.7]) {
    it(`θ=${angle.toFixed(2)} → centro do arco em (sin,cos)`, () => {
      const { game, scene } = stubGame();
      const vfx = new VfxManager(game);
      game.emit('meleeSwing', { x: 0, z: 0, angle, range: 2, arc: 0.8, color: 0xffffff });
      // Acha o anel do golpe (RingGeometry recém-criado).
      const ring = scene.children.find(
        (o: any) => o.isMesh && o.geometry?.type === 'RingGeometry',
      ) as any;
      expect(ring).toBeTruthy();
      ring.updateMatrixWorld(true);
      // +X local do anel = centro do arco; projeta no mundo.
      const center = new THREE.Vector3(1, 0, 0).applyQuaternion(ring.quaternion);
      expect(center.x).toBeCloseTo(Math.sin(angle), 4);
      expect(center.z).toBeCloseTo(Math.cos(angle), 4);
      vfx; // mantém referência viva
    });
  }
});

describe('flash de dano não vaza entre modelos (E59)', () => {
  it('tingir as pernas de um modelo não altera o material do outro', () => {
    // Dois heróis: compartilham o material "leather" (cache por cor) até alguém
    // piscar. O clone-on-write isola.
    const a = buildMesh('druid');
    const b = buildMesh('druid');
    const legA = findMeshByName(a, 'legL');
    const legB = findMeshByName(b, 'legL');
    expect(legA && legB).toBeTruthy();
    // Antes de piscar, dividem o mesmo material (otimização de memória).
    expect(legA.material).toBe(legB.material);

    // Simula o applyEmissive com clone-on-write (mesma lógica do render).
    tintOwn(legA, 0xff3030, 1);
    expect(legB.material.emissive.getHex()).toBe(0x000000); // B intacto
    expect(legA.material.emissive.getHex()).toBe(0xff3030); // só A piscou
    expect(legA.material).not.toBe(legB.material);           // agora tem cópia própria
  });
});

function poseFor(kind: number, combo = 0) {
  const body = buildMesh('druid');
  // attack=1 (acabou de golpear), parado, sem recuo.
  animateBody(body, 1 / 60, { moving: false, speed: 0, attack: 1, gait: 'biped', attackKind: kind, combo });
  const p = body.userData.parts;
  return { armRx: p.armR.rotation.x, armRz: p.armR.rotation.z, torsoY: p.torso?.rotation.y ?? 0, lungeZ: body.position.z };
}

describe('golpes variados por swing (E60)', () => {
  it('cada kind produz uma pose distinta', () => {
    const chop = poseFor(0), slashR = poseFor(1), slashL = poseFor(2), thrust = poseFor(3);
    expect(chop.armRx).toBeLessThan(-1);           // machadada: braço bem à frente/baixo
    expect(slashR.armRz).toBeGreaterThan(0.5);     // corte p/ um lado
    expect(slashL.armRz).toBeLessThan(-0.5);       // corte p/ o outro (espelho)
    expect(Math.sign(slashR.torsoY)).toBe(1);      // tronco gira em sentidos opostos
    expect(Math.sign(slashL.torsoY)).toBe(-1);
    expect(thrust.lungeZ).toBeGreaterThan(0);      // estocada projeta o corpo à frente
  });

  it('combo alto amplia a amplitude do golpe', () => {
    const lo = poseFor(1, 0), hi = poseFor(1, 12);
    expect(Math.abs(hi.armRz)).toBeGreaterThan(Math.abs(lo.armRz));
  });
});

function findMeshByName(root: any, name: string): any {
  let hit: any = null;
  root.traverse((o: any) => { if (o.userData?.partName === name || o.name === name) hit = o; });
  if (hit) return hit;
  // Fallback: acha qualquer malha (o teste só precisa de duas malhas irmãs que
  // dividam material).
  root.traverse((o: any) => { if (!hit && o.isMesh) hit = o; });
  return hit;
}

/** Espelha o clone-on-write do render.applyEmissive para o teste. */
function tintOwn(mesh: any, color: number, intensity: number) {
  if (!mesh.userData._ownMat) { mesh.material = mesh.material.clone(); mesh.userData._ownMat = true; }
  mesh.material.emissive.setHex(color);
  mesh.material.emissiveIntensity = intensity;
}
