import { interiorTheme } from '../data/interiors.js';
import { FAMILIES } from '../data/families.js';

/**
 * Reputação por vila (ADR 0108, E11b). Cada assentamento tem uma reputação que
 * sobe ao ajudá-lo: concluir a missão do ancião (+1) e, sobretudo, reconciliar
 * a rixa das famílias (+2). Reputação alta rende **desconto** no mercador e nas
 * lojas-família daquela vila — amarra o pilar "evoluir comprando" ao conteúdo
 * social. Persistida no save; exibida no mapa-mundi.
 */

/** Quanto cada quest concluída rende, e para qual assentamento. */
export const REP_BY_QUEST: Record<string, { settlement: string; amount: number }> = {
  // Rixas (reconciliação) — o grosso da reputação.
  feud: { settlement: 'circulo_carvalho', amount: 2 },
  feud_vau: { settlement: 'vau_palafitas', amount: 2 },
  feud_cinza: { settlement: 'cinzafolha', amount: 2 },
  feud_degelo: { settlement: 'abrigo_degelo', amount: 2 },
  // Missões do ancião (ADR 0047).
  q_vau: { settlement: 'vau_palafitas', amount: 1 },
  q_cinza: { settlement: 'cinzafolha', amount: 1 },
  q_degelo: { settlement: 'abrigo_degelo', amount: 1 },
};

/** Reputação atual de uma vila (0 se nunca subiu). */
export function reputationOf(game, settlement: string): number {
  return game.reputation?.[settlement] ?? 0;
}

/**
 * Desconto por reputação: 0 até 1, 5% em 2–3, 10% a partir de 4. Faixas em
 * degraus para o jogador sentir cada marco.
 */
export function repDiscount(game, settlement: string): number {
  const r = reputationOf(game, settlement);
  if (r >= 4) return 0.10;
  if (r >= 2) return 0.05;
  return 0;
}

/**
 * A qual assentamento pertence uma loja (chave do estoque ativo). Mercadores de
 * vila usam o id do assentamento; lojas de interior usam `interior:<tema>` e
 * são mapeadas pela família do tema. Devolve null quando é neutra (hub, mercado
 * geral, taverna).
 */
export function shopSettlement(key?: string | null): string | null {
  if (!key) return null;
  if (key.startsWith('interior:')) {
    const theme = interiorTheme(key.slice('interior:'.length));
    const fam = theme.family ? FAMILIES[theme.family] : null;
    return fam?.settlement ?? null;
  }
  // Mercador regional de vila: a chave é o próprio id do assentamento.
  return key === 'hub' ? null : key;
}

/** Soma reputação a uma vila e anuncia (uma vez por concessão). */
export function addReputation(game, settlement: string, amount: number): void {
  if (!settlement || !amount) return;
  game.reputation = game.reputation ?? {};
  game.reputation[settlement] = (game.reputation[settlement] ?? 0) + amount;
  game.emit?.('reputationChanged', { settlement, value: game.reputation[settlement], amount });
  game.emit?.('objective', { text: `⭐ Reputação em alta (+${amount})` });
}

/** Liga o ganho de reputação às conclusões de quest (ancião + rixa). */
export function registerReputationHooks(game): void {
  game.on('questCompleted', (e) => {
    const r = e?.id ? REP_BY_QUEST[e.id] : null;
    if (r) addReputation(game, r.settlement, r.amount);
  });
}
