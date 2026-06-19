import * as THREE from 'three';
import { buildMesh } from '../entities/meshes.js';
import { SHOWCASE_GROUPS, MODEL_SPECS } from '../entities/voxelModels.js';
import { animateBody } from '../systems/animation.js';

/**
 * Vitrine/backoffice (rota `showcase.html`): inspeciona os modelos voxel do
 * jogo num visualizador 3D com órbita manual, turntable e iluminação do jogo.
 * Usa o mesmo `buildMesh` da simulação, então reflete fielmente o que aparece
 * em jogo. Animações (idle/andar/atacar) entram num passo seguinte.
 */
const canvas = document.getElementById('view') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c130e);

scene.add(new THREE.HemisphereLight(0x9fd08a, 0x24341f, 0.85));
const sun = new THREE.DirectionalLight(0xfff2c0, 1.3);
sun.position.set(6, 12, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

// Piso: disco + grade.
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(8, 48),
  new THREE.MeshStandardMaterial({ color: 0x24341f, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(16, 16, 0x3f7d34, 0x21311d);
(grid.material as any).opacity = 0.4;
(grid.material as any).transparent = true;
scene.add(grid);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

// --- Órbita manual ---------------------------------------------------------
const target = new THREE.Vector3(0, 1, 0);
let yaw = Math.PI * 0.15, pitch = 0.5, radius = 6;
let autoRotate = true;
function applyCamera() {
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  camera.position.set(
    target.x + radius * cp * Math.sin(yaw),
    target.y + radius * sp,
    target.z + radius * cp * Math.cos(yaw),
  );
  camera.lookAt(target);
}
let dragging = false, lx = 0, ly = 0;
canvas.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; });
addEventListener('pointerup', () => { dragging = false; });
addEventListener('pointermove', (e) => {
  if (!dragging) return;
  yaw -= (e.clientX - lx) * 0.01;
  pitch = Math.max(-0.4, Math.min(1.4, pitch + (e.clientY - ly) * 0.01));
  lx = e.clientX; ly = e.clientY;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  radius = Math.max(2.5, Math.min(16, radius + Math.sign(e.deltaY) * 0.6));
}, { passive: false });

// --- Modelo atual ----------------------------------------------------------
let current: THREE.Object3D | null = null;

function frameModel(obj: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  target.set(0, center.y, 0);
  radius = Math.max(3, Math.max(size.x, size.y, size.z) * 2.4);
}

function show(kind: string) {
  if (current) scene.remove(current);
  current = buildMesh(kind);
  scene.add(current);
  deathT = 0; // reinicia a animação de morte ao trocar de modelo
  frameModel(current);
  const parts = current.userData.parts ? Object.keys(current.userData.parts).length : 0;
  const gait = MODEL_SPECS[kind]?.gait ?? '—';
  (document.getElementById('m-name') as HTMLElement).textContent = kind;
  (document.getElementById('m-meta') as HTMLElement).textContent = `${parts} partes · ${gait}`;
  for (const el of document.querySelectorAll('.item')) {
    el.classList.toggle('active', (el as HTMLElement).dataset.kind === kind);
  }
}

// --- Lista lateral ---------------------------------------------------------
const list = document.getElementById('list') as HTMLElement;
for (const grp of SHOWCASE_GROUPS) {
  const h = document.createElement('div');
  h.className = 'grp';
  h.textContent = grp.label;
  list.appendChild(h);
  for (const kind of grp.kinds) {
    const btn = document.createElement('button');
    btn.className = 'item';
    btn.dataset.kind = kind;
    btn.textContent = kind;
    btn.onclick = () => show(kind);
    list.appendChild(btn);
  }
}

document.getElementById('t-rotate')!.onclick = (e) => {
  autoRotate = !autoRotate;
  (e.target as HTMLElement).classList.toggle('on', autoRotate);
};
document.getElementById('t-reset')!.onclick = () => { yaw = Math.PI * 0.15; pitch = 0.5; if (current) frameModel(current); };

// Modo de animação (idle/andar/atacar/dano/morte).
let animMode: 'idle' | 'walk' | 'attack' | 'hit' | 'death' = 'idle';
let deathT = 0;
const animBtns: Record<string, HTMLElement> = {
  idle: document.getElementById('a-idle')!,
  walk: document.getElementById('a-walk')!,
  attack: document.getElementById('a-attack')!,
  hit: document.getElementById('a-hit')!,
  death: document.getElementById('a-death')!,
};
for (const [mode, el] of Object.entries(animBtns)) {
  el.onclick = () => {
    animMode = mode as typeof animMode;
    deathT = 0;
    if (current) { current.rotation.z = 0; current.scale.setScalar(1); }
    for (const [m, b] of Object.entries(animBtns)) b.classList.toggle('on', m === animMode);
  };
}

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

let t = 0;
function loop() {
  requestAnimationFrame(loop);
  t += 0.016;
  if (current) {
    if (autoRotate) current.rotation.y += 0.012;
    const gait = (current.userData.gait as any) ?? 'static';
    if (animMode === 'death') {
      deathT += 0.016;
      const k = Math.min(1, deathT / 0.45);
      current.rotation.z = k * (Math.PI / 2);
      current.position.y = -k * 0.25;
      current.scale.setScalar(1 - k * 0.25);
    } else {
      const st = {
        gait,
        moving: animMode === 'walk',
        speed: animMode === 'walk' ? 4 : 0,
        attack: animMode === 'attack' ? Math.abs(Math.sin(t * 3)) : 0,
        react: animMode === 'hit' ? Math.abs(Math.sin(t * 4)) : 0,
      };
      animateBody(current, 0.016, st);
    }
  }
  applyCamera();
  renderer.render(scene, camera);
}

resize();
show('druid');
loop();
