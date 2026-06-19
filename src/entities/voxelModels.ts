import * as THREE from 'three';

/**
 * Modelos voxel data-driven, estilo "Minecraft Dungeons": cabeça cúbica grande,
 * corpo blocado com placas de armadura, silhuetas distintas e armas próprias.
 *
 * Cada modelo é um conjunto de PARTES nomeadas (head/torso/armL/legR/…). Uma
 * parte é um grupo posicionado na sua JUNTA (ombro, quadril, pescoço) contendo
 * caixas relativas — assim o animador (procedural) pode girar a parte em torno
 * da junta. `gait` diz ao animador como mover (bípede/quadrúpede/ave/estático).
 */
export type Gait = 'biped' | 'quadruped' | 'bird' | 'static';

export interface VoxelBox {
  size: [number, number, number];
  pos: [number, number, number];
  color: number;
}
export interface VoxelPart {
  name: string;
  joint?: [number, number, number]; // posição da junta (padrão 0,0,0)
  parent?: string; // aninha sob outra parte (ex.: weapon sob armR)
  boxes: VoxelBox[];
}
export interface VoxelModelSpec {
  gait: Gait;
  scale?: number;
  parts: VoxelPart[];
}

// Paleta terrosa/quente coerente com a referência.
const C = {
  hood: 0x3f7d34, leaf: 0x4f8f3f, skin: 0xe6b88c, leather: 0x5a4633, belt: 0x6b4a2f,
  steel: 0x9aa0ad, darksteel: 0x5d636e, gold: 0xe0a93a, bone: 0xe8e0c8,
  wolf: 0x8c8c98, wolfDk: 0x6f7480, bear: 0x6b4a2f, bearLt: 0x7c5636,
  raven: 0x2b2b35, ravenLt: 0x3a3a47, beak: 0xe0a93a,
  frog: 0x5aa64a, frogDk: 0x3f7d34, eye: 0xffe08a,
  boar: 0x5a4633, boarLt: 0x6e5a44,
  crow: 0x33203a, crowLt: 0x4a2f57,
  fung: 0x7a5d8a, cap: 0xb06bd0, capDot: 0xe8c8ff,
  husk: 0x4b3a2a, huskLt: 0x5c4836, rot: 0x6a7a3a,
  shaman: 0x3a5a3a, shamanLt: 0xb8d0a0, mask: 0xe8e0c8,
  lord: 0x3b2a1c, lordLt: 0x55402a, lordRot: 0x6a7a3a, ember: 0xff7a3a,
};

const b = (size: [number, number, number], pos: [number, number, number], color: number): VoxelBox => ({ size, pos, color });

// --- Heróis / Formas -------------------------------------------------------
const druid: VoxelModelSpec = {
  gait: 'biped',
  parts: [
    { name: 'torso', joint: [0, 0.95, 0], boxes: [
      b([0.85, 0.85, 0.55], [0, 0.1, 0], C.leaf),     // túnica
      b([0.95, 0.22, 0.62], [0, -0.28, 0], C.belt),   // cinto
      b([0.5, 0.25, 0.62], [0, 0.18, 0.02], C.leather), // peitoral
    ] },
    { name: 'head', joint: [0, 1.5, 0], boxes: [
      b([0.62, 0.6, 0.62], [0, 0.2, 0], C.skin),       // cabeça GRANDE (cubo)
      b([0.7, 0.34, 0.72], [0, 0.46, 0], C.hood),      // capuz topo
      b([0.72, 0.3, 0.2], [0, 0.18, 0.32], C.hood),    // aba do capuz
      b([0.12, 0.12, 0.06], [-0.16, 0.2, 0.33], 0x2a2a2a), // olhos
      b([0.12, 0.12, 0.06], [0.16, 0.2, 0.33], 0x2a2a2a),
    ] },
    { name: 'armL', joint: [-0.52, 1.35, 0], boxes: [
      b([0.26, 0.6, 0.28], [0, -0.28, 0], C.leaf),
      b([0.3, 0.18, 0.32], [0, 0.04, 0], C.steel),     // pauldron
    ] },
    { name: 'armR', joint: [0.52, 1.35, 0], boxes: [
      b([0.26, 0.6, 0.28], [0, -0.28, 0], C.leaf),
      b([0.3, 0.18, 0.32], [0, 0.04, 0], C.steel),
    ] },
    // Espada na mão direita (parte própria, segue o braço).
    { name: 'weapon', parent: 'armR', joint: [0, -0.5, 0.1], boxes: [
      b([0.1, 0.12, 0.1], [0, 0, 0], C.belt),          // punho
      b([0.16, 0.12, 0.16], [0, 0.06, 0], C.gold),     // guarda
      b([0.14, 0.9, 0.14], [0, 0.6, 0], C.steel),      // lâmina
      b([0.08, 0.2, 0.08], [0, 1.05, 0], C.bone),      // ponta
    ] },
    { name: 'legL', joint: [-0.22, 0.55, 0], boxes: [b([0.3, 0.6, 0.34], [0, -0.3, 0], C.leather)] },
    { name: 'legR', joint: [0.22, 0.55, 0], boxes: [b([0.3, 0.6, 0.34], [0, -0.3, 0], C.leather)] },
  ],
};

