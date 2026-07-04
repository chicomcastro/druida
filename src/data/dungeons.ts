/**
 * Temas de masmorra por bioma da entrada (ADR 0048): paleta da arena, clima,
 * perigo ambiental periódico (telegrafado) e o mini-chefe da onda final.
 * O pool de inimigos vem da tabela do próprio bioma (ADR 0007).
 */
export interface DungeonHazard {
  /** Intervalo entre perigos (s). */
  interval: number;
  radius: number;
  damage: number;
  /** Status aplicado a quem for pego (root/burn/freeze/slow…). */
  effect: Record<string, number>;
  color: number;
  label: string;
}

export interface DungeonTheme {
  name: string;
  floor: number;
  wall: number;
  mood: { background: number; fogNear: number; fogFar: number; light?: any };
  hazard: DungeonHazard | null;
  miniboss: { name: string; mesh: string; hpMul: number };
}

export const DUNGEON_THEMES: Record<string, DungeonTheme> = {
  clareira: {
    name: 'Toca Raizal',
    floor: 0x3d4d31, wall: 0x475f3b,
    mood: { background: 0x141f0f, fogNear: 42, fogFar: 100, light: { sun: 0xbfd8c8, sunIntensity: 0.85, hemi: 0x9ab8a0, hemiGround: 0x16200f, hemiIntensity: 0.45 } },
    hazard: null, // masmorra introdutória: sem perigo ambiental
    miniboss: { name: 'Raiz-Faminta', mesh: 'husk', hpMul: 0.9 },
  },
  pantano: {
    name: 'Fosso do Lodo',
    floor: 0x424d38, wall: 0x4e5a42,
    mood: { background: 0x141a10, fogNear: 40, fogFar: 95, light: { sun: 0xa8c890, sunIntensity: 0.8, hemi: 0x8aa878, hemiGround: 0x121a0c, hemiIntensity: 0.42 } },
    hazard: { interval: 6, radius: 3, damage: 6, effect: { root: 1.2 }, color: 0x6fd04a, label: 'O lodo borbulha!' },
    miniboss: { name: 'Boca do Brejo', mesh: 'rotboar', hpMul: 1.0 },
  },
  bosque_cinza: {
    name: 'Forno Afundado',
    floor: 0x463a31, wall: 0x52453a,
    mood: { background: 0x1c1410, fogNear: 40, fogFar: 92, light: { sun: 0xe8b890, sunIntensity: 0.85, hemi: 0xa89078, hemiGround: 0x1a120c, hemiIntensity: 0.42 } },
    hazard: { interval: 5.5, radius: 3, damage: 10, effect: { burn: 2 }, color: 0xff7a2a, label: 'Brasas saltam do chão!' },
    miniboss: { name: 'Carvoeiro Morto', mesh: 'shaman', hpMul: 1.05 },
  },
  picos: {
    name: 'Caverna do Degelo',
    floor: 0x3e4c5c, wall: 0x4c617a,
    mood: { background: 0x141c28, fogNear: 40, fogFar: 95, light: { sun: 0xb8d8f0, sunIntensity: 0.9, hemi: 0x98b8d0, hemiGround: 0x101823, hemiIntensity: 0.45 } },
    hazard: { interval: 6, radius: 3.4, damage: 8, effect: { freeze: 1.0 }, color: 0x4aa6ff, label: 'O gelo range!' },
    miniboss: { name: 'Uivo Branco', mesh: 'wolf', hpMul: 1.1 },
  },
  coracao: {
    name: 'Víscera',
    floor: 0x38263a, wall: 0x402c44,
    mood: { background: 0x120a14, fogNear: 38, fogFar: 88, light: { sun: 0xc898d8, sunIntensity: 0.8, hemi: 0x8a6a9a, hemiGround: 0x10081a, hemiIntensity: 0.4 } },
    hazard: { interval: 5, radius: 3.2, damage: 12, effect: { burn: 1.5 }, color: 0xa64ad0, label: 'A carne do chão pulsa!' },
    miniboss: { name: 'Eco do Apodrecedor', mesh: 'rotlord', hpMul: 1.15 },
  },
};
