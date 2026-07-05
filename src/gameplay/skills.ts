import { C } from '../core/ecs/components.js';
import type { WeaponFamily } from '../types.js';

/**
 * Especialização & árvore de talentos (ADR 0093). Duas fontes de progressão
 * além do nível:
 *  - **Proficiência por uso**: cada golpe com uma família de arma
 *    (machado/foice/garras/cajado) e cada uso de forma animal acumula pontos
 *    naquela trilha — quanto mais usa, mais especializa.
 *  - **Pontos de talento**: 1 por nível; gastos em nós das árvores por trilha,
 *    abrindo passivas que mudam o gameplay. Respec na Guardiã (grátis).
 * Tudo em `game.progress` (party) para persistir no save.
 */

export type SkillTrack = WeaponFamily | 'wolf' | 'bear' | 'raven' | 'frog';

export interface SkillNode {
  id: string;
  name: string;
  desc: string;
  max: number;
  /** efeito agregado: chave lida pelos sistemas (ver skillBonus). */
  effect: 'dmg' | 'atkSpeed' | 'combo' | 'range' | 'formDur' | 'dr';
  per: number; // valor por nível
  req?: string; // nó pré-requisito (nível >= 1)
}

/** Árvores por trilha (3 nós cada, escaláveis). */
export const SKILL_TREES: Record<SkillTrack, SkillNode[]> = {
  axe: [
    { id: 'axe_power', name: 'Fúria do Lenho', desc: '+{v}% de dano', max: 3, effect: 'dmg', per: 6 },
    { id: 'axe_reach', name: 'Braço Largo', desc: '+{v}% de alcance', max: 2, effect: 'range', per: 8, req: 'axe_power' },
    { id: 'axe_crush', name: 'Esmagar', desc: '+{v}% de dano', max: 3, effect: 'dmg', per: 5, req: 'axe_reach' },
  ],
  scythe: [
    { id: 'scythe_sweep', name: 'Ceifa Ampla', desc: '+{v}% de alcance', max: 3, effect: 'range', per: 6 },
    { id: 'scythe_flow', name: 'Fluxo', desc: 'Janela de combo +{v}%', max: 2, effect: 'combo', per: 8, req: 'scythe_sweep' },
    { id: 'scythe_reap', name: 'Colheita', desc: '+{v}% de dano', max: 3, effect: 'dmg', per: 5, req: 'scythe_flow' },
  ],
  claws: [
    { id: 'claws_speed', name: 'Frenesi', desc: '+{v}% de velocidade de ataque', max: 3, effect: 'atkSpeed', per: 6 },
    { id: 'claws_combo', name: 'Ritmo Felino', desc: 'Janela de combo +{v}%', max: 3, effect: 'combo', per: 6, req: 'claws_speed' },
    { id: 'claws_rend', name: 'Dilacerar', desc: '+{v}% de dano', max: 3, effect: 'dmg', per: 5, req: 'claws_combo' },
  ],
  staff: [
    { id: 'staff_power', name: 'Canalizar', desc: '+{v}% de dano', max: 3, effect: 'dmg', per: 6 },
    { id: 'staff_cdr', name: 'Fluir da Seiva', desc: '+{v}% de velocidade de ataque', max: 2, effect: 'atkSpeed', per: 8, req: 'staff_power' },
    { id: 'staff_surge', name: 'Torrente', desc: '+{v}% de alcance', max: 3, effect: 'range', per: 6, req: 'staff_cdr' },
  ],
  wolf: [
    { id: 'wolf_dur', name: 'Resistência da Matilha', desc: '+{v}% de duração de forma', max: 3, effect: 'formDur', per: 10 },
    { id: 'wolf_dmg', name: 'Presas', desc: '+{v}% de dano de forma', max: 3, effect: 'dmg', per: 6, req: 'wolf_dur' },
  ],
  bear: [
    { id: 'bear_tough', name: 'Couro Grosso', desc: '+{v}% de redução de dano', max: 3, effect: 'dr', per: 4 },
    { id: 'bear_dmg', name: 'Patada', desc: '+{v}% de dano de forma', max: 3, effect: 'dmg', per: 6, req: 'bear_tough' },
  ],
  raven: [
    { id: 'raven_dur', name: 'Voo Longo', desc: '+{v}% de duração de forma', max: 3, effect: 'formDur', per: 10 },
    { id: 'raven_dmg', name: 'Bico Afiado', desc: '+{v}% de dano de forma', max: 3, effect: 'dmg', per: 6, req: 'raven_dur' },
  ],
  frog: [
    { id: 'frog_dur', name: 'Fôlego', desc: '+{v}% de duração de forma', max: 3, effect: 'formDur', per: 10 },
    { id: 'frog_dmg', name: 'Língua', desc: '+{v}% de dano de forma', max: 3, effect: 'dmg', per: 6, req: 'frog_dur' },
  ],
};

