# ADR 0159 — Wiki ilustrada por entidade + fauna na vitrine (E26)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
A wiki só tinha foto de uma vila (Clareira) e de parte dos inimigos. O pedido:
**toda entidade citada na wiki precisa de uma ilustração**. Faltavam as outras 3
vilas, 5 inimigos, 1 chefe, os NPCs e toda a fauna. A fauna, porém, era montada
dentro do `FaunaManager` e não aparecia na vitrine de modelos (showcase), então
não dava para fotografá-la pelo mesmo caminho dos outros modelos.

## Decisão
- **`buildFaunaModel(def)`** (`src/entities/faunaModel.ts`): extraí o construtor
  do modelo do bicho do `FaunaManager._model` para uma função pura reusável, com
  um lookup `FAUNA_DEFS` (id → def). O jogo e a vitrine passam a montar a fauna
  pela mesma função. `buildMesh` roteia kinds de fauna para ela; a vitrine ganhou
  o grupo **Fauna**. (A lebre do Bosque Cinza virou id único `lebre_cinza`.)
- **Captura em lote**: as ilustrações de criaturas (inimigos, chefes, NPCs,
  fauna) saem da vitrine renderizada isolada; as vilas 2–4, de uma visão aérea
  in-game teleportando a câmera para cada assentamento.
- **Wiki ilustrada** (`docs/wiki.md`): galerias por entidade — 4 vilas, 8
  inimigos, 3 chefes, 7 espécies de fauna, 4 NPCs (+ formas e mapa que já
  existiam). 20 imagens novas em `docs/img/`.

## Consequências
- Toda entidade principal da wiki tem foto; o construtor de fauna deixou de ser
  duplicado e agora é testável/reusável (a vitrine cobre todos os kinds).
- Teste da vitrine atualizado: cada kind renderiza por spec voxel **ou** por
  `buildFaunaModel` (`core.test`). 347 testes verdes.
- Follow-up (não coberto ainda): fotos dos **interiores** (loja/taverna/salão),
  dos **hazards** e close-ups por bioma — precisam de captura de cena interativa.
