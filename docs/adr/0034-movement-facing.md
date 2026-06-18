# ADR 0034 — Orientação pela direção do movimento (sem mira por cursor)

**Status:** Aceito · **Data:** 2026-06-18 · **Refina:** ADR 0023

## Contexto
O controle do P1 mirava pela posição do mouse (`aimIsWorldPoint`): o personagem
encarava o cursor e atacava naquela direção. O desejo de design passou a ser um
combate mais corpo-a-corpo e tátil, em que **o personagem olha para onde se
move** — sem depender do cursor.

## Decisão
- O `InputManager` deixa de emitir mira por cursor (teclado) e por stick direito
  (gamepad): `hasAim = false`, `aimIsWorldPoint = false`.
- O `playerControlSystem` já resolvia a orientação pela direção do movimento
  como fallback; agora é o caminho padrão. Parado, o personagem mantém a última
  direção encarada (ataques saem nessa direção).
- A mira explícita (mundo/stick) continua suportada no `playerControlSystem`
  caso algum input volte a fornecê-la, mas nenhum input atual a usa.
- Ataque permanece em clique esquerdo / `J` / `Espaço` (dispara na direção
  encarada, não mais em direção ao cursor).

## Consequências
- Controle "twin-stick/aim" some; o jogo fica alinhado ao foco em melee.
- Mudança contida (input + textos de UI/ajuda); sem alteração na API de
  habilidades — `castAbility` continua recebendo o ângulo encarado.
- Supersede o trecho "a mira é sempre pelo mouse" da ADR 0023.
