import { C } from '../core/ecs/components.js';
import { SETTLEMENTS } from '../data/settlements.js';
import { createLootOrb } from '../entities/factories.js';
import { promoteToElite } from './spawn.js';
import { weightedPick, makeRng } from '../utils/math.js';
import { BIOMES } from '../data/biomes.js';

/**
 * Missões locais das vilas (ADR 0047): o ancião de cada assentamento oferece
 * UMA missão temática (coletar / caçar / elite). Aceitar spawna os objetivos
 * ao redor da vila; completar dá essência + um artefato único temático.
 * Estados persistem no save (status + progresso; objetivos vivos respawnam
 * ao restaurar).
 */

export class QuestManager {
  game: any;
  states: Record<string, { status: 'available' | 'active' | 'done'; progress: number; targets: number[] }>;

  constructor(game) {
    this.game = game;
    this.states = {};
    for (const s of SETTLEMENTS) {
      if (s.quest) this.states[s.quest.id] = { status: 'available', progress: 0, targets: [] };
    }
    game.on('kill', (e) => this._onKill(e));
    game.on('questItem', (e) => this._onCollect(e));
  }

  _questById(id) {
    for (const s of SETTLEMENTS) if (s.quest?.id === id) return { s, q: s.quest };
    return null;
  }

  /** Interação com o ancião (kind quest_giver). */
  onTalk(inter) {
    const found = this._questById(inter.questId);
    if (!found) return;
    const { s, q } = found;
    const st = this.states[q.id];
    if (st.status === 'available') {
      st.status = 'active';
      this._spawnObjectives(s, q, q.count);
      this.game.emit('dialogue', { lines: q.offer });
      this.game.emit('objective', { text: `🗞️ ${q.title}: 0/${q.count}` });
    } else if (st.status === 'active') {
      if (st.progress >= q.count) this._complete(s, q);
      else this.game.emit('dialogue', { lines: [q.remind.replace('{n}', String(q.count - st.progress))] });
    } else {
      // Missão concluída: o ancião volta às falas normais de worldbuilding.
      this.game.emit('dialogue', { lines: inter.lines ?? [] });
    }
  }

  _spawnObjectives(s, q, count) {
    const { game } = this;
    const st = this.states[q.id];
    const rng = makeRng(((game.seed ?? 1337) ^ hash(q.id)) >>> 0);
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      const r = s.radius + 4 + rng() * (q.radius - 8);
      const x = s.x + Math.sin(a) * r;
      const z = s.z + Math.cos(a) * r;
      if (q.kind === 'collect') {
        createLootOrb(game.world, game.renderer, { x, z, item: { questItem: q.id, rarityColor: 0x6affc8 } });
      } else if (q.kind === 'hunt') {
        const pick = weightedPick(BIOMES[s.biome].enemies, rng);
        const id = game.spawnEnemyByKey(pick.key, x, z);
        if (id) st.targets.push(id);
      } else if (q.kind === 'elite') {
        const id = game.spawnEnemyByKey('husk', x, z);
        if (id) {
          promoteToElite(game, id, 'petreo');
          st.targets.push(id);
        }
      }
    }
  }

  _onKill(e) {
    for (const [qid, st] of Object.entries(this.states)) {
      if (st.status !== 'active' || !st.targets.includes(e.id)) continue;
      st.targets = st.targets.filter((t) => t !== e.id);
      this._progress(qid);
    }
  }

  _onCollect(e) {
    const st = this.states[e.questId];
    if (st?.status === 'active') this._progress(e.questId);
  }

  _progress(qid) {
    const { q } = this._questById(qid)!;
    const st = this.states[qid];
    st.progress = Math.min(q.count, st.progress + 1);
    if (st.progress >= q.count) {
      this.game.emit('objective', { text: `🗞️ ${q.title}: completo! Volte ao ancião.` });
    } else {
      this.game.emit('objective', { text: `🗞️ ${q.title}: ${st.progress}/${q.count}` });
    }
  }

  _complete(s, q) {
    const st = this.states[q.id];
    st.status = 'done';
    this.game.emit('dialogue', { lines: q.done });
    // Recompensa: artefato único temático + essência (na mochila do P1).
    this.game.giveItem(makeQuestArtifact(q));
    for (const [, pc, inv] of this.game.world.query(C.PlayerControlled, C.Inventory)) {
      if (pc.index === 0) {
        inv.essence += q.reward.essence;
        this.game.emit('essence', { amount: q.reward.essence });
        break;
      }
    }
    this.game.emit('objective', { text: `✅ ${q.title} — ${q.reward.artifactName} recebida!` });
    this.game.emit('questCompleted', { id: q.id });
  }

  // --- Persistência ---------------------------------------------------------
  serialize() {
    const out = {};
    for (const [id, st] of Object.entries(this.states)) out[id] = { status: st.status, progress: st.progress };
    return out;
  }

  /** Restaura estados; missões ativas respawnam os objetivos restantes. */
  restore(data) {
    for (const [id, st] of Object.entries(data ?? {})) {
      const local = this.states[id];
      const found = this._questById(id);
      if (!local || !found) continue;
      local.status = (st as any).status ?? 'available';
      local.progress = (st as any).progress ?? 0;
      local.targets = [];
      if (local.status === 'active' && local.progress < found.q.count) {
        this._spawnObjectives(found.s, found.q, found.q.count - local.progress);
      }
    }
  }
}

function makeQuestArtifact(q) {
  return {
    uid: -Math.abs(hash(q.id)),
    type: 'artifact',
    name: q.reward.artifactName,
    ability: q.reward.ability,
    rarity: 'unique',
    rarityColor: 0xffd56a,
    level: 1,
    enchants: [],
    power: 1.2,
  };
}

function hash(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h >>> 0;
}
