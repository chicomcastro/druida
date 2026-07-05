/**
 * Side quests & eventos de mid-game (ADR 0096, E6). Diferente das missões do
 * ancião (uma por vila, combate — ADR 0047), estas são desbloqueadas por
 * CONDIÇÕES do progresso (visitou N vilas, descobriu um segredo, despertou uma
 * forma) e avançam conversando com NPCs específicos — inclusive entre vilas.
 * Tudo data-driven para escalar no playtest (Gate D) e replicar no E7.
 */

/** Condições de desbloqueio (avaliadas sobre um snapshot do progresso). */
export interface UnlockDef {
  /** Nº mínimo de assentamentos visitados. */
  visited?: number;
  /** Fragmento do codex já descoberto. */
  lore?: string;
  /** Forma ancestral despertada (id ou 'any'). */
  form?: string;
}

/** Um passo avança ao CONVERSAR com o NPC indicado (evento talkedNpc). */
export interface StepDef {
  desc: string;
  talk: string; // id do NPC/tema de interior (ex.: 'weapons', 'leader')
}

export interface SideQuest {
  id: string;
  title: string;
  giver: string;
  unlock: UnlockDef;
  steps: StepDef[];
  reward: { essence: number; lore?: string };
  intro: string[];
  outro: string[];
}

export const SIDE_QUESTS: SideQuest[] = [
  {
    id: 'feud',
    title: 'O Nó de Duas Cordas',
    giver: 'Anciã Maroa',
    // Desbloqueia ao descobrir o SEGREDO da rixa (o cronista, no salão).
    unlock: { lore: 'l14' },
    steps: [
      { desc: 'Leve a verdade a Brida Fenwick, na forja', talk: 'weapons' },
      { desc: 'Leve a verdade a Orin Aldren, na armaduraria', talk: 'armor' },
      { desc: 'Conte à anciã Maroa que as famílias ouviram', talk: 'leader' },
    ],
    reward: { essence: 60, lore: 'l15' },
    intro: [
      'Você entendeu antes deles: foi a Corrupção que secou a nascente.',
      'Leve essa verdade às duas famílias. Talvez a rixa morra onde nasceu.',
    ],
    outro: [
      'Fenwick e Aldren se olharam sem rosnar — faz anos que não via isso.',
      'Reatamos o nó de duas cordas. A Clareira respira melhor. Obrigada, druida.',
    ],
  },
  {
    id: 'shapeshifter',
    title: 'Pele Emprestada',
    giver: 'Tovar, o Cronista',
    // Desbloqueia ao despertar QUALQUER forma ancestral.
    unlock: { form: 'any' },
    steps: [
      { desc: 'Mostre sua nova forma ao cronista, no salão', talk: 'hall' },
    ],
    reward: { essence: 35, lore: 'l3' },
    intro: ['Uma forma nova! O cronista do salão coleciona essas histórias — mostre a ele.'],
    outro: ['Tovar registra sua forma no códice, os olhos brilhando. "Urso, lobo, corvo, sapo… e você."'],
  },
  {
    id: 'wanderer',
    title: 'Pés de Estrada',
    giver: 'Vesna, a Taverneira',
    // Desbloqueia ao visitar 2+ assentamentos (incentiva explorar o mundo).
    unlock: { visited: 2 },
    steps: [
      { desc: 'Descanse na taverna e conte suas viagens a Vesna', talk: 'tavern' },
    ],
    reward: { essence: 40 },
    intro: ['Dizem que você já pisou em outras vilas. A taverneira adora uma boa história de estrada.'],
    outro: ['Vesna serve a melhor caneca da casa. "Volte sempre, andarilho — a estrada é longa."'],
  },
];