const wolf: VoxelModelSpec = {
  gait: 'quadruped',
  parts: [
    { name: 'torso', joint: [0, 0.5, 0], boxes: [
      b([0.6, 0.55, 1.15], [0, 0, -0.05], C.wolf),
      b([0.5, 0.16, 0.5], [0, 0.3, -0.1], C.wolfDk),   // crista
    ] },
    { name: 'head', joint: [0, 0.6, 0.55], boxes: [
      b([0.5, 0.5, 0.5], [0, 0.05, 0.1], C.wolf),      // cabeça grande
      b([0.24, 0.2, 0.28], [0, -0.05, 0.42], C.wolfDk), // focinho
      b([0.12, 0.2, 0.08], [-0.16, 0.32, 0.02], C.wolfDk), // orelhas
      b([0.12, 0.2, 0.08], [0.16, 0.32, 0.02], C.wolfDk),
    ] },
    { name: 'tail', joint: [0, 0.55, -0.6], boxes: [b([0.14, 0.14, 0.45], [0, 0.05, -0.2], C.wolfDk)] },
    { name: 'legFL', joint: [-0.22, 0.32, 0.4], boxes: [b([0.16, 0.42, 0.18], [0, -0.21, 0], C.wolfDk)] },
    { name: 'legFR', joint: [0.22, 0.32, 0.4], boxes: [b([0.16, 0.42, 0.18], [0, -0.21, 0], C.wolfDk)] },
    { name: 'legBL', joint: [-0.22, 0.32, -0.4], boxes: [b([0.16, 0.42, 0.18], [0, -0.21, 0], C.wolfDk)] },
    { name: 'legBR', joint: [0.22, 0.32, -0.4], boxes: [b([0.16, 0.42, 0.18], [0, -0.21, 0], C.wolfDk)] },
  ],
};

const bear: VoxelModelSpec = {
  gait: 'quadruped', scale: 1.05,
  parts: [
    { name: 'torso', joint: [0, 0.75, 0], boxes: [b([1.05, 0.95, 1.35], [0, 0, 0], C.bear)] },
    { name: 'head', joint: [0, 0.95, 0.7], boxes: [
      b([0.62, 0.6, 0.6], [0, 0.1, 0.05], C.bearLt),
      b([0.28, 0.22, 0.2], [0, 0, 0.38], C.bear),      // focinho
      b([0.18, 0.18, 0.1], [-0.26, 0.4, 0], C.bear),   // orelhas redondas
      b([0.18, 0.18, 0.1], [0.26, 0.4, 0], C.bear),
    ] },
    { name: 'legFL', joint: [-0.34, 0.5, 0.45], boxes: [b([0.3, 0.55, 0.32], [0, -0.27, 0], C.bearLt)] },
    { name: 'legFR', joint: [0.34, 0.5, 0.45], boxes: [b([0.3, 0.55, 0.32], [0, -0.27, 0], C.bearLt)] },
    { name: 'legBL', joint: [-0.34, 0.5, -0.45], boxes: [b([0.3, 0.55, 0.32], [0, -0.27, 0], C.bearLt)] },
    { name: 'legBR', joint: [0.34, 0.5, -0.45], boxes: [b([0.3, 0.55, 0.32], [0, -0.27, 0], C.bearLt)] },
  ],
};

