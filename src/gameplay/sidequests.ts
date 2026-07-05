import { C } from '../core/ecs/components.js';
import { SIDE_QUESTS } from '../data/sidequests.js';
import { revealLore } from '../data/lore.js';

/**
 * Máquina de side quests por triggers (ADR 0096, E6). Cada quest é
 * DESBLOQUEADA por condições do progresso (visitou N vilas, descobriu um
 * segredo do codex, despertou uma forma) e AVANÇA conversando com NPCs
 * específicos — inclusive entre vilas. Sem lógica de mundo/combate: reage a
 * eventos já existentes (settlementEntered/loreFound/formUnlocked) e a
 * `talkedNpc` (emitido pela interação com os NPCs de interior). Estado
 * (status + passo) persiste no save.
 */
export class SideQuestManager {
  game: any;
  states: Record<string, { status: 'locked' | 'active' | 'done'; step: number }>;
  visited: Set<string>;
  forms: Set<string>;

  constructor(game) {
    this.game = game;
    this.states = {};
    this.visited = new Set();
    this.forms = new Set();
    for (const q of SIDE_QUESTS) this.states[q.id] = { status: 'locked', step: 0 };
    game.on('settlementEntered', (e) => { if (e?.id) { this.visited.add(e.id); this._checkUnlocks(); } });
    game.on('formUnlocked', (e) => { if (e?.form) { this.forms.add(e.form); this._checkUnlocks(); } });
    game.on('loreFound', () => this._checkUnlocks());
    game.on('talkedNpc', (e) => this._advance(e?.npc));
  }

  _unlocked(q): boolean {
    const u = q.unlock ?? {};
    if (u.visited != null && this.visited.size < u.visited) return false;
    if (u.lore != null && !this.game.lore?.found?.has(u.lore)) return false;
    if (u.form != null && !(u.form === 'any' ? this.forms.size > 0 : this.forms.has(u.form))) return false;
    return true;
  }

  _checkUnlocks() {
    for (const q of SIDE_QUESTS) {
      const st = this.states[q.id];
      if (st.status !== 'locked' || !this._unlocked(q)) continue;
      st.status = 'active';
      st.step = 0;
      this.game.emit('dialogue', { lines: q.intro });
      this.game.emit('objective', { text: `🗒️ ${q.title}: ${q.steps[0].desc}` });
      this.game.emit('sideQuestStarted', { id: q.id });
    }
  }

  _advance(npc?: string) {
    if (!npc) return;
    for (const q of SIDE_QUESTS) {
      const st = this.states[q.id];
      if (st.status !== 'active') continue;
      if (q.steps[st.step]?.talk !== npc) continue;
      st.step++;
      if (st.step >= q.steps.length) this._complete(q);
      else this.game.emit('objective', { text: `🗒️ ${q.title}: ${q.steps[st.step].desc}` });
    }
  }

  _complete(q) {
    const st = this.states[q.id];
    st.status = 'done';
    this.game.emit('dialogue', { lines: q.outro });
    if (q.reward.essence) {
      for (const [, pc, inv] of this.game.world.query(C.PlayerControlled, C.Inventory)) {
        if (pc.index === 0) { inv.essence += q.reward.essence; this.game.emit('essence', { amount: q.reward.essence }); break; }
      }
    }
    if (q.reward.lore) revealLore(this.game, q.reward.lore);
    this.game.emit('objective', { text: `✅ ${q.title} concluída! (+${q.reward.essence} ✦)` });
    this.game.emit('questCompleted', { id: q.id });
  }

  /** Quests ativas para o diário/HUD. */
  activeList() {
    return SIDE_QUESTS.filter((q) => this.states[q.id].status === 'active')
      .map((q) => ({ id: q.id, title: q.title, desc: q.steps[this.states[q.id].step]?.desc ?? '' }));
  }

  // --- Persistência ---------------------------------------------------------
  serialize() {
    return { states: { ...this.states }, visited: [...this.visited], forms: [...this.forms] };
  }

  restore(data) {
    if (!data) return;
    this.visited = new Set(data.visited ?? []);
    this.forms = new Set(data.forms ?? []);
    for (const [id, st] of Object.entries(data.states ?? {})) {
      if (this.states[id]) this.states[id] = { status: (st as any).status ?? 'locked', step: (st as any).step ?? 0 };
    }
  }
}
