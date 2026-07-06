import { describe, it, expect } from 'vitest';
import { CAST_SIGNATURE } from '../src/systems/vfx.js';
import { ACTIVE_SKILL_TREE, abilityBranch } from '../src/gameplay/skillTree.js';

/**
 * Assinatura de conjuração por ramo (ADR 0130, E17.4): todo ramo da árvore de
 * skills ativas precisa ter uma assinatura visual, e toda habilidade liberável
 * precisa resolver para um ramo com assinatura — senão a magia conjura "muda".
 */
describe('assinatura de conjuração por ramo (ADR 0130)', () => {
  const MODES = new Set(['bloom', 'jet', 'implode', 'nova', 'stomp', 'motes']);

  it('todo ramo da árvore tem assinatura com cor e modo válidos', () => {
    for (const branch of Object.keys(ACTIVE_SKILL_TREE)) {
      const sig = CAST_SIGNATURE[branch];
      expect(sig, `ramo sem assinatura: ${branch}`).toBeTruthy();
      expect(typeof sig.color).toBe('number');
      expect(MODES.has(sig.mode), `modo inválido em ${branch}: ${sig.mode}`).toBe(true);
    }
  });

  it('toda habilidade da árvore resolve para um ramo com assinatura', () => {
    for (const nodes of Object.values(ACTIVE_SKILL_TREE)) {
      for (const node of nodes) {
        const branch = abilityBranch(node.ability);
        expect(branch, `habilidade sem ramo: ${node.ability}`).toBeTruthy();
        expect(CAST_SIGNATURE[branch!]).toBeTruthy();
      }
    }
  });
});