const raven: VoxelModelSpec = {
  gait: 'bird',
  parts: [
    { name: 'torso', joint: [0, 0.8, 0], boxes: [b([0.4, 0.5, 0.7], [0, 0, 0], C.raven)] },
    { name: 'head', joint: [0, 1.05, 0.2], boxes: [
      b([0.36, 0.36, 0.36], [0, 0.1, 0.1], C.ravenLt),
      b([0.1, 0.1, 0.26], [0, 0.06, 0.36], C.beak),    // bico
    ] },
    { name: 'wingL', joint: [-0.2, 0.95, 0], boxes: [b([0.5, 0.1, 0.5], [-0.25, 0, 0], C.ravenLt)] },
    { name: 'wingR', joint: [0.2, 0.95, 0], boxes: [b([0.5, 0.1, 0.5], [0.25, 0, 0], C.ravenLt)] },
    { name: 'legL', joint: [-0.12, 0.55, 0], boxes: [b([0.08, 0.3, 0.08], [0, -0.15, 0], C.beak)] },
    { name: 'legR', joint: [0.12, 0.55, 0], boxes: [b([0.08, 0.3, 0.08], [0, -0.15, 0], C.beak)] },
  ],
};

const frog: VoxelModelSpec = {
  gait: 'biped',
  parts: [
    { name: 'torso', joint: [0, 0.3, 0], boxes: [b([0.7, 0.45, 0.7], [0, 0, 0], C.frog)] },
    { name: 'head', joint: [0, 0.5, 0.2], boxes: [
      b([0.7, 0.34, 0.5], [0, 0.04, 0.06], C.frogDk),
      b([0.2, 0.2, 0.2], [-0.22, 0.22, 0.1], C.eye),   // olhos saltados
      b([0.2, 0.2, 0.2], [0.22, 0.22, 0.1], C.eye),
      b([0.1, 0.1, 0.06], [-0.22, 0.22, 0.22], 0x1a1a1a),
      b([0.1, 0.1, 0.06], [0.22, 0.22, 0.22], 0x1a1a1a),
    ] },
    { name: 'legL', joint: [-0.3, 0.2, 0.1], boxes: [b([0.18, 0.2, 0.34], [0, -0.05, 0.05], C.frogDk)] },
    { name: 'legR', joint: [0.3, 0.2, 0.1], boxes: [b([0.18, 0.2, 0.34], [0, -0.05, 0.05], C.frogDk)] },
  ],
};

// --- Inimigos --------------------------------------------------------------
const rotboar: VoxelModelSpec = {
  gait: 'quadruped',
  parts: [
    { name: 'torso', joint: [0, 0.55, 0], boxes: [b([0.85, 0.7, 1.25], [0, 0, 0], C.boar)] },
    { name: 'head', joint: [0, 0.6, 0.6], boxes: [
      b([0.55, 0.5, 0.5], [0, 0, 0.1], C.boarLt),
      b([0.3, 0.26, 0.22], [0, -0.08, 0.38], C.boar),  // focinho
      b([0.08, 0.26, 0.08], [-0.12, 0.0, 0.5], C.bone), // presas
      b([0.08, 0.26, 0.08], [0.12, 0.0, 0.5], C.bone),
    ] },
    { name: 'legFL', joint: [-0.28, 0.32, 0.42], boxes: [b([0.2, 0.4, 0.22], [0, -0.2, 0], C.boarLt)] },
    { name: 'legFR', joint: [0.28, 0.32, 0.42], boxes: [b([0.2, 0.4, 0.22], [0, -0.2, 0], C.boarLt)] },
    { name: 'legBL', joint: [-0.28, 0.32, -0.42], boxes: [b([0.2, 0.4, 0.22], [0, -0.2, 0], C.boarLt)] },
    { name: 'legBR', joint: [0.28, 0.32, -0.42], boxes: [b([0.2, 0.4, 0.22], [0, -0.2, 0], C.boarLt)] },
  ],
};

