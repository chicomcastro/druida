/**
 * Fragmentos de lore colecionáveis (codex). Espalhados pelo mundo; cada um
 * é descoberto uma vez. Aprofundam o mundo do Druida sem bloquear nada.
 * Ver ADR 0020.
 */
export const LORE = [
  { id: 'l1', title: 'O Primeiro Bosque', text: 'Antes dos reinos dos homens, o Bosque pensava por si. Os Druidas eram apenas seus sonhos andando.' },
  { id: 'l2', title: 'A Seiva', text: 'Dizem que a Seiva é a memória da floresta. Quem a empresta, devolve em forma de tempestade ou de presa.' },
  { id: 'l3', title: 'Formas Ancestrais', text: 'Urso para resistir, Lobo para caçar, Corvo para ver longe, Sapo para escutar a água. O Druida é todos e nenhum.' },
  { id: 'l4', title: 'O Apodrecedor', text: 'Ele quis deter a morte da floresta. Trancou o ciclo — e o que não morre, apodrece. Assim nasceu a Corrupção.' },
  { id: 'l5', title: 'A Carniça', text: 'Onde uma árvore ancestral é corrompida, ergue-se uma Carniça: raízes que estrangulam, casca que sangra seiva negra.' },
  { id: 'l6', title: 'Santuários', text: 'Os santuários guardam as Formas para que nenhum Druida caído as leve todas. A Guardiã escolheu bem.' },
  { id: 'l7', title: 'O Coração', text: 'No centro da podridão pulsa um coração que já foi semente. Silenciá-lo é deixar a floresta morrer — e renascer.' },
  { id: 'l8', title: 'Vagalumes', text: 'Quando a noite cai limpa, os vagalumes voltam. É como o Bosque agradece a quem o purifica.' },
  { id: 'l9', title: 'O Círculo do Carvalho', text: 'A vila dos druidas cresceu em anel ao redor da Carvalho-Mãe, como cresce a própria árvore. Nenhuma casa tem fundação: as raízes as seguram.' },
  { id: 'l10', title: 'O Vau das Palafitas', text: 'Os coletores do vau dizem que casa boa não toca o chão do pântano. A água escura leva embora o que apodrece — desde que você não pare de se mover.' },
  { id: 'l11', title: 'Cinzafolha', text: 'Os lenhadores queimam a madeira doente antes que ela caminhe. A cinza que cobre a vila é o preço de continuar viva.' },
  { id: 'l12', title: 'O Abrigo do Degelo', text: 'Cada cairn dos montanheses marca um passo da trilha antiga até o Coração. Empilhar pedras é a forma deles de rezar.' },
  // Rixa das famílias da Clareira (ADR 0095): segredos revelados ao conversar.
  { id: 'l13', title: 'A Rixa do Riacho', text: 'Fenwick e Aldren partilham um riacho: a forja precisa da água, os campos também. Há três gerações discutem de quem é a nascente — e de quem é a culpa quando ela seca.' },
  { id: 'l14', title: 'O Segredo do Moinho', text: 'A verdade que ninguém diz em voz alta: foi a Corrupção que envenenou a nascente, não a forja nem o moinho. As duas famílias brigam por uma água que o Apodrecedor já havia amaldiçoado.' },
  { id: 'l15', title: 'O Nó de Duas Cordas', text: 'A anciã Maroa guarda um velho costume: quando Fenwick e Aldren se casavam, atavam duas cordas num só nó. Reatá-lo talvez valha mais que qualquer arbitragem.' },
  // Rixas das vilas 2–4 (ADR 0107): intro (fofoca) + segredo (destrava a quest).
  { id: 'l16', title: 'A Rixa da Água Escura', text: 'No Vau, os Vison dos arpões e os Caniço dos filtros brigam pela água do brejo há tantas cheias que ninguém lembra quem afundou o quê primeiro.' },
  { id: 'l17', title: 'O Que Sobe do Lodo', text: 'A verdade do Vau: não são os filtros nem os barcos. É a Corrupção subindo do Coração pelo leito do brejo que turva a água. Os dois lados guerreiam contra o mesmo inimigo, de costas um pro outro.' },
  { id: 'l18', title: 'A Rixa da Cinza', text: 'Em Cinzafolha, os Cerne que serram acusam os Brasa que queimam, e vice-versa. Cada família jura que salva o bosque do jeito certo — e que a outra o condena.' },
  { id: 'l19', title: 'A Podridão que Anda', text: 'O segredo de Cinzafolha: a podridão se espalha mais rápido que qualquer serra ou forno. Serrar e queimar não competem — só juntos alcançam a Corrupção. Brigando, os dois perdem para ela.' },
  { id: 'l20', title: 'A Rixa da Encosta', text: 'No Degelo, os Cairn da trilha e os Velo do rebanho disputam a mesma encosta: pedras sagradas de um lado, pasto do outro, e um só caminho estreito no gelo.' },
  { id: 'l21', title: 'Por Que o Rebanho Foge', text: 'A verdade do Degelo: o rebanho não derruba os cairns por capricho — foge da podridão que sobe do Coração, o mesmo degelo corrompido que afrouxa as pedras. Bicho e marco caem pela mesma causa.' },
];

/**
 * Revela um fragmento do codex (uma vez). Usado ao conversar com NPCs que
 * guardam segredos — ex.: a rixa das famílias (ADR 0095). Devolve true se
 * revelou algo novo.
 */
export function revealLore(game, id: string): boolean {
  if (!game.lore || game.lore.found.has(id)) return false;
  game.lore.found.add(id);
  const entry = LORE.find((l) => l.id === id);
  game.emit?.('loreFound', { id });
  game.emit?.('objective', { text: `📖 Códice: ${entry?.title ?? 'novo fragmento'} (${game.lore.found.size})` });
  return true;
}
