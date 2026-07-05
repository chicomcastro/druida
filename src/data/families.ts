/**
 * Camada social da Clareira (ADR 0095, E5.2): duas famílias com uma rixa
 * antiga. Os NPCs dos interiores pertencem a uma delas e fofocam sobre a
 * outra — falas que se referenciam. Conversar revela fragmentos do codex
 * (segredos da rixa). Base para o arco de quest do E6.
 */

export interface Family {
  id: string;
  name: string;
  trade: string;
  color: number;
  /** Fofoca acusando a família rival. */
  gossip: string;
}

export const FAMILIES: Record<string, Family> = {
  fenwick: {
    id: 'fenwick', name: 'Fenwick', trade: 'a forja', color: 0xff8a3a,
    gossip: 'Os Aldren desviam a água do moinho. Sem água, o aço esfria torto — e eles sabem disso.',
  },
  aldren: {
    id: 'aldren', name: 'Aldren', trade: 'os campos', color: 0x9fe06a,
    gossip: 'A fumaça da forja dos Fenwick mata o trigo. Chamam de progresso; eu chamo de veneno.',
  },
};

export function family(id?: string): Family | null {
  return id ? FAMILIES[id] ?? null : null;
}
