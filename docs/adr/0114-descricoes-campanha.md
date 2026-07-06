# ADR 0114 — Descrições da campanha no HUD

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
O HUD mostrava só o **objetivo** curto do passo da campanha (ex.: "Vá ao Pântano
e desperte o Santuário do Urso"). Faltava **contexto/descrição** — o porquê e o
onde — pedido no feedback ("descrição melhor das missões e campanhas").

## Decisão
- Cada passo da campanha (`story.ts STEPS`) ganhou um campo **`desc`**: uma
  frase de contexto com a motivação e a localização (região/vila), coerente com
  o mundo aberto e o level-scaling.
- `StoryManager.description()` expõe a descrição do passo atual.
- O **HUD** (`hud-objective`) passou a exibir a descrição como uma **linha
  itálica** abaixo do objetivo — sempre visível, discreta.
- As missões de vila (ADR 0047) já têm oferta/lembrete/entrega ricos; ficam como
  estão.

## Consequências
- O jogador entende a campanha sem depender do diálogo inicial; cada passo se
  explica no HUD.
- Baixo risco: só dados + uma linha de UI; nenhum sistema novo.
- Um **diário de missões** completo (campanha + vila + paralelas num painel) fica
  como evolução futura, se o playtest pedir.
