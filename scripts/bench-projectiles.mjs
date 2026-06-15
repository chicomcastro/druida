/**
 * Microbenchmark de alocação do caminho de projéteis do Druida.
 *
 * Replica fielmente o que `factories.createProjectile` + `meshes.buildOrb`
 * alocam por projétil (geometria + material + mesh + componentes ECS + entrada
 * nos stores), mede bytes/projétil e a vazão de criação+descarte, e cruza com a
 * taxa de spawn realista para estimar a pressão de GC (MB/s).
 *
 * Uso: node --expose-gc scripts/bench-projectiles.mjs
 */
import * as THREE from 'three';

const K = 50000;
const gc = globalThis.gc || (() => {});

// --- Stores estilo World (Maps por tipo de componente) ----------------------
const stores = { Transform: new Map(), Velocity: new Map(), Renderable: new Map(), Faction: new Map(), Hitbox: new Map(), Lifetime: new Map() };
let nextId = 1;

function buildOrb(color = 0x88e0ff, radius = 0.25) {
  const m = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius, 0),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.4 }),
  );
  m.castShadow = true;
  return m;
}

function createProjectile() {
  const id = nextId++;
  const mesh = buildOrb(0xff7a3a, 0.35);
  mesh.position.set(0, 0.8, 0);
  stores.Transform.set(id, { x: 0, z: 0, y: 0, rot: 0 });
  stores.Velocity.set(id, { vx: 13, vz: 0, speed: 13 });
  stores.Renderable.set(id, { object3d: mesh, baseScale: 1, yOffset: 0.8 });
  stores.Faction.set(id, { team: 'player' });
  stores.Hitbox.set(id, { damage: 14, team: 'player', radius: 0.65, effect: { burn: 4 }, pierce: 0, hit: new Set() });
  stores.Lifetime.set(id, { remaining: 0.85 });
  return id;
}

function destroyProjectile(id) {
  const r = stores.Renderable.get(id);
  if (r) { r.object3d.geometry.dispose(); r.object3d.material.dispose(); }
  for (const s of Object.values(stores)) s.delete(id);
}

// --- 1) Bytes por projétil (retido ≈ alocado) -------------------------------
gc();
const base = process.memoryUsage().heapUsed;
const live = [];
for (let i = 0; i < K; i++) live.push(createProjectile());
const after = process.memoryUsage().heapUsed;
const bytesPerProj = (after - base) / K;

// --- 2) Steady-state: criar+descartar não deve vazar ------------------------
for (const id of live) destroyProjectile(id);
live.length = 0;
gc();
const settled = process.memoryUsage().heapUsed;
const leakedPerProj = (settled - base) / K;

// --- 3) Vazão de criar+descartar (CPU) --------------------------------------
const t0 = performance.now();
for (let i = 0; i < K; i++) destroyProjectile(createProjectile());
const t1 = performance.now();
const nsPerCycle = ((t1 - t0) * 1e6) / K;
const opsPerSec = K / ((t1 - t0) / 1000);

// --- 4) Taxa de spawn realista (derivada das constantes do jogo) ------------
// Jogador humanoide: ataque básico = 1 projétil a cada 0.45s -> ~2.2/s.
// (Lobo/Urso/Sapo são corpo-a-corpo; não geram projétil.)
const perPlayerRanged = 1 / 0.45;
// Inimigos ranged (shadecrow) disparam a cada 1.8s. Estimativa de quantos
// ranged ativos por cenário, dado o teto de spawn capBase=8 + level*0.7,
// vezes (0.7 + players*0.4), com ~1/3 sendo ranged.
function enemyCap(level, players) { return Math.round((8 + level * 0.7) * (0.7 + players * 0.4)); }
function rangedRate(level, players) {
  const ranged = enemyCap(level, players) * 0.33;
  return ranged * (1 / 1.8);
}
const scenarios = [
  { name: 'Solo, nível 5', players: 1, level: 5 },
  { name: 'Coop 4p, nível 10', players: 4, level: 10 },
  { name: 'Coop 4p, nível 20 (extremo)', players: 4, level: 20 },
];

