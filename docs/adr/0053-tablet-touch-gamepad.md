# ADR 0053 — Tablet: controles touch + gamepad dedicado no P1

**Status:** Aceito · **Data:** 2026-07-03

## Contexto
O jogo era injogável em tablet/mobile: sem controles de toque e com o P1
preso ao teclado. Pior: qualquer botão de um gamepad conectado criava um P2 —
impossível jogar solo com controle dedicado.

## Decisão
- **`ui/TouchControls.ts`** (criado só em dispositivo com toque): joystick
  virtual de **origem dinâmica** na metade esquerda (o toque define o centro;
  Pointer Events com captura) + botões à direita — atacar (segurável),
  esquiva, interagir, 3 artefatos, ciclar forma, pausa e mapa. Publica um
  snapshot que o `InputManager` **mescla** ao teclado do P1; pulsos ("just
  pressed") são limpos no `endFrame`.
- **Gamepad livre dirige o P1**: `getPlayerInput(0)` mescla teclado + touch +
  o primeiro gamepad não reservado por P2+. **Entrar no coop passa a ser
  START (botão 9)** — com qualquer-botão, o primeiro ataque do controle
  dedicado criava um P2 fantasma.
- **Higiene de toque**: viewport sem pinch-zoom (`user-scalable=no`,
  `viewport-fit=cover`), `touch-action:none` no canvas, e o clique-ataque só
  vale quando o alvo é o canvas (toques na UI não viram golpe).

## Consequências
- Tablet joga com toque puro, com controle dedicado, ou os dois; desktop
  ganha suporte a gamepad no P1 de graça.
- Mudança de contrato no coop: entrar agora é START (o onboarding/hints devem
  dizer isso). Fica lidável ter teclado + pad no mesmo P1 (fontes mescladas).
- O layout dos botões é fixo (destros); espelhamento/escala ficam como
  evolução se o playtest pedir.
