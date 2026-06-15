# ADR 0028 — E2E com Cypress + evidência visual no PR

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
Os testes de unidade cobrem lógica, mas a maioria dos bugs desta jornada foi de
**integração/runtime** (vazamento de mesh, campos não declarados pós-TS). Faltava
uma rede que **suba o jogo de verdade** e documente visualmente as telas a cada
iteração.

## Decisão
- **Cypress** roda um smoke que percorre as telas (menu, HUD, inventário,
  mapa-mundi, diálogo, pausa), **captura screenshots** e **falha se houver
  qualquer erro de console/runtime**. Usa o hook `window.DRUIDA` para dirigir
  estados de UI de forma determinística.
- **WebGL no CI:** Chrome com SwiftShader (`--use-angle=swiftshader`,
  `--enable-unsafe-swiftshader`), senão a cena 3D sai preta / o renderer falha.
- **Evidência visual no PR:** as capturas são publicadas numa branch dedicada
  `screenshots` (via `peaceiris/actions-gh-pages`, `keep_files`) sob
  `pr-<n>/...`, e um **comentário fixo** (`marocchino/sticky-pull-request-comment`)
  embeda as imagens inline por URL `raw.githubusercontent`. Também sobe artifact.
- Workflow `e2e.yml` separado do `ci.yml` (gate de build/test/coverage continua
  independente).

## Consequências
- Regressões de runtime/integração passam a ser pegas no PR, com prova visual.
- Custo: uma branch lateral de artefatos (`screenshots`) e dependência de
  SwiftShader no CI. Render por software difere um pouco do hardware, mas serve
  para smoke e documentação.
- A parte que só valida no CI (browser real) pode exigir ajustes finos de flags
  de WebGL/caminhos na primeira execução.
