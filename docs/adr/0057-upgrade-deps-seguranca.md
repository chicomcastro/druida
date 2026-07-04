# ADR 0057 — Upgrade de toolchain por segurança (vite 7, vitest 4, cypress 15)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
O Dependabot apontava 10 vulnerabilidades na main (2 críticas, 1 alta,
7 moderadas), todas em dependências de **desenvolvimento**: a cadeia
`esbuild → vite → vitest/@vitest/coverage-v8` (dev server permitia leitura
cross-origin), e a cadeia `qs`/`uuid → @cypress/request → cypress`. Nenhuma
afeta o bundle do jogo em produção (three e @fontsource/cinzel estavam
limpos), mas poluem o sinal de segurança do repo e o dev server vulnerável é
um risco real em máquina de desenvolvedor.

## Decisão
Subir os majors com correção em vez de pinar versões antigas com patch:

- **vite `^5` → `^7`** — corrige o advisory do esbuild; requer Node 20.19+
  (CI usa `node-version: '20'`, que resolve para o 20.x mais novo — ok).
  Ficamos em 7 (estável há mais de um ano) em vez de 8 (recém-lançado) para
  minimizar risco de regressão no pipeline de build.
- **vitest / @vitest/coverage-v8 `^2` → `^4`** — acompanha o vite 7 (vitest
  2 não o suporta). Config e thresholds existentes funcionam sem mudança;
  145 testes e o gate de coverage passam idênticos.
- **cypress `^13` → `^15`** — corrige `qs`/`uuid`. O formato de config é o
  mesmo desde o 10; flags de SwiftShader e o workflow de e2e não mudam.

## Consequências
- `npm audit`: **0 vulnerabilidades**.
- Sem mudança de código do jogo; bundle continua ~181 kB (limite 230 kB).
- Toolchain acompanha os majors suportados — próximos patches de segurança
  chegam por semver sem novo salto de major tão cedo.
- vite 7 muda o target default de build para "baseline widely available"
  (Chrome 107+/Safari 16+); irrelevante para o público do jogo (WebGL2 já
  exigia navegadores modernos).
