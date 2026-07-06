# ADR 0118 — Santuários afastados das cidades (jornada como escolha)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Vendo o mapa-mundi (E14), a distribuição ficou **oportunista**: cada santuário
estava colado na sua vila (27–40 u de distância) e quase na mesma direção. Isso
apaga a decisão do jogador — achar a cidade e despertar o santuário viravam a
mesma parada. O pedido: deixar a distribuição mais orgânica, com a **cidade no
interior do bioma** e o **santuário numa direção distante e distinta**, para que
buscar o santuário seja uma **jornada própria** e o jogador precise **priorizar**
ir à cidade ou ao santuário.

## Decisão
- **Santuários realocados** (`gameplay/story.ts` `LANDMARKS`), cada um ainda no
  mesmo bioma da sua vila, mas longe dela e num rumo diferente:
  - Lobo: `(0,-40)` → `(-40,-69)` — noroeste da Clareira (80 u do hub).
  - Urso: `(65,-62)` → `(177,-33)` — fundo NE do Pântano (95 u do Vau).
  - Corvo: `(-130,33)` → `(-210,-49)` — norte do Bosque (100 u de Cinzafolha).
  - Sapo: `(118,140)` → `(66,247)` — sul dos Picos (110 u do Degelo).
- **Cidades mantidas**: cada vila **já é a âncora do seu bioma** no Voronoi
  ponderado (ADR 0109/0110), ou seja, o ponto mais profundo da região (margem de
  interior 52–100 u até a fronteira mais próxima). Mover a âncora só reposiciona
  o bioma; o interior real veio de afastar o santuário, não a cidade.
- **Validação por script**: cada coordenada foi conferida com uma réplica de
  `biomeAt` — bioma correto, margem de interior ≥ ~60 u e distância à cidade
  80–110 u, todas dentro do disco do mapa (raio 290).
- **Descrições da campanha** (passos `find_*`) reescritas para vender a viagem:
  "longe da vila", "jornada à parte" — em vez de "perto dele".

## Consequências
- O mapa fica orgânico: cidade e santuário em cantos diferentes de cada bioma,
  criando um **fork** — no longo prazo o jogador escolhe a cidade (loja, quests,
  reputação) ou o santuário (nova Forma/Dom).
- **Sem churn de bioma**: santuários não são âncoras, então `biomeAt` e todos os
  testes de coordenada de bioma seguem intactos. A campanha é event-driven
  (interação), não dependente de coordenada, então a progressão não muda.
- Casa com level-scaling (ADR 0110): a jornada ao santuário atravessa mais
  território do bioma, no nível da região.
