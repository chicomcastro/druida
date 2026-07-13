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

## Adendo (E64) — modelo inteiro + folhagem instanciada
Playtest: ao passar atrás de uma casa, só a PAREDE atingida ficava translúcida
(o telhado continuava opaco), e as árvores da floresta não somiam.
- **Modelo inteiro:** a "unidade" de fade deixou de ser a malha atingida e passou
  a ser o **modelo** — o filho direto do container de topo (a casa dentro do
  grupo-da-vila). Ao mirar uma parede, a casa inteira esmaece junto.
- **Folhagem instanciada:** `InstancedMesh` (árvores) não aceita opacidade por
  instância (todas dividem 1 material), então a instância na frente **encolhe e
  some** (volta ao sair). Para não piscar (a instância encolhida sairia do raio),
  o manter/soltar é **geométrico** — distância da posição-base da árvore ao
  corredor herói→câmera —, imune à escala atual.
- Travado por testes: grupo (parede+telhado somem juntos e restauram) e
  instância (a da frente encolhe, a de longe fica intacta).

## Adendo (E67) — folhagem instanciada por VARREDURA (o raio errava troncos)
Playtest: as árvores da floresta ainda não somiam. Causa: o `InstancedMesh` era
descoberto pelo **raio fino** herói→câmera, que acerta a casa larga mas ERRA o
tronco de 0.55u por onde o herói "passa no meio" — a linha só amostra um fio.
- **Descoberta geométrica:** a folhagem instanciada deixou de depender do raio.
  A cada `every` frames, `_scanInstances` varre as instâncias VISÍVEIS (escala >
  0.05, ignorando slots escondidos do pool) dentro de ~12u XZ de algum jogador e
  testa a esfera-limite de cada uma contra o corredor herói→câmera
  (`_segDist2 < rad²`). Assim TODA árvore no caminho encolhe, por mais fina que
  seja — imune à espessura da geometria.
- Modelos normais (casas/torres/Carvalho-Mãe) seguem no raycast (largos, o raio
  acerta) — só a folhagem instanciada mudou para varredura.
- Travado por testes: tronco fino (0.5u) no corredor encolhe pela varredura; slot
  escondido (escala 0) nunca é "crescido" por engano.

## Futuro
Cull espacial dos candidatos (hoje o raycast varre os grupos de cenário) se a
vila crescer muito; opção de fade por dithering (alpha-test) em vez de blend para
telas onde a ordenação de transparência incomode.
