/**
 * Fauna ambiente por bioma (ADR 0098, E8). Bichos inofensivos que vagueiam,
 * fogem do jogador e dão vida ao mundo aberto — sem combate. Data-driven para
 * tunar densidade/comportamento no playtest (Gate E). O Coração Corrompido não
 * tem fauna: nada sobrevive lá.
 */

export interface FaunaDef {
  id: string;
  name: string;
  color: number;
  accent: number;
  size: number;   // escala do modelo
  speed: number;  // velocidade de passeio (e fuga = ×1.8)
  flee: number;   // raio em que foge do jogador (u)
  hop?: boolean;  // pula (sapo/lebre) em vez de trotar
}

export const FAUNA_BY_BIOME: Record<string, FaunaDef[]> = {
  clareira: [
    { id: 'cervo', name: 'Cervo', color: 0x9a6b43, accent: 0xe8d8c0, size: 1.15, speed: 2.2, flee: 9 },
    { id: 'lebre', name: 'Lebre', color: 0xb8a074, accent: 0xf0e8d8, size: 0.55, speed: 2.6, flee: 7, hop: true },
  ],
  pantano: [
    { id: 'sapo', name: 'Sapo', color: 0x5a8f4a, accent: 0xc8e08a, size: 0.5, speed: 1.6, flee: 5, hop: true },
    { id: 'libelula', name: 'Libélula', color: 0x4ab0c8, accent: 0xa0f0ff, size: 0.35, speed: 3.0, flee: 6 },
  ],
  bosque_cinza: [
    { id: 'corvo', name: 'Corvo', color: 0x2a2a30, accent: 0x6a6a78, size: 0.5, speed: 2.8, flee: 8 },
  ],
  picos: [
    { id: 'cabra', name: 'Cabra-das-rochas', color: 0xd8d0c0, accent: 0x8a7a5a, size: 0.9, speed: 2.0, flee: 8 },
    { id: 'coruja', name: 'Coruja-da-neve', color: 0xeaf0f8, accent: 0xb0c0d0, size: 0.55, speed: 2.6, flee: 7 },
  ],
  coracao: [],
};
