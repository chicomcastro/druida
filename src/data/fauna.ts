/**
 * Fauna ambiente por bioma (ADR 0098, E8). Bichos que vagueiam e fogem do
 * jogador, dando vida ao mundo aberto. A maioria é **caçável** (ADR 0157): tem
 * vida e, ao ser abatida, solta ingredientes de cozinha temáticos da espécie —
 * é assim que a fauna alimenta a culinária (carne/sebo/ovo vindos dos animais,
 * não só dos monstros). Bichos sem `drops` seguem só de enfeite (ex.: libélula).
 * Data-driven para tunar no playtest (Gate E). O Coração Corrompido não tem
 * fauna: nada sobrevive lá.
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
  hp?: number;    // vida — presente ⇒ caçável (sem hp = só enfeite)
  drops?: Record<string, number>; // ingredientes soltos ao abater (id → qtd)
}

export const FAUNA_BY_BIOME: Record<string, FaunaDef[]> = {
  clareira: [
    { id: 'cervo', name: 'Cervo', color: 0x9a6b43, accent: 0xe8d8c0, size: 1.15, speed: 2.2, flee: 9, hp: 14, drops: { carne_crua: 2, sebo: 1 } },
    { id: 'lebre', name: 'Lebre', color: 0xb8a074, accent: 0xf0e8d8, size: 0.55, speed: 2.6, flee: 7, hop: true, hp: 6, drops: { carne_crua: 1 } },
  ],
  pantano: [
    { id: 'sapo', name: 'Sapo', color: 0x5a8f4a, accent: 0xc8e08a, size: 0.5, speed: 1.6, flee: 5, hop: true, hp: 6, drops: { carne_crua: 1 } },
    { id: 'libelula', name: 'Libélula', color: 0x4ab0c8, accent: 0xa0f0ff, size: 0.35, speed: 3.0, flee: 6 },
  ],
  bosque_cinza: [
    { id: 'corvo', name: 'Corvo', color: 0x2a2a30, accent: 0x6a6a78, size: 0.5, speed: 2.8, flee: 8, hp: 6, drops: { ovo: 1 } },
    { id: 'lebre_cinza', name: 'Lebre-cinza', color: 0x8a8478, accent: 0xd0cabc, size: 0.55, speed: 2.6, flee: 7, hop: true, hp: 6, drops: { carne_crua: 1 } },
  ],
  picos: [
    { id: 'cabra', name: 'Cabra-das-rochas', color: 0xd8d0c0, accent: 0x8a7a5a, size: 0.9, speed: 2.0, flee: 8, hp: 14, drops: { carne_crua: 2, sebo: 1 } },
    { id: 'coruja', name: 'Coruja-da-neve', color: 0xeaf0f8, accent: 0xb0c0d0, size: 0.55, speed: 2.6, flee: 7, hp: 8, drops: { ovo: 1 } },
  ],
  coracao: [],
};
