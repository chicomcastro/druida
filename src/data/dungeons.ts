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
  mood: { background: number; fogNear: number; fogFar: number };
  hazard: DungeonHazard | null;
  miniboss: { name: string; mesh: string; hpMul: number };
}

export const DUNGEON_THEMES: Record<string, DungeonTheme> = {
  clareira: {
    name: 'Toca Raizal',
    floor: 0x27331f, wall: 0x33482a,
    mood: { background: 0x141f0f, fogNear: 24, fogFar: 60 },
    hazard: null, // masmorra introdutória: sem perigo ambiental
    miniboss: { name: 'Raiz-Faminta', mesh: 'husk', hpMul: 0.9 },
  },
  pantano: {
    name: 'Fosso do Lodo',
    floor: 0x2c3324, wall: 0x3a4230,
    mood: { background: 0x141a10, fogNear: 22, fogFar: 55 },
    hazard: { interval: 6, radius: 3, damage: 6, effect: { root: 1.2 }, color: 0x6fd04a, label: 'O lodo borbulha!' },
    miniboss: { name: 'Boca do Brejo', mesh: 'rotboar', hpMul: 1.0 },
  },
  bosque_cinza: {
    name: 'Forno Afundado',
    floor: 0x2e2620, wall: 0x3a2f28,
    mood: { background: 0x1c1410, fogNear: 20, fogFar: 50 },
    hazard: { interval: 5.5, radius: 3, damage: 10, effect: { burn: 2 }, color: 0xff7a2a, label: 'Brasas saltam do chão!' },
    miniboss: { name: 'Carvoeiro Morto', mesh: 'shaman', hpMul: 1.05 },
  },
  picos: {
    name: 'Caverna do Degelo',
    floor: 0x2a3440, wall: 0x38485a,
    mood: { background: 0x141c28, fogNear: 22, fogFar: 55 },
    hazard: { interval: 6, radius: 3.4, damage: 8, effect: { freeze: 1.0 }, color: 0x4aa6ff, label: 'O gelo range!' },
    miniboss: { name: 'Uivo Branco', mesh: 'wolf', hpMul: 1.1 },
  },
  coracao: {
    name: 'Víscera',
    floor: 0x241825, wall: 0x2a1d2e,
    mood: { background: 0x120a14, fogNear: 18, fogFar: 48 },
    hazard: { interval: 5, radius: 3.2, damage: 12, effect: { burn: 1.5 }, color: 0xa64ad0, label: 'A carne do chão pulsa!' },
    miniboss: { name: 'Eco do Apodrecedor', mesh: 'rotlord', hpMul: 1.15 },
  },
};
