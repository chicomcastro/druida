import * as THREE from 'three';

/**
 * Construtores de meshes voxel placeholder, montados a partir de caixas.
 * Substituíveis por modelos .glb (MagicaVoxel) no futuro sem mudar os sistemas
 * — o RenderSyncSystem só liga Transform -> object3d.
 */
function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function humanoid(robe, skin) {
  const g = new THREE.Group();
  g.add(box(0.7, 0.9, 0.5, robe, 0, 0.85, 0)); // tronco/manto
  g.add(box(0.45, 0.45, 0.45, skin, 0, 1.55, 0)); // cabeça
  g.add(box(0.25, 0.5, 0.25, robe, -0.45, 0.95, 0)); // braço
  g.add(box(0.25, 0.5, 0.25, robe, 0.45, 0.95, 0));
  // pequeno marcador frontal para indicar direção
  g.add(box(0.15, 0.15, 0.15, 0xffe08a, 0, 1.55, 0.28));
  return g;
}

const builders = {
  druid: () => humanoid(0x4f8f3f, 0xdcb892),

  wolf: () => {
    const g = new THREE.Group();
    g.add(box(0.6, 0.5, 1.1, 0x8c8c98, 0, 0.45, 0));
    g.add(box(0.4, 0.4, 0.4, 0x9aa0ad, 0, 0.6, 0.7));
    g.add(box(0.12, 0.12, 0.4, 0x6f7480, 0, 0.45, -0.75)); // cauda
    return g;
  },

  bear: () => {
    const g = new THREE.Group();
    g.add(box(1.1, 1.0, 1.4, 0x6b4a2f, 0, 0.7, 0));
    g.add(box(0.6, 0.6, 0.6, 0x7c5636, 0, 1.1, 0.7));
    return g;
  },

  raven: () => {
    const g = new THREE.Group();
    g.add(box(0.4, 0.4, 0.7, 0x2b2b35, 0, 0.9, 0));
    g.add(box(0.9, 0.08, 0.4, 0x1d1d26, 0, 0.95, 0)); // asas
    return g;
  },

  frog: () => {
    const g = new THREE.Group();
    g.add(box(0.7, 0.4, 0.7, 0x5aa64a, 0, 0.3, 0));
    g.add(box(0.18, 0.18, 0.18, 0xffe08a, -0.18, 0.5, 0.3));
    g.add(box(0.18, 0.18, 0.18, 0xffe08a, 0.18, 0.5, 0.3));
    return g;
  },

  // Inimigos
  rotboar: () => {
    const g = new THREE.Group();
    g.add(box(0.9, 0.7, 1.3, 0x5a4633, 0, 0.55, 0));
    g.add(box(0.5, 0.5, 0.5, 0x6e5a44, 0, 0.7, 0.7));
    g.add(box(0.1, 0.3, 0.1, 0xe8e0c8, 0, 0.6, 1.0)); // presa
    return g;
  },
  shadecrow: () => {
    const g = new THREE.Group();
    g.add(box(0.4, 0.5, 0.5, 0x33203a, 0, 0.9, 0));
    g.add(box(0.8, 0.08, 0.35, 0x4a2f57, 0, 1.0, 0));
    return g;
  },
  fungling: () => {
    const g = new THREE.Group();
    g.add(box(0.5, 0.5, 0.5, 0x7a5d8a, 0, 0.35, 0));
    g.add(box(0.7, 0.25, 0.7, 0xb06bd0, 0, 0.7, 0)); // chapéu
    return g;
  },
  husk: () => {
    const g = new THREE.Group();
    g.add(box(0.8, 1.3, 0.6, 0x4b3a2a, 0, 1.0, 0));
    g.add(box(0.5, 0.5, 0.5, 0x5c4836, 0, 1.7, 0));
    return g;
  },
  shaman: () => {
    const g = new THREE.Group();
    g.add(box(0.7, 1.1, 0.5, 0x3a5a3a, 0, 0.95, 0));
    g.add(box(0.45, 0.45, 0.45, 0xb8d0a0, 0, 1.6, 0));
    g.add(box(0.1, 1.4, 0.1, 0x8a6a3a, 0.5, 1.0, 0)); // cajado
    return g;
  },
  // Chefe
  rotlord: () => {
    const g = new THREE.Group();
    g.add(box(2.2, 2.6, 2.0, 0x3b2a1c, 0, 1.4, 0));
    g.add(box(1.2, 1.0, 1.0, 0x55402a, 0, 2.8, 0));
    g.add(box(0.3, 1.6, 0.3, 0x2a1d12, 1.4, 1.6, 0));
    g.add(box(0.3, 1.6, 0.3, 0x2a1d12, -1.4, 1.6, 0));
    return g;
  },
};

export function buildMesh(kind) {
  const fn = builders[kind] ?? builders.rotboar;
  const g = fn();
  g.userData.kind = kind;
  return g;
}

/** Pequena esfera/cristal usada para projéteis e loot. */
export function buildOrb(color = 0x88e0ff, radius = 0.22) {
  const m = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius, 0),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.6,
      roughness: 0.4,
    }),
  );
  m.castShadow = true;
  return m;
}
