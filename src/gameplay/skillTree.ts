import { ABILITIES } from './abilities/index.js';

/**
 * Árvore de SKILLS ATIVAS (E17). Redesenho da progressão: em vez de só passivas
 * (`skills.ts`, ADR 0093), cada nó da árvore **libera uma habilidade ativa** —
 * uma magia/golpe que o jogador conjura e depois atribui à hotbar (1–9).
 *
 * Esta é a fundação data-driven (E17.1): define os ramos, os nós (cada um
 * apontando para uma habilidade em `ABILITIES`) e a lógica de desbloqueio. A UI
 * da árvore, a hotbar e os VFX por ramo vêm nas fatias seguintes. Não remove a
 * árvore passiva ainda — é aditivo, para não quebrar o combate atual.
 *
 * Cada ramo é temático (elemento/forma), casando com "novas animações e efeitos
 * visuais para cada ramo da árvore" (pedido do playtest). Um nó só libera se há
 * ponto de skill e o pré-requisito (`req`) já foi desbloqueado.
 */

export type SkillBranch = 'natureza' | 'chama' | 'gelo' | 'tempestade' | 'feras' | 'vida';

export interface ActiveSkillNode {
  id: string;
  /** Habilidade liberada — precisa existir em ABILITIES. */
  ability: string;
  name: string;
  desc: string;
  /** Custo em pontos de skill. */
  cost: number;
  /** Nó pré-requisito no mesmo ramo (precisa estar desbloqueado). */
  req?: string;
}

/** Ramos da árvore (E17). A ordem dentro do ramo é a de progressão. */
export const ACTIVE_SKILL_TREE: Record<SkillBranch, ActiveSkillNode[]> = {
  natureza: [
    { id: 'nat_root', ability: 'root_spikes', name: 'Espinhos de Raiz', desc: 'Raízes irrompem em área, prendendo os inimigos.', cost: 1 },
    { id: 'nat_thorn', ability: 'thorn_burst', name: 'Explosão de Espinhos', desc: 'Onda de espinhos que arremessa quem está perto.', cost: 1, req: 'nat_root' },
    { id: 'nat_meteor', ability: 'meteor_sap', name: 'Meteoro de Seiva', desc: 'Chama uma bola de seiva que cai e explode em fogo.', cost: 2, req: 'nat_thorn' },
  ],
  chama: [
    { id: 'fir_wild', ability: 'wildfire', name: 'Chama Selvagem', desc: 'Dispara fogo que queima ao longo do tempo.', cost: 1 },
  ],
  gelo: [
    { id: 'ice_lance', ability: 'ice_lance', name: 'Lança de Gelo', desc: 'Projétil perfurante que congela.', cost: 1 },
  ],
  tempestade: [
    { id: 'sto_gust', ability: 'gust', name: 'Rajada', desc: 'Cone de vento que empurra os inimigos para longe.', cost: 1 },
  ],
  feras: [
    { id: 'bea_howl', ability: 'pack_howl', name: 'Chamado da Matilha', desc: 'Convoca lobos espectrais que lutam ao seu lado.', cost: 2 },
  ],
  vida: [
    { id: 'lif_totem', ability: 'healing_totem', name: 'Totem Curativo', desc: 'Finca um totem que cura os aliados por perto.', cost: 1 },
  ],
};

/** Índice nó→ramo e id→nó (montado uma vez). */
const NODE_INDEX: Record<string, ActiveSkillNode> = {};
const NODE_BRANCH: Record<string, SkillBranch> = {};
for (const branch of Object.keys(ACTIVE_SKILL_TREE) as SkillBranch[]) {
  for (const node of ACTIVE_SKILL_TREE[branch]) {
    NODE_INDEX[node.id] = node;
    NODE_BRANCH[node.id] = branch;
  }
}

/** Todo nó aponta para uma habilidade existente (guarda de sanidade/teste). */
export function skillTreeIsValid(): boolean {
  return Object.values(NODE_INDEX).every((n) => !!ABILITIES[n.ability]);
}

export function skillNode(nodeId: string): ActiveSkillNode | undefined {
  return NODE_INDEX[nodeId];
}
export function skillBranchOf(nodeId: string): SkillBranch | undefined {
  return NODE_BRANCH[nodeId];
}

/** Garante o estado de skills ativas no progresso (save antigo não tinha). */
export function ensureActiveSkills(game) {
  const p = game.progress;
  p.activeSkills = p.activeSkills ?? {}; // nodeId -> true (desbloqueado)
  p.skillPoints = p.skillPoints ?? 0;    // pool compartilhado com a árvore passiva
  return p;
}

export function isUnlocked(game, nodeId: string): boolean {
  ensureActiveSkills(game);
  return !!game.progress.activeSkills[nodeId];
}

/** Pode desbloquear? (existe, ainda não tem, tem ponto e o req está aberto). */
export function canUnlock(game, nodeId: string): boolean {
  ensureActiveSkills(game);
  const node = NODE_INDEX[nodeId];
  if (!node) return false;
  if (game.progress.activeSkills[nodeId]) return false;
  if (game.progress.skillPoints < node.cost) return false;
  if (node.req && !game.progress.activeSkills[node.req]) return false;
  return true;
}

export function unlock(game, nodeId: string): boolean {
  if (!canUnlock(game, nodeId)) return false;
  const node = NODE_INDEX[nodeId];
  game.progress.activeSkills[nodeId] = true;
  game.progress.skillPoints -= node.cost;
  game.emit?.('activeSkillUnlocked', { nodeId, ability: node.ability });
  return true;
}

/** IDs das habilidades já desbloqueadas — o que a hotbar pode atribuir. */
export function unlockedAbilities(game): string[] {
  ensureActiveSkills(game);
  const out: string[] = [];
  for (const nodeId of Object.keys(game.progress.activeSkills)) {
    const node = NODE_INDEX[nodeId];
    if (node && game.progress.activeSkills[nodeId]) out.push(node.ability);
  }
  return out;
}

/** Devolve os pontos gastos em skills ativas (respec, grátis na Guardiã). */
export function respecActive(game): number {
  ensureActiveSkills(game);
  let refunded = 0;
  for (const nodeId of Object.keys(game.progress.activeSkills)) {
    if (game.progress.activeSkills[nodeId]) refunded += NODE_INDEX[nodeId]?.cost ?? 0;
  }
  game.progress.skillPoints += refunded;
  game.progress.activeSkills = {};
  game.emit?.('activeSkillRespec', { refunded });
  return refunded;
}
