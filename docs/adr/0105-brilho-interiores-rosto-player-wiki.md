# ADR 0105 — Interiores mais claros, rosto do Druida e wiki viva

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
Feedback de validação: (1) os interiores estavam **escuros demais**; (2) dúvida
se o **avatar do player tem rosto** — e de fato a aba do capuz do Druida ocultava
os olhos (mesmo bug já corrigido nos aldeões no ADR 0103, mas o herói ficara de
fora); (3) faltava **um lugar único que documente o jogo** para iterar sobre o
desenvolvimento estático.

## Decisão
- **Interiores mais claros** (`InteriorManager`): o clima "interior" ganhou
  fundo mais quente e luz mais forte (sol 0.9→1.5, hemisfério 0.6→1.0) e névoa
  um pouco mais distante; as lâmpadas passaram de 2 para **4 cantos**, mais
  intensas no pool de luz. A sala continua selada, mas legível.
- **Rosto do Druida** (`voxelModels.druid`): mesma correção do ADR 0103 — a aba
  do capuz sobe/afina (fica acima dos olhos) e os olhos descem; o herói tem
  rosto visível sob o capuz.
- **Wiki viva** (`docs/wiki.md`): documento único consolidando mundo/biomas,
  vilas, interiores, formas (+ critérios de desbloqueio), combate, skill tree,
  itens, inimigos/hazards/fauna, chefes/masmorras, quests/campanha, economia,
  save/telemetria e **lacunas conhecidas** — cada seção aponta o arquivo-fonte
  de dados para iterar. Ligada no README.

## Consequências
- Interiores ficam convidativos sem perder o clima fechado; o herói deixa de
  parecer "sem rosto" — coerente com os aldeões.
- A wiki vira a fonte da verdade para planejar conteúdo estático (o usuário pode
  editar dados e ver o efeito documentado), e registra explicitamente lacunas
  como a **Forma Lobo sem santuário** (a decidir) e a rixa restrita à Clareira.
- Documento é manual por ora; se divergir muito dos dados, considerar um gerador
  que leia `src/data/*` no futuro.
