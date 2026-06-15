/**
 * Druida — bootstrap.
 * Cria o Game (ECS + render iso + sistemas), spawna o jogador 1 e inicia o
 * loop. Jogadores 2–4 entram apertando um botão no gamepad (coop same-screen).
 */
import { Game } from './core/Game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);
game.spawnInitialPlayers();
game.start();

// Pausa simples com Esc/P.
addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') game.paused = !game.paused;
});

// Exposto para depuração no console.
window.DRUIDA = game;