const shadecrow: VoxelModelSpec = {
  gait: 'bird',
  parts: [
    { name: 'torso', joint: [0, 0.85, 0], boxes: [b([0.42, 0.55, 0.6], [0, 0, 0], C.crow)] },
    { name: 'head', joint: [0, 1.15, 0.1], boxes: [
      b([0.4, 0.4, 0.4], [0, 0.1, 0.08], C.crowLt),
      b([0.12, 0.1, 0.3], [0, 0.06, 0.4], C.beak),
      b([0.12, 0.12, 0.06], [-0.12, 0.16, 0.22], 0xff5a5a), // olhos vermelhos
      b([0.12, 0.12, 0.06], [0.12, 0.16, 0.22], 0xff5a5a),
    ] },
    { name: 'wingL', joint: [-0.22, 1.0, 0], boxes: [b([0.6, 0.1, 0.45], [-0.3, 0, 0], C.crowLt)] },
    { name: 'wingR', joint: [0.22, 1.0, 0], boxes: [b([0.6, 0.1, 0.45], [0.3, 0, 0], C.crowLt)] },
    { name: 'legL', joint: [-0.12, 0.55, 0], boxes: [b([0.08, 0.32, 0.08], [0, -0.16, 0], C.beak)] },
    { name: 'legR', joint: [0.12, 0.55, 0], boxes: [b([0.08, 0.32, 0.08], [0, -0.16, 0], C.beak)] },
  ],
};

const fungling: VoxelModelSpec = {
  gait: 'biped',
  parts: [
    { name: 'torso', joint: [0, 0.35, 0], boxes: [b([0.45, 0.45, 0.45], [0, 0, 0], C.fung)] },
    { name: 'head', joint: [0, 0.6, 0], boxes: [
      b([0.85, 0.32, 0.85], [0, 0.12, 0], C.cap),      // chapéu GRANDE
      b([0.16, 0.1, 0.16], [-0.22, 0.28, 0.1], C.capDot),
      b([0.16, 0.1, 0.16], [0.2, 0.28, -0.1], C.capDot),
      b([0.1, 0.1, 0.05], [-0.1, 0.05, 0.24], 0x1a1a1a), // olhinhos
      b([0.1, 0.1, 0.05], [0.1, 0.05, 0.24], 0x1a1a1a),
    ] },
    { name: 'legL', joint: [-0.14, 0.12, 0], boxes: [b([0.12, 0.24, 0.12], [0, -0.12, 0], C.fung)] },
    { name: 'legR', joint: [0.14, 0.12, 0], boxes: [b([0.12, 0.24, 0.12], [0, -0.12, 0], C.fung)] },
  ],
};

const husk: VoxelModelSpec = {
  gait: 'biped', scale: 1.1,
  parts: [
    { name: 'torso', joint: [0, 1.0, 0], boxes: [
      b([0.7, 1.1, 0.5], [0, 0, 0], C.husk),
      b([0.5, 0.4, 0.3], [0, 0.3, 0.18], C.rot),       // musgo/podridão
    ] },
    { name: 'head', joint: [0, 1.65, 0], boxes: [
      b([0.5, 0.55, 0.5], [0, 0.2, 0], C.huskLt),
      b([0.12, 0.08, 0.06], [-0.14, 0.22, 0.26], 0xffd56a),
      b([0.12, 0.08, 0.06], [0.14, 0.22, 0.26], 0xffd56a),
    ] },
    { name: 'armL', joint: [-0.45, 1.45, 0], boxes: [b([0.2, 0.95, 0.22], [0, -0.45, 0], C.huskLt)] },
    { name: 'armR', joint: [0.45, 1.45, 0], boxes: [b([0.2, 0.95, 0.22], [0, -0.45, 0], C.huskLt)] },
    { name: 'legL', joint: [-0.2, 0.45, 0], boxes: [b([0.24, 0.5, 0.28], [0, -0.25, 0], C.husk)] },
    { name: 'legR', joint: [0.2, 0.45, 0], boxes: [b([0.24, 0.5, 0.28], [0, -0.25, 0], C.husk)] },
  ],
};

