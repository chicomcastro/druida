import { describe, it, expect } from 'vitest';
import { buildVoxelModel, MODEL_SPECS } from '../src/entities/voxelModels.js';
import { animateBody } from '../src/systems/animation.js';

/**
 * Chefes com modelos e animações NÃO-humanoides (E39). Os três chefes de bioma
 * deixam de ser bípedes com braços/pernas e ganham silhueta e andadura próprias:
 * Senhor do Lodo (massa que se ondula), Ceifador Gélido (espectro que paira com
 * cacos orbitando) e O Apodrecedor (horror arraigado sobre raízes que se contorcem).
 */
describe('Chefes não-humanoides (E39)', () => {
  const bosses: Record<string, string> = { mirelord: 'ooze', frostreaver: 'floating', rotlord: 'rooted' };

  it('cada chefe usa uma andadura não-humanoide e não tem pernas', () => {
    for (const [k, gait] of Object.entries(bosses)) {
      const spec = MODEL_SPECS[k];
      expect(spec.gait).toBe(gait);
      const names = spec.parts.map((p) => p.name);
      expect(names).not.toContain('legL');
      expect(names).not.toContain('legR');
    }
  });

  it('cada chefe tem as partes-assinatura da sua forma', () => {
    expect(MODEL_SPECS.mirelord.parts.map((p) => p.name)).toEqual(
      expect.arrayContaining(['base', 'core', 'armL', 'armR']));
    expect(MODEL_SPECS.frostreaver.parts.map((p) => p.name)).toEqual(
      expect.arrayContaining(['wisp', 'shardL', 'shardR', 'shardT', 'core']));
    expect(MODEL_SPECS.rotlord.parts.map((p) => p.name)).toEqual(
      expect.arrayContaining(['root1', 'root2', 'root3', 'root4', 'core']));
  });

  it('o animador dá vida a cada andadura (pulso/órbita/contorção) sem erro', () => {
    for (const k of Object.keys(bosses)) {
      const body: any = buildVoxelModel(k);
      const parts = body.userData.parts;
      animateBody(body, 0.2, { moving: true, speed: 2, attack: 0, gait: body.userData.gait });
      animateBody(body, 0.2, { moving: true, speed: 2, attack: 0, gait: body.userData.gait });
      expect(parts.core.scale.x).not.toBe(1); // núcleo pulsa em todas as formas
    }

    // Ceifador Gélido: paira acima do chão (altura constante mesmo parado).
    const fr: any = buildVoxelModel('frostreaver');
    animateBody(fr, 0.2, { moving: false, speed: 0, attack: 0, gait: 'floating' });
    expect(fr.position.y).toBeGreaterThan(0.25);
    expect(fr.userData.parts.shardL.rotation.y).not.toBe(0); // cacos orbitam

    // O Apodrecedor: as raízes se contorcem (não há passada de pernas).
    const rl: any = buildVoxelModel('rotlord');
    animateBody(rl, 0.3, { moving: false, speed: 0, attack: 0, gait: 'rooted' });
    expect(Math.abs(rl.userData.parts.root1.rotation.x)).toBeGreaterThan(0);

    // Ataque: os tentáculos-clava do Senhor do Lodo golpeiam à frente.
    const ml: any = buildVoxelModel('mirelord');
    animateBody(ml, 0.05, { moving: false, speed: 0, attack: 1, gait: 'ooze' });
    expect(ml.userData.parts.armR.rotation.x).toBeLessThan(0);
  });
});
