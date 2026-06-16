# ADR 0027 — Cobertura no CI com comentário fixo no PR

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
Queríamos **trackear a cobertura de testes ao longo das iterações**, visível em
cada PR, sem travar o fluxo com thresholds rígidos num protótipo.

## Decisão
- `vitest.config.ts` separado da `vite.config.js`: cobertura via **v8**,
  reporters `text` + `json` + `json-summary`, escopo `src/**/*.ts` (exclui
  `main.ts`).
- Script `npm run test:coverage`; o CI passa a rodá-lo no lugar de `npm test`.
- **Comentário fixo (sticky)** de cobertura no PR via
  `davelosert/vitest-coverage-report-action`, atualizado a cada push (requer
  `permissions: pull-requests: write`).
- Adicionado `concurrency` com `cancel-in-progress` para não acumular runs.
- **Sem threshold de falha por ora** — o objetivo é observar a tendência. A
  cobertura inicial é baixa (~28% linhas) porque UI/render/sistemas são melhor
  cobertos por e2e (Cypress, próximo PR), não por testes unitários.

## Consequências
- Cada PR mostra a cobertura atual num comentário que se atualiza sozinho.
- Comparação com a base (delta vs `main`) e thresholds podem ser ligados depois.
- O e2e do Cypress cobrirá as camadas de UI/integração que os testes de unidade
  não alcançam.

## Atualização — delta vs. main
A run da `main` publica `coverage-summary.json` como artefato; nos PRs, o CI
baixa esse artefato (via `dawidd6/action-download-artifact`) e passa
`json-summary-compare-path` para a action, exibindo o **delta de cobertura** no
comentário. Na primeira execução (antes de a `main` ter o artefato) o comentário
sai sem delta.
