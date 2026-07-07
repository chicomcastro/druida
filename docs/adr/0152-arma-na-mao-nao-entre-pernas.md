# ADR 0152 — Arma empunhada na mão (não entre as pernas) (E23.1)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
No playtest o Chico notou um "bloco cinza entre as pernas" do herói que balançava
ao andar, como um rabo. Investigando o modelo voxel do druida: a **espada** (e o
**cajado** do ancião) ficavam pendurados no **centro-baixo** do corpo, entre as
pernas, e balançavam junto do braço — parecia uma cauda.

## Causa
`buildVoxelGroup` posiciona uma parte com `parent` subtraindo a junta do pai
(`child.pos = child.joint − parent.joint`), ou seja, trata `joint` em espaço do
modelo. A arma usava `joint: [0, -0.5, 0.1]` — que resolvia para o mundo ≈
`[0, -0.5]` (centro, baixo, entre as pernas), não na mão direita.

## Decisão
- **Espada do druida**: junta corrigida para a mão direita — `[0.52, 0.9, 0.2]`
  (lado direito, à frente). A lâmina passa a apontar pra cima, empunhada ao lado
  do corpo, e segue o braço na animação.
- **Cajado do ancião** (`makeVillagerSpec`, mesmo bug): junta `[0.5, 0.85, 0.15]`.

## Consequências
- O herói (e o ancião) agora **seguram a arma na mão**, ao lado do corpo — sem o
  "rabo" cinza entre as pernas. As pernas ficam limpas ao andar.
- Verificado renderizando o modelo isolado (antes: lâmina pendurada no centro;
  depois: espada empunhada à direita, lâmina pra cima), typecheck, 329 testes e
  build.
- Próximo (E23): impedir zoom do navegador no touch (E23.2), modais responsivos +
  fechar clicando fora + botões de toque (E23.3), IA dos aldeões (E23.4).
