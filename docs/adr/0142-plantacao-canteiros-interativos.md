# ADR 0142 — Plantação: canteiros interativos + painel (E20.2)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
A fundação de farming (E20.1) trouxe culturas, sementes e o estado dos canteiros
em funções puras, mas sem view. Faltava a vila **usar** isso: os canteiros da
praça da Clareira eram só ervas decorativas.

## Decisão
- **`FarmManager`** (novo, `src/world/FarmManager.js`): registrado no `Game` e no
  laço de systems. Constrói **2 canteiros interativos** na praça da Clareira (nas
  posições dos antigos jardins) com um id estável por canteiro; dá as sementes
  iniciais (`grantStarterSeeds`). A cada frame avança o crescimento
  (`tickFarming`) — inclusive fora da vila (masmorra/interior) — e reflete o
  estado no visual: broto cresce em altura, fruto aparece maduro na cor da
  cultura, e o prompt muda entre "🌱 Plantar", "crescendo X%" e "E — Colher".
- **`SettlementManager`**: os jardins decorativos deixaram de ser desenhados no
  `_buildDruida` (as pegadas jardim-oeste/leste permanecem para o validador); o
  FarmManager assume os canteiros.
- **Interação** (`interaction.ts`): `kind:'plot'` abre o painel de canteiro.
- **Painel de canteiro** (`Menus.openFarm/refreshFarm`): canteiro vazio lista as
  sementes da despensa para plantar; plantado mostra a barra de progresso;
  maduro oferece **colher** (credita o ingrediente na despensa). Fecha com E/Esc.

## Consequências
- O ciclo semear → crescer → colher fica jogável na Clareira, fechando a fonte
  renovável de ingredientes vegetais ao lado do forrageamento e do mercador.
- Verificado por teste (`FarmManager` cria 2 plots interativos + starter seeds;
  plantar mostra broto; maduro mostra fruto e prompt de colher; colher credita e
  limpa; cresce fora da vila), typecheck, build e checagem em runtime num Game
  real (2 canteiros, plantio e maturação ok em -5,5).
- Próximo (E20.3): sementes no mercador + amarração ao ciclo de dia + polish.
