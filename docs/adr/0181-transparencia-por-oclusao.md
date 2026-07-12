# ADR 0181 — Transparência por oclusão (câmera vê o herói) (E56)

**Status:** Aceito · **Data:** 2026-07-12

## Contexto
Na câmera isométrica, cenário alto entre o jogador e a câmera **escondia o herói**
— a Carvalho-Mãe (o jogador começa atrás dela), casas, torres, e o que estivesse
atrás delas. Não dava para "ver tudo". Faltava o comportamento clássico de
*cutaway*: o que tapa a visão fica translúcido.

## Decisão
Novo `OcclusionFade` (`core/render/OcclusionFade.ts`), chamado no `Game.render`
antes de renderizar:
- A câmera é **ortográfica** (raios paralelos), então basta **um raio de cada
  jogador em direção à câmera**. As malhas atingidas ANTES de chegar ao jogador
  (dentro da distância até a câmera) são exatamente o que atrapalha → recebem
  opacidade baixa (0.22), com transição suave. Ao saírem da frente, voltam a opaco
  e o material original é restaurado.
- **Não some**: criaturas (jogador/inimigos/NPCs/loot — todo `Renderable.object3d`
  passa como "raiz de entidade" a preservar) nem folhagem instanciada
  (`InstancedMesh`). Chão e céu ficam de fora naturalmente (o raio sobe; o `far`
  para na câmera, antes do domo).
- **Sem vazamento**: clona o material da malha 1× (cacheado) antes de mexer na
  opacidade, então nunca afeta outras malhas que compartilhem o mesmo material.
- Recalcula os obstáculos a cada 3 frames (o *lerp* de opacidade roda todo frame).

## Consequências
- O herói nunca mais fica escondido — a Carvalho-Mãe e o que estiver atrás dela
  aparecem; casas/torres translucem ao passar na frente. Vale também no interior
  (a parede da frente some sozinha, como o "removi a parede pra ver o herói").
- Travado por testes (`occlusion.test`): caixa na linha herói→câmera fica
  translúcida e volta ao opaco (material restaurado) ao sair; entidade registrada
  nunca some.
- 415 testes verdes, `tsc` limpo, `vite build` ok.

## Futuro
Cull espacial dos candidatos (hoje o raycast varre os grupos de cenário) se a
vila crescer muito; opção de fade por dithering (alpha-test) em vez de blend para
telas onde a ordenação de transparência incomode.
