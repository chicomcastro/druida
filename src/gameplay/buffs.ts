/**
 * Buffs temporários (E18.3). Comidas e outros consumíveis concedem um efeito com
 * duração — mais dano, mais velocidade ou menos dano recebido — que decai com o
 * tempo. Guardado em `game.buffs` (party), aplicado pelos multiplicadores já
 * existentes (dano em Game.dmgMul, velocidade no playerControl, dano recebido no
 * applyDamage) e desenhado na HUD.
 *
 * Um buff é identificado por `id`: re-consumir o mesmo tipo **renova** a duração
 * em vez de empilhar (sem stacks infinitos). Tipos diferentes coexistem.
 */

export type BuffKind = 'dmg' | 'speed' | 'taken';

export interface Buff {
  id: string;
  kind: BuffKind;
  /** Multiplicador aplicado: dmg/speed > 1; taken < 1 (redução de dano). */
  mul: number;
  remaining: number;
  total: number;
  name: string;
  icon: string;
  color: number;
}

export function ensureBuffs(game): Buff[] {
  return game.buffs || (game.buffs = []);
}

/** Aplica (ou renova) um buff. Mesmo `id` substitui — renova a duração. */
export function applyBuff(game, buff: Buff): void {
  const list = ensureBuffs(game);
  const i = list.findIndex((b) => b.id === buff.id);
  if (i >= 0) list[i] = { ...buff };
  else list.push({ ...buff });
  game.emit?.('buffApplied', buff);
}

/** Decai as durações e remove os que acabaram. Chamar no update. */
export function tickBuffs(game, dt: number): void {
  const list = ensureBuffs(game);
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].remaining -= dt;
    if (list[i].remaining <= 0) {
      const b = list.splice(i, 1)[0];
      game.emit?.('buffExpired', b);
    }
  }
}

/** Produto dos multiplicadores ativos de um tipo (1 se nenhum). */
export function buffMul(game, kind: BuffKind): number {
  let m = 1;
  for (const b of ensureBuffs(game)) if (b.kind === kind) m *= b.mul;
  return m;
}

export function activeBuffs(game): Buff[] {
  return ensureBuffs(game);
}