console.log('\n=== Alocação por projétil ===');
console.log(`bytes/projétil (geom+mat+mesh+componentes): ${(bytesPerProj).toFixed(0)} B  (~${(bytesPerProj / 1024).toFixed(2)} KB)`);
console.log(`retido após descarte (vazamento/proj):      ${leakedPerProj.toFixed(1)} B  -> ${Math.abs(leakedPerProj) < 200 ? 'sem vazamento' : 'VAZA'}`);
console.log('\n=== CPU do ciclo criar+descartar ===');
console.log(`${nsPerCycle.toFixed(0)} ns/ciclo  |  ~${(opsPerSec / 1e6).toFixed(2)} M ciclos/s`);

console.log('\n=== Pressão de GC por cenário (só projéteis) ===');
for (const s of scenarios) {
  const rate = s.players * perPlayerRanged + rangedRate(s.level, s.players);
  const mbPerSec = (rate * bytesPerProj) / (1024 * 1024);
  const budgetFracMs = (rate * nsPerCycle) / 1e6; // ms de CPU por segundo gastos só nisso
  console.log(`- ${s.name}: ~${rate.toFixed(1)} proj/s | alloc ${(mbPerSec * 1024).toFixed(1)} KB/s | CPU ~${budgetFracMs.toFixed(3)} ms/s`);
}

// --- 5) Alternativa barata: geometria + material compartilhados -------------
// (cada projétil reusa uma geometria/material; só mesh + componentes são novos)
const sharedGeo = new THREE.IcosahedronGeometry(0.35, 0);
const sharedMat = new THREE.MeshStandardMaterial({ color: 0xff7a3a });
function createProjectileShared() {
  const id = nextId++;
  const mesh = new THREE.Mesh(sharedGeo, sharedMat);
  mesh.castShadow = true;
  mesh.position.set(0, 0.8, 0);
  stores.Transform.set(id, { x: 0, z: 0, y: 0, rot: 0 });
  stores.Velocity.set(id, { vx: 13, vz: 0, speed: 13 });
  stores.Renderable.set(id, { object3d: mesh, baseScale: 1, yOffset: 0.8 });
  stores.Faction.set(id, { team: 'player' });
  stores.Hitbox.set(id, { damage: 14, team: 'player', radius: 0.65, effect: { burn: 4 }, pierce: 0, hit: new Set() });
  stores.Lifetime.set(id, { remaining: 0.85 });
  return id;
}
function destroyShared(id) { for (const s of Object.values(stores)) s.delete(id); }

gc();
const baseS = process.memoryUsage().heapUsed;
const liveS = [];
for (let i = 0; i < K; i++) liveS.push(createProjectileShared());
const bytesShared = (process.memoryUsage().heapUsed - baseS) / K;
for (const id of liveS) destroyShared(id);
const tS0 = performance.now();
for (let i = 0; i < K; i++) destroyShared(createProjectileShared());
const nsShared = ((performance.now() - tS0) * 1e6) / K;

console.log('\n=== Alternativa: geometria/material compartilhados ===');
console.log(`bytes/projétil: ${bytesShared.toFixed(0)} B (~${(bytesShared / 1024).toFixed(2)} KB)  | redução de alloc: ${(100 * (1 - bytesShared / bytesPerProj)).toFixed(0)}%`);
console.log(`${nsShared.toFixed(0)} ns/ciclo  | redução de CPU: ${(100 * (1 - nsShared / nsPerCycle)).toFixed(0)}%`);

console.log('\nReferência: GC do V8 começa a causar pausas perceptíveis quando a');
console.log('alocação de young-gen passa de ~dezenas de MB/s. Abaixo de ~1 MB/s é ruído.');
