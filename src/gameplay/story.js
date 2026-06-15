import { C } from '../core/ecs/components.js';
import { dist } from '../utils/math.js';
import { FORM_ORDER } from './forms.js';

/**
 * Campanha do Druida: uma sequência de passos (quests) que guia o jogador
 * pelas regiões radiais, desbloqueando Formas Ancestrais em santuários e
 * culminando no confronto com O Apodrecedor. Ver docs/adr/0010.
 *
 * É event-driven: escuta `kill` e proximidade do grupo para avançar. Os
 * santuários e o NPC do hub são entidades Interactable criadas pelo mundo.
 */

// Posições-chave no eixo -Z, cada uma dentro do anel do bioma correspondente.
export const LANDMARKS = {
  npc: { x: 0, z: -14 },
  sanctuary_bear: { x: 0, z: -82, form: 'bear', biome: 'Pântano' },
  miniboss: { x: 26, z: -74 },
  sanctuary_raven: { x: 0, z: -138, form: 'raven', biome: 'Bosque Cinza' },
  sanctuary_frog: { x: 0, z: -192, form: 'frog', biome: 'Picos Gélidos' },
  boss: { x: 0, z: -245 },
};

const STEPS = [
  { id: 'talk', objective: 'Fale com a Guardiã do Carvalho-Mãe (E)' },
  { id: 'purify_clearing', objective: 'Purifique a Clareira: derrote 8 criaturas corrompidas', kills: 8 },
  { id: 'find_bear', objective: 'Vá ao Pântano e desperte o Santuário do Urso' },
  { id: 'slay_miniboss', objective: 'Derrote a Árvore-Carniça no Pântano' },
  { id: 'find_raven', objective: 'Encontre o Santuário do Corvo no Bosque Cinza' },
  { id: 'find_frog', objective: 'Encontre o Santuário do Sapo nos Picos Gélidos' },
  { id: 'confront', objective: 'Vá ao Coração Corrompido e enfrente O Apodrecedor' },
  { id: 'victory', objective: 'A floresta respira de novo. Você venceu!' },
];

export const NPC_LINES = [
  'Guardiã: Você acordou, último dos Druidas… ainda bem.',
  'Guardiã: A podridão se espalha dos anéis externos. O Apodrecedor já foi um de nós.',
  'Guardiã: Recupere as Formas Ancestrais nos santuários e purifique cada região.',
  'Guardiã: Comece limpando esta Clareira. A natureza lembra de você.',
];

export class StoryManager {
  constructor(game) {
    this.game = game;
    this.step = 0;
    this.kills = 0;
    this._spawned = {};
    game.on('kill', (e) => this.onKill(e));
  }

  current() { return STEPS[this.step]; }
  objective() { return this.current().objective; }

  advance() {
    this.step = Math.min(STEPS.length - 1, this.step + 1);
    this.game.emit('storyStep', { step: this.step, id: this.current().id });
    this.game.emit('objective', { text: this.objective() });
  }

  onKill(e) {
    const id = this.current().id;
    const boss = e.bossName;
    if (id === 'purify_clearing') {
      // Não conta o NPC/chefes; conta inimigos comuns.
      if (!boss) {
        this.kills++;
        if (this.kills >= this.current().kills) this.advance();
      }
    } else if (id === 'slay_miniboss' && boss === 'Árvore-Carniça') {
      this.advance();
    } else if (id === 'confront' && boss === 'O Apodrecedor') {
      this.advance(); // -> victory
      this.game.emit('victory', {});
    }
  }

  /** Chamado pela interação com um santuário/NPC. */
  onInteract(interactable, playerId) {
    if (interactable.kind === 'npc' && this.current().id === 'talk') {
      this.game.emit('dialogue', { lines: NPC_LINES });
      this.advance();
      interactable.used = true;
      return;
    }
    if (interactable.kind === 'sanctuary' && interactable.form) {
      const ok = this._sanctuaryStepFor(interactable.form) === this.current().id;
      if (!ok) {
        this.game.emit('dialogue', { lines: ['O santuário permanece adormecido… ainda não é a hora.'] });
        return;
      }
      this.unlockForm(interactable.form);
      this.game.emit('dialogue', { lines: [`Forma Ancestral despertada: ${formName(interactable.form)}!`] });
      this.advance();
      interactable.used = true;
    }
  }

  _sanctuaryStepFor(form) {
    return { bear: 'find_bear', raven: 'find_raven', frog: 'find_frog' }[form];
  }

  unlockForm(form) {
    for (const [, f] of this.game.world.query(C.Form)) {
      if (!f.list.includes(form)) {
        // mantém a ordem canônica das formas
        f.list = FORM_ORDER.filter((k) => f.list.includes(k) || k === form);
      }
    }
    this.game.emit('formUnlocked', { form });
  }

  /** Spawns por proximidade (mini-chefe e chefe) quando o passo permite. */
  update() {
    const c = this.game.groupCenter ?? { x: 0, z: 0 };
    const id = this.current().id;
    if (id === 'slay_miniboss' && !this._spawned.miniboss) {
      if (dist(c.x, c.z, LANDMARKS.miniboss.x, LANDMARKS.miniboss.z) < 28) {
        this._spawned.miniboss = true;
        this.game.spawnMiniBoss(LANDMARKS.miniboss.x, LANDMARKS.miniboss.z);
        this.game.emit('objective', { text: 'A Árvore-Carniça desperta!' });
      }
    }
    if (id === 'confront' && !this._spawned.boss) {
      if (dist(c.x, c.z, LANDMARKS.boss.x, LANDMARKS.boss.z) < 30) {
        this._spawned.boss = true;
        this.game.spawnBossFight(LANDMARKS.boss.x, LANDMARKS.boss.z);
      }
    }
  }
}

function formName(form) {
  return { bear: 'Urso', raven: 'Corvo', frog: 'Sapo' }[form] ?? form;
}