const ALL_NODES: Record<string, SkillNode> = {};
for (const nodes of Object.values(SKILL_TREES)) for (const n of nodes) ALL_NODES[n.id] = n;

/** Garante os campos de progressão (save antigo não os tinha). */
export function ensureSkillState(game) {
  const p = game.progress;
  p.proficiency = p.proficiency ?? {};
  p.skills = p.skills ?? {};
  p.skillPoints = p.skillPoints ?? 0;
}

/** Acumula proficiência numa trilha (uso de arma/forma). */
export function gainProficiency(game, track: SkillTrack, amount = 1) {
  ensureSkillState(game);
  game.progress.proficiency[track] = (game.progress.proficiency[track] ?? 0) + amount;
}

/** Pode investir no nó? (pontos, teto e pré-requisito). */
export function canLearn(game, nodeId: string): boolean {
  ensureSkillState(game);
  const node = ALL_NODES[nodeId];
  if (!node) return false;
  const lv = game.progress.skills[nodeId] ?? 0;
  if (lv >= node.max || game.progress.skillPoints <= 0) return false;
  if (node.req && (game.progress.skills[node.req] ?? 0) < 1) return false;
  return true;
}

export function learn(game, nodeId: string): boolean {
  if (!canLearn(game, nodeId)) return false;
  game.progress.skills[nodeId] = (game.progress.skills[nodeId] ?? 0) + 1;
  game.progress.skillPoints--;
  game.emit?.('skillLearned', { nodeId });
  return true;
}

/** Devolve todos os pontos gastos (respec grátis na Guardiã). */
export function respec(game): number {
  ensureSkillState(game);
  let refunded = 0;
  for (const lv of Object.values(game.progress.skills)) refunded += lv as number;
  game.progress.skillPoints += refunded;
  game.progress.skills = {};
  game.emit?.('skillRespec', { refunded });
  return refunded;
}

/**
 * Soma os efeitos de um tipo, considerando só as trilhas RELEVANTES ao estado
 * atual (arma equipada e forma). Ex.: bônus de 'dmg' do machado só vale
 * empunhando machado; de forma, só na forma correspondente.
 */
export function skillBonus(game, id, effect: SkillNode['effect']): number {
  ensureSkillState(game);
  const skills = game.progress.skills;
  const eq = game.world.get(id, C.Equipment);
  const form = game.world.get(id, C.Form);
  const active = new Set<SkillTrack>();
  const fam = eq?.weapon?.family as WeaponFamily | undefined;
  if (fam) active.add(fam);
  if (form && form.current !== 'humanoid') active.add(form.current as SkillTrack);
  let total = 0;
  for (const track of active) {
    for (const node of SKILL_TREES[track] ?? []) {
      if (node.effect !== effect) continue;
      const lv = skills[node.id] ?? 0;
      if (lv > 0) total += node.per * lv;
    }
  }
  return total; // em % (ou pontos, conforme o efeito)
}

export function nodeText(node: SkillNode, level: number): string {
  return node.desc.replace('{v}', String(node.per * Math.max(1, level || 1)));
}
