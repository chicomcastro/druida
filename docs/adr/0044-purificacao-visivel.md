# ADR 0044 — Purificação visível do mundo

**Status:** Aceito · **Data:** 2026-07-02

## Contexto
A fantasia central do jogo é curar a floresta (ADR 0010), mas o mundo não
reagia ao progresso: purificar um acampamento só removia o totem e vencer a
campanha só mostrava uma tela. O jogador nunca *via* a floresta melhorar — o
loop emocional do druida não fechava.

## Decisão
`world/PurityManager.ts`, com estado **derivado** (nada novo no save):

- **Regiões curam com a campanha**: cada bioma purifica a partir de um passo
  da história (`PURIFY_AT_STEP`) — Clareira ao completar a limpeza inicial,
  Pântano com a Árvore-Carniça, Bosque/Picos com os santuários, Coração na
  vitória. Como `story.step` já é persistido, o estado se reconstrói sozinho
  ao carregar (na reconstrução não há anúncio; ao vivo há toast + anel VFX).
- **Overlay `purified` por bioma** (`data/biomes.ts`): chão/fundo/névoa mais
  claros, luz mais quente/intensa e partículas trocadas por **vagalumes** —
  pagando a promessa da lore l8 ("quando a noite cai limpa, os vagalumes
  voltam"). `effectiveDef(biome)` mescla base + overlay; `WorldManager`,
  `DungeonManager` (retorno) e os spawns de props/grama passam a consumir a
  definição efetiva, então até as árvores nascem mais verdes em região curada.
- **Acampamentos florescem**: canteiro de flores/brotos onde havia o totem,
  derivado de `poi.camps[].cleared` (idempotente por id, cobre load e
  runtime).

Derivar em vez de persistir foi deliberado: zero migração de schema, zero
estado duplicado e impossível dessincronizar do progresso real.

## Consequências
- Progresso da campanha vira feedback ambiental contínuo; regiões já limpas
  ficam agradáveis de revisitar (e o pós-vitória tem um mundo inteiro verde).
- Overlays são parciais e tunáveis por bioma; novos biomas só precisam do
  campo `purified` para participar.
- Limite conhecido: props/grama já spawnados não recolorem ao purificar — só
  os novos (o pseudo-streaming recicla tudo em ~50 unidades de movimento, o
  efeito prático é imediato). Recolorir instâncias vivas fica como polish.
