import { C } from '../core/ecs/components.js';
import { FORMS } from '../gameplay/forms.js';
import { buildMesh } from '../entities/meshes.js';

/**
 * Sincroniza Transform -> Object3D do Three.js. Roda no render (não na
 * simulação) para suavidade. Também troca o mesh do corpo ao mudar de forma,
 * aplica o flash de dano e a flutuação do loot.
 */
export function renderSyncSystem(game, alpha) {
  const { world } = game;
  const t = performance.now() / 1000;

  for (const [id, tr, r] of world.query(C.Transform, C.Renderable)) {
    const obj = r.object3d;
    const y = r.yOffset ?? 0;
    obj.position.set(tr.x, y + (r.bob ? Math.sin(t * 3 + id) * 0.12 + 0.12 : 0), tr.z);
    if (tr.rot !== undefined) obj.rotation.y = tr.rot;

    // Troca de corpo ao mudar de forma.
    const form = world.get(id, C.Form);
    if (form) {
      const kind = FORMS[form.current].mesh;
      if (kind !== r.kind) {
        obj.remove(r.body);
        r.body = buildMesh(kind);
        obj.add(r.body);
        r.kind = kind;
      }
      if (form.swapFlash > 0) {
        const s = 1 + form.swapFlash * 0.6;
        r.body.scale.setScalar(s);
      } else {
        r.body.scale.setScalar(1);
      }
    }

    // Flash de dano (tinge brevemente de branco/vermelho).
    const tint = world.get(id, C.Tint);
    if (tint && tint.flash > 0) {
      applyEmissive(obj, 0xff3030, Math.min(1, tint.flash * 6));
      tint.flash -= 1 / 60;
    } else if (tint && tint.flash <= 0 && tint._wasLit) {
      applyEmissive(obj, 0x000000, 0);
      tint._wasLit = false;
    }
    if (tint && tint.flash > 0) tint._wasLit = true;

    // Jogador caído deita e fica translúcido.
    const pc = world.get(id, C.PlayerControlled);
    if (pc) {
      obj.rotation.z = pc.downed ? Math.PI / 2.2 : 0;
    }
  }
}

function applyEmissive(obj, color, intensity) {
  obj.traverse((o) => {
    if (o.isMesh && o.material && o.material.emissive) {
      o.material.emissive.setHex(color);
      o.material.emissiveIntensity = intensity;
    }
  });
}
