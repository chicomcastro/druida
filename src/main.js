/**
 * Druida — bootstrap do scaffold (M0).
 *
 * Cena mínima provando o pipeline: um chão e um "druida" placeholder (cubo)
 * sob uma câmera ORTOGRÁFICA em ângulo isométrico. Os sistemas reais
 * (ECS, input, combate, mundo, coop) entram a partir de M1 — ver docs/backlog.md.
 */
import * as THREE from 'three';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1410);

// --- Câmera isométrica (ortográfica em ângulo fixo) -----------------------
const FRUSTUM = 12; // "zoom": metade da altura visível em unidades de mundo
let camera = makeIsoCamera();

function makeIsoCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  const cam = new THREE.OrthographicCamera(
    -FRUSTUM * aspect,
    FRUSTUM * aspect,
    FRUSTUM,
    -FRUSTUM,
    0.1,
    1000,
  );
  // Ângulo isométrico clássico: equidistante nos três eixos.
  cam.position.set(20, 20, 20);
  cam.lookAt(0, 0, 0);
  return cam;
}

// --- Iluminação -----------------------------------------------------------
scene.add(new THREE.HemisphereLight(0x9fd08a, 0x24341f, 0.9));
const sun = new THREE.DirectionalLight(0xfff2c0, 1.1);
sun.position.set(10, 18, 6);
scene.add(sun);

// --- Chão (clareira) ------------------------------------------------------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x3e6b3a }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Grade sutil para dar noção de escala isométrica.
const grid = new THREE.GridHelper(40, 40, 0x2a4a28, 0x2a4a28);
grid.position.y = 0.01;
scene.add(grid);

// --- Druida placeholder ---------------------------------------------------
const druid = new THREE.Mesh(
  new THREE.BoxGeometry(1, 2, 1),
  new THREE.MeshStandardMaterial({ color: 0x6cba5a }),
);
druid.position.y = 1;
scene.add(druid);

// --- Resize ---------------------------------------------------------------
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = -FRUSTUM * aspect;
  camera.right = FRUSTUM * aspect;
  camera.top = FRUSTUM;
  camera.bottom = -FRUSTUM;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.dispatchEvent(new Event('resize'));

// --- Loop -----------------------------------------------------------------
// Placeholder: a partir de M0/M1 isto vira GameLoop com timestep fixo.
function animate(t) {
  druid.rotation.y = t * 0.0006;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
