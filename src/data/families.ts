/**
 * Camada social das vilas (ADR 0095 na Clareira, ADR 0107 nas vilas 2–4): cada
 * assentamento tem DUAS famílias com uma rixa antiga, temática ao ofício/bioma
 * local. Os NPCs dos interiores pertencem a uma delas e fofocam sobre a outra —
 * falas que se referenciam. Conversar revela fragmentos do codex (segredos da
 * rixa). Cada rixa tem um arco de side quest (E6/E11) que a reconcilia.
 */

export interface Family {
  id: string;
  name: string;
  trade: string;
  color: number;
  /** Assentamento a que a família pertence. */
  settlement: string;
  /** Fofoca acusando a família rival. */
  gossip: string;
}

export const FAMILIES: Record<string, Family> = {
  // --- Círculo do Carvalho (Clareira) — ADR 0095 ---------------------------
  fenwick: {
    id: 'fenwick', name: 'Fenwick', trade: 'a forja', color: 0xff8a3a, settlement: 'circulo_carvalho',
    gossip: 'Os Aldren desviam a água do moinho. Sem água, o aço esfria torto — e eles sabem disso.',
  },
  aldren: {
    id: 'aldren', name: 'Aldren', trade: 'os campos', color: 0x9fe06a, settlement: 'circulo_carvalho',
    gossip: 'A fumaça da forja dos Fenwick mata o trigo. Chamam de progresso; eu chamo de veneno.',
  },
  // --- Vau das Palafitas (Pântano): a rixa da água escura — ADR 0107 -------
  vison: {
    id: 'vison', name: 'Vison', trade: 'os canais e os arpões', color: 0x5a86a8, settlement: 'vau_palafitas',
    gossip: 'Os Caniço afundam os filtros deles nos meus canais. O peixe some, e a culpa sobra pra mim.',
  },
  canico: {
    id: 'canico', name: 'Caniço', trade: 'os filtros de seiva', color: 0x7a8a3a, settlement: 'vau_palafitas',
    gossip: 'Os barcos dos Vison remexem o lodo o dia todo. Seiva boa não se filtra em água suja.',
  },
  // --- Cinzafolha (Bosque Cinza): cortar × queimar — ADR 0107 --------------
  cerne: {
    id: 'cerne', name: 'Cerne', trade: 'a serraria', color: 0x8a5a2a, settlement: 'cinzafolha',
    gossip: 'Os Brasa queimam tora boa por preguiça de separar. Madeira sã virando carvão — que desperdício.',
  },
  brasa: {
    id: 'brasa', name: 'Brasa', trade: 'os fornos de carvão', color: 0xd06a2a, settlement: 'cinzafolha',
    gossip: 'Os Cerne serram devagar demais. Enquanto medem a tora, a podridão já caminhou pra próxima.',
  },
  // --- Abrigo do Degelo (Picos): a trilha × o rebanho — ADR 0107 -----------
  cairn: {
    id: 'cairn', name: 'Cairn', trade: 'a trilha e os marcos', color: 0x8fb8d8, settlement: 'abrigo_degelo',
    gossip: 'O rebanho dos Velo derruba meus cairns na encosta. Cada pedra caída é um passo perdido pro Coração.',
  },
  velo: {
    id: 'velo', name: 'Velo', trade: 'o rebanho', color: 0xcabf9a, settlement: 'abrigo_degelo',
    gossip: 'Os Cairn fecham o melhor pasto por causa de umas pedras empilhadas. Bicho não come rezas.',
  },
};

export function family(id?: string): Family | null {
  return id ? FAMILIES[id] ?? null : null;
}

/** As duas famílias de um assentamento (par da rixa), na ordem de definição. */
export function familiesOf(settlement: string): Family[] {
  return Object.values(FAMILIES).filter((f) => f.settlement === settlement);
}
