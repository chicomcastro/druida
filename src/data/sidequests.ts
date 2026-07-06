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
  // --- Rixas das vilas 2–4 (ADR 0107): cada uma reconcilia um par de famílias.
  {
    id: 'feud_vau',
    title: 'A Água de Todos',
    giver: 'Ália Caniço',
    // Desbloqueia ao descobrir o segredo (a Corrupção turva a água), na curtidora.
    unlock: { lore: 'l17' },
    steps: [
      { desc: 'Leve a verdade a Nereu Vison, na Casa dos Arpões', talk: 'vau_arpo' },
      { desc: 'Confirme com Ália Caniço, no curtume', talk: 'vau_couro' },
    ],
    reward: { essence: 55 },
    intro: [
      'Não são os filtros nem os barcos: é a Corrupção subindo pelo leito do brejo.',
      'Leve essa verdade aos Vison e aos Caniço. Talvez parem de brigar de costas um pro outro.',
    ],
    outro: [
      'Vison e Caniço mediram a água juntos pela primeira vez em anos.',
      'Agora filtram na correnteza e pescam rio acima. O Vau respira — e você abriu o caminho.',
    ],
  },
  {
    id: 'feud_cinza',
    title: 'Serra e Fogo',
    giver: 'Móra Brasa',
    // Desbloqueia ao descobrir que a podridão anda mais rápido que serra/forno.
    unlock: { lore: 'l19' },
    steps: [
      { desc: 'Leve a verdade a Torvald Cerne, na serraria', talk: 'cinza_serra' },
      { desc: 'Confirme com Móra Brasa, no forno', talk: 'cinza_forno' },
    ],
    reward: { essence: 60 },
    intro: [
      'Serrar e queimar não competem: sozinhos, nenhum alcança a podridão a tempo.',
      'Faça os Cerne e os Brasa ouvirem isso antes que o bosque caia entre os dois.',
    ],
    outro: [
      'Agora a serra marca a tora e o forno segue atrás, no mesmo passo.',
      'Cinzafolha corta E queima — e a podridão, pela primeira vez, está atrasada.',
    ],
  },
  {
    id: 'feud_degelo',
    title: 'Pedra e Rebanho',
    giver: 'Kível Cairn',
    // Desbloqueia ao descobrir por que o rebanho foge (a podridão sobe do Coração).
    unlock: { lore: 'l21' },
    steps: [
      { desc: 'Leve a verdade a Sarna Velo, no redil', talk: 'degelo_pasto' },
      { desc: 'Confirme com Kível Cairn, na Casa da Trilha', talk: 'degelo_trilha' },
    ],
    reward: { essence: 65 },
    intro: [
      'O rebanho não derruba os cairns por capricho: foge da podridão que sobe do Coração.',
      'Cairn e Velo enfrentam a mesma maré. Faça-os erguer os marcos juntos.',
    ],
    outro: [
      'Os Velo passaram a tocar o rebanho longe da trilha; os Cairn refizeram os marcos caídos.',
      'A encosta tem pasto e caminho outra vez. A montanha lembra do que você fez.',
    ],
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
