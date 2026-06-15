# ADR 0001 — Stack, perspectiva e modelo de coop

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
Jogo web inspirado em Minecraft Dungeons, mundo aberto, sobre a classe Druida.
Era preciso definir engine de render, perspectiva visual e modelo de coop antes
de escrever código.

## Decisão
- **Three.js** para render 3D no navegador (build via Vite).
- **Câmera ortográfica em ângulo isométrico** (3D real, "iso" só na câmera).
- **Coop local same-screen** (até 4 jogadores), teclado/mouse para P1 e
  gamepads para P2–P4.
- Linguagem **JavaScript (ESM)**; migração para TypeScript fica como tarefa
  futura (ver backlog M0).

Decisões confirmadas com o autor antes do início.

## Consequências
- Verticalidade leve é possível (mundo é 3D).
- Coop same-screen impõe câmera de grupo com zoom dinâmico (ver ADR 0003).
- Sem netcode no escopo atual — multiplayer online fica fora.
