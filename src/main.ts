/**
 * Druida — bootstrap.
 * Cria o Game e mostra o menu principal. "Novo jogo" começa do zero;
 * "Continuar" carrega o save do localStorage. O loop só inicia após a escolha.
 * Jogadores 2–4 entram apertando um botão no gamepad (coop same-screen).
 */
import { Game } from './core/Game.js';
import { apply, loadFromStorage } from './gameplay/save.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

function begin(loadSave) {
  game.spawnInitialPlayers();
  if (loadSave) {
    const data = loadFromStorage();
    if (data) apply(game, data);
  }
  game.emit('objective', { text: game.story.objective() });
  game.emit('biomeChanged', { biome: 'clareira', def: { name: game.currentBiomeName() } });
  game.start();
}

game.menus.showMain(
  () => begin(false),
  () => begin(true),
);

// Exposto para depuração no console.
(window as any).DRUIDA = game;
