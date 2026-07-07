# ADR 0160 — Wiki ilustrada, lote 2: biomas, interiores, armas & skills (E27)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
O lote 1 (ADR 0159) ilustrou vilas, inimigos, chefes, fauna e NPCs. Faltavam os
**interiores**, close-ups por **bioma**, e — apontado pelo jogador — as **armas**
(sem lista, sem ilustração) e as **skills** (só texto). Sobravam os **hazards**.

## Decisão
- **Armas** (`docs/wiki.md §12`): tabela das 9 armas possíveis (família /
  elemento / dano / alcance-arco, de `loot.ts`) + galeria dos modelos empunhados
  (lâmina corpo-a-corpo, foice, cajado) renderizados na vitrine.
- **Skills** (`§11`): screenshot do painel de Talentos (tecla K) mostrando os
  seis ramos ativos (Natureza/Chama/Gelo/Tempestade/Feras/Vida) + nota dos ramos.
- **Biomas** (`§3`): 5 close-ups em campo (teleporte da câmera para cada região):
  Clareira, Pântano, Bosque Cinza, Picos e Coração.
- **Interiores** (`§6`): 6 fotos capturadas entrando na micro-instância via
  `interiors.enter()`: forja, armaduraria, mercado, jardineiro, taverna, salão.
- **15 imagens novas** em `docs/img/`. Sem mudança de código (só captura + wiki).

## Consequências
- A wiki cobre praticamente toda entidade citada: mundo/biomas, vilas, interiores,
  formas, armas, skills, itens, inimigos, chefes, fauna, NPCs e mapa.
- **Ainda pendente**: os **hazards** ambientais (zonas telegrafadas transitórias)
  — precisam de captura no instante do disparo; ficam para um lote futuro.