const shaman: VoxelModelSpec = {
  gait: 'biped',
  parts: [
    { name: 'torso', joint: [0, 0.95, 0], boxes: [
      b([0.8, 1.0, 0.55], [0, 0, 0], C.shaman),
      b([0.5, 0.3, 0.6], [0, -0.3, 0], C.shamanLt),    // barra do manto
    ] },
    { name: 'head', joint: [0, 1.55, 0], boxes: [
      b([0.5, 0.55, 0.5], [0, 0.2, 0], C.shamanLt),
      b([0.4, 0.42, 0.1], [0, 0.2, 0.28], C.mask),     // máscara
      b([0.1, 0.12, 0.06], [-0.12, 0.22, 0.34], 0x2a2a2a),
      b([0.1, 0.12, 0.06], [0.12, 0.22, 0.34], 0x2a2a2a),
    ] },
    { name: 'armL', joint: [-0.5, 1.35, 0], boxes: [b([0.22, 0.6, 0.24], [0, -0.3, 0], C.shaman)] },
    { name: 'armR', joint: [0.5, 1.35, 0], boxes: [b([0.22, 0.6, 0.24], [0, -0.3, 0], C.shaman)] },
    { name: 'weapon', parent: 'armR', joint: [0, -0.4, 0.05], boxes: [
      b([0.08, 1.2, 0.08], [0, 0.3, 0], C.belt),       // cajado
      b([0.22, 0.22, 0.22], [0, 0.95, 0], C.rot),      // crânio/orbe
    ] },
    { name: 'legL', joint: [-0.2, 0.45, 0], boxes: [b([0.26, 0.5, 0.3], [0, -0.25, 0], C.shamanLt)] },
    { name: 'legR', joint: [0.2, 0.45, 0], boxes: [b([0.26, 0.5, 0.3], [0, -0.25, 0], C.shamanLt)] },
  ],
};

const rotlord: VoxelModelSpec = {
  gait: 'biped', scale: 1.0,
  parts: [
    { name: 'torso', joint: [0, 1.6, 0], boxes: [
      b([2.2, 2.0, 1.8], [0, 0, 0], C.lord),
      b([2.4, 0.5, 2.0], [0, 0.7, 0], C.lordRot),      // ombros podres
      b([1.0, 0.8, 0.6], [0, 0.1, 0.7], C.ember),      // núcleo em brasa
    ] },
    { name: 'head', joint: [0, 2.7, 0], boxes: [
      b([1.1, 1.0, 1.0], [0, 0.4, 0], C.lordLt),
      b([0.2, 0.24, 0.1], [-0.3, 0.45, 0.5], C.ember),
      b([0.2, 0.24, 0.1], [0.3, 0.45, 0.5], C.ember),
      b([0.3, 0.5, 0.3], [-0.5, 1.0, 0], C.bone),      // chifres
      b([0.3, 0.5, 0.3], [0.5, 1.0, 0], C.bone),
    ] },
    { name: 'armL', joint: [-1.3, 2.4, 0], boxes: [b([0.5, 1.6, 0.5], [0, -0.8, 0], C.lordLt)] },
    { name: 'armR', joint: [1.3, 2.4, 0], boxes: [b([0.5, 1.6, 0.5], [0, -0.8, 0], C.lordLt)] },
    { name: 'legL', joint: [-0.55, 1.0, 0], boxes: [b([0.7, 1.1, 0.8], [0, -0.55, 0], C.lord)] },
    { name: 'legR', joint: [0.55, 1.0, 0], boxes: [b([0.7, 1.1, 0.8], [0, -0.55, 0], C.lord)] },
  ],
};

