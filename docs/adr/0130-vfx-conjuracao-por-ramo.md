# ADR 0130 — VFX de conjuração por ramo (E17.4)

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Com a hotbar conjurando skills (E17.3b), todas as magias saíam com o mesmo
"blip" e o efeito próprio de cada habilidade — sem uma **assinatura por ramo**.
O playtest pediu "novas animações e efeitos visuais para cada ramo da árvore":
cada elemento deve *sentir* diferente ao conjurar.

## Decisão
- **`CAST_SIGNATURE`** (em `systems/vfx.ts`): mapa data-driven ramo → `{color,
  mode}`. Seis gestos distintos:
  - `natureza` → **bloom**: anel verde + esporos brotando do solo.
  - `chama` → **jet**: clarão + jato de fogo pra cima.
  - `gelo` → **implode**: estilhaços ciano convergindo ao centro.
  - `tempestade` → **nova**: estouro radial rápido + onda + clarão branco.
  - `feras` → **stomp**: poeira/uivo rente ao chão + onda baixa.
  - `vida` → **motes**: clarão suave + faíscas curativas subindo.
- **Gatilho**: `VfxManager` escuta `cast` e, se `abilityBranch(abilityId)`
  resolve um ramo, dispara `castSignature(x, z, branch)` na posição do
  conjurador. Ataques básicos de forma (sem ramo) são ignorados — só as skills
  da árvore ativa ganham assinatura.
- **Sem assets novos**: cada gesto é montado das primitivas existentes
  (`ring`/`flash`/`shockwave`/partículas do pool), mantendo o custo baixo e o
  estilo voxel/MCD coeso.
- **Teste** (`tests/castVfx.test.ts`): garante que todo ramo da árvore tem
  assinatura com modo válido e que toda habilidade liberável resolve para um
  ramo com assinatura — regressão de "magia sem identidade" quebra o CI.

## Consequências
- Cada ramo tem leitura visual própria ao conjurar, reforçando a fantasia
  elemental da árvore de skills.
- O mapa é a fonte única: adicionar um ramo novo exige uma entrada em
  `CAST_SIGNATURE` (senão o teste falha) — cobertura garantida por construção.
- Próximo: **E17.5** — unificar formas/passivas no modelo da hotbar e permitir
  remapeamento livre de 1–9.
