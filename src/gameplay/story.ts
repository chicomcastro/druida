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

// Marcos da campanha dentro das regiões orgânicas de cada bioma (ADR 0110), mas
// cada santuário fica AFASTADO da sua vila e numa direção distinta (ADR 0118):
// buscá-lo é uma jornada à parte — o jogador escolhe entre ir à cidade ou ao
// santuário, em vez de encontrar os dois no mesmo lugar. Coords validadas por
// distância à cidade e margem de interior do bioma (scan em scripts).
export const LANDMARKS = {
  npc: { x: 0, z: -14 },
  sanctuary_wolf: { x: -40, z: -69, form: 'wolf', biome: 'Clareira Viva' },   // NO da Clareira, longe do hub
  sanctuary_bear: { x: 177, z: -33, form: 'bear', biome: 'Pântano' },         // fundo NE do Pântano
  miniboss: { x: 78, z: -52 },                                              // Pântano (perto da vila)
  sanctuary_raven: { x: -210, z: -49, form: 'raven', biome: 'Bosque Cinza' }, // N do Bosque, longe de Cinzafolha
  sanctuary_frog: { x: 66, z: 247, form: 'frog', biome: 'Picos Gélidos' },     // sul dos Picos, longe do Degelo
  boss: { x: 0, z: -245 },                                                  // mancha do Coração
};

const STEPS = [
  {
    id: 'talk', objective: 'Fale com a Guardiã do Carvalho-Mãe',
    desc: 'Você acordou depois de muito tempo. A Guardiã espera ao pé da árvore-mãe, no centro da vila — ela sabe por que a floresta está apodrecendo.',
  },
  {
    id: 'purify_clearing', objective: 'Purifique a Clareira: devolva 8 criaturas corrompidas à terra', kills: 8,
    desc: 'A podridão já chegou à Clareira. Abata as criaturas corrompidas ao redor da vila para reacender a Seiva e provar que ainda é um Druida.',
  },
  {
    id: 'find_wolf', objective: 'Ache o Santuário do Lobo, escondido na Clareira',
    desc: 'A primeira Forma Ancestral dorme num santuário na Clareira, mas longe da vila — a noroeste, mata adentro. Siga até ele, desperte o Lobo (a caça e a velocidade) e aprenda a receber um Dom.',
  },
  {
    id: 'find_bear', objective: 'Vá ao Pântano e desperte o Santuário do Urso',
    desc: 'No Pântano Apodrecido resiste o Vau das Palafitas — mas o Santuário do Urso fica bem adentro do brejo, longe da vila: buscá-lo é uma jornada à parte. Ele concede a resistência que os combates adiante vão exigir.',
  },
  {
    id: 'slay_miniboss', objective: 'Derrote a Árvore-Carniça no Pântano',
    desc: 'Uma árvore ancestral virou Carniça: raízes que estrangulam, casca que sangra seiva negra. Derrube-a antes que engula o vau.',
  },
  {
    id: 'find_raven', objective: 'Encontre o Santuário do Corvo no Bosque Cinza',
    desc: 'Em Cinzafolha, os lenhadores queimam o que caminha. O Santuário do Corvo, porém, fica longe da vila, fundo no bosque morto — outra jornada. Entre as árvores mortas, ele dá olhos para ver o que a fumaça esconde.',
  },
  {
    id: 'find_frog', objective: 'Encontre o Santuário do Sapo nos Picos Gélidos',
    desc: 'O Abrigo do Degelo guarda a trilha antiga, mas o Santuário do Sapo dorme longe dali, mais fundo nos Picos. Preso no gelo, ele escuta a água — até a que dorme congelada — e abre o caminho ao Coração.',
  },
  {
    id: 'confront', objective: 'Vá ao Coração Corrompido e enfrente O Apodrecedor',
    desc: 'No centro da podridão pulsa um coração que já foi semente. Lá está O Apodrecedor — um Druida que quis trancar a morte. Silencie-o para a floresta renascer.',
  },
  {
    id: 'victory', objective: 'A floresta respira de novo. Você venceu!',
    desc: 'O Coração voltou a ser semente. A Corrupção recua e o verde retorna — o mundo continua aberto para você explorar.',
  },
];

export const NPC_LINES = [
  'Guardiã: Você acordou, último dos Druidas… ainda bem.',
  'Guardiã: A podridão se espalha do Coração para fora. O Apodrecedor já foi um de nós.',
  'Guardiã: Nossa vila, o Círculo do Carvalho, é o último chão limpo. Outros povos resistem lá fora.',
  'Guardiã: Procure-os: o Vau das Palafitas no Pântano, Cinzafolha no Bosque, o Abrigo do Degelo nos Picos.',
  'Guardiã: Recupere as Formas Ancestrais nos santuários e purifique cada região.',
  'Guardiã: A primeira dorme aqui mesmo, na Clareira: o Santuário do Lobo. Limpe a mata e ele responderá.',
];

export class StoryManager {
  game: any;
  step: number;
  kills: number;
  _spawned: Record<string, boolean>;

  constructor(game) {
    this.game = game;
    this.step = 0;
    this.kills = 0;
    this._spawned = {};
    game.on('kill', (e) => this.onKill(e));
  }

  current() { return STEPS[this.step]; }
  objective() { return this.current().objective; }
  /** Descrição/contexto do passo atual (ADR 0114) — para o diário/HUD. */
  description() { return this.current().desc ?? ''; }

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
    return { wolf: 'find_wolf', bear: 'find_bear', raven: 'find_raven', frog: 'find_frog' }[form];
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
  return { wolf: 'Lobo', bear: 'Urso', raven: 'Corvo', frog: 'Sapo' }[form] ?? form;
}