// --- Armas (modelos avulsos, p/ a vitrine) --------------------------------
const sword: VoxelModelSpec = {
  gait: 'static',
  parts: [{ name: 'root', joint: [0, 0.6, 0], boxes: [
    b([0.16, 0.16, 0.16], [0, -0.5, 0], C.belt),
    b([0.4, 0.12, 0.16], [0, -0.38, 0], C.gold),
    b([0.18, 1.0, 0.16], [0, 0.15, 0], C.steel),
    b([0.1, 0.22, 0.1], [0, 0.72, 0], C.bone),
  ] }],
};
const staff: VoxelModelSpec = {
  gait: 'static',
  parts: [{ name: 'root', joint: [0, 0.6, 0], boxes: [
    b([0.1, 1.3, 0.1], [0, -0.1, 0], C.belt),
    b([0.28, 0.28, 0.28], [0, 0.62, 0], C.leaf),
    b([0.12, 0.12, 0.12], [0, 0.62, 0.2], C.eye),
  ] }],
};
const scythe: VoxelModelSpec = {
  gait: 'static',
  parts: [{ name: 'root', joint: [0, 0.6, 0], boxes: [
    b([0.1, 1.3, 0.1], [0, -0.1, 0], C.leather),
    b([0.7, 0.14, 0.12], [0.28, 0.6, 0], C.steel),
    b([0.14, 0.4, 0.12], [0.6, 0.4, 0], C.steel),
  ] }],
};

export const MODEL_SPECS: Record<string, VoxelModelSpec> = {
  druid, wolf, bear, raven, frog,
  rotboar, shadecrow, fungling, husk, shaman, rotlord,
  sword, staff, scythe,
};

/** Lista para a vitrine: personagens, formas, inimigos e armas. */
export const SHOWCASE_GROUPS: Array<{ label: string; kinds: string[] }> = [
  { label: 'Druida & Formas', kinds: ['druid', 'wolf', 'bear', 'raven', 'frog'] },
  { label: 'Inimigos', kinds: ['rotboar', 'shadecrow', 'fungling', 'husk', 'shaman', 'rotlord'] },
  { label: 'Armas', kinds: ['sword', 'staff', 'scythe'] },
];

const _boxGeo = new THREE.BoxGeometry(1, 1, 1);
const _matCache = new Map<number, THREE.MeshStandardMaterial>();
function mat(color: number) {
  let m = _matCache.get(color);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.85 }); _matCache.set(color, m); }
  return m;
}

/**
 * Constrói um THREE.Group a partir de uma spec. As partes nomeadas ficam em
 * `group.userData.parts` (e `group.userData.gait`) para o animador. Geometria
 * unitária + materiais por cor são compartilhados (escala por caixa).
 */
export function buildVoxelGroup(spec: VoxelModelSpec): THREE.Group {
  const root = new THREE.Group();
  const parts: Record<string, THREE.Group> = {};
  for (const part of spec.parts) {
    const g = new THREE.Group();
    const [jx, jy, jz] = part.joint ?? [0, 0, 0];
    g.position.set(jx, jy, jz);
    for (const box of part.boxes) {
      const m = new THREE.Mesh(_boxGeo, mat(box.color));
      m.scale.set(box.size[0], box.size[1], box.size[2]);
      m.position.set(box.pos[0], box.pos[1], box.pos[2]);
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    }
    parts[part.name] = g;
    if (part.parent && parts[part.parent]) {
      // posição da junta relativa ao pai.
      const p = parts[part.parent];
      g.position.set(jx - p.position.x, jy - p.position.y, jz - p.position.z);
      p.add(g);
    } else {
      root.add(g);
    }
  }
  if (spec.scale && spec.scale !== 1) root.scale.setScalar(spec.scale);
  root.userData.parts = parts;
  root.userData.gait = spec.gait;
  return root;
}

/** Retorna o Group do modelo voxel para um `kind`, ou `null` se não houver spec. */
export function buildVoxelModel(kind: string): THREE.Group | null {
  const spec = MODEL_SPECS[kind];
  return spec ? buildVoxelGroup(spec) : null;
}
