# Direção de arte: estilo Minecraft Dungeons

> Análise das referências visuais (playtest 3) e plano faseado para migrar a
> direção de arte do Druida para o estilo do Minecraft Dungeons. O backlog
> acionável é o **M14** em [`backlog.md`](backlog.md).

## O que define o estilo (análise das referências)

| # | Assinatura visual | Estado atual do Druida | Distância |
|---|---|---|---|
| 1 | **Mundo de blocos**: terreno é uma grade de cubos texturizados, com desníveis dramáticos — falésias, plataformas, desfiladeiros com lava/abismos | Plano liso + props soltos | 🔴 grande |
| 2 | **Texturas pixel-art 16×16** por face de bloco, filtro *nearest* (pixel duro) | Cor chapada (`MeshStandardMaterial` liso) | 🔴 grande |
| 3 | **Luz quente vs. sombra fria**: ambiente escuro/azulado esculpido por luzes pontuais quentes (tochas, braseiros, lava) com bloom | Dia ensolarado com sol dominante (ADR 0058); poucas PointLights | 🟡 média |
| 4 | **Emissivos saturados**: lava, fogo e magia estouram no bloom; brasas/poeira flutuando | Bloom ok (ADR 0054); partículas ambientais por bioma existem | 🟢 perto |
| 5 | **Personagens proporção Minecraft**: cabeça grande, corpo blocado, textura pixel na pele | Voxels blocados de cor chapada; cabeça já é grande | 🟡 média |
| 6 | **VFX de rastro**: trilhas de arma ciano brilhantes, projéteis com cauda | Varredura aditiva + trilha de projétil (ADR 0061) | 🟢 perto |
| 7 | **Marcador losango** sob personagens (seleção/identidade) | Anel circular | 🟢 trivial |

## Princípios que vamos manter

- **Zero assets externos**: texturas pixel-art geradas por `CanvasTexture`
  procedural (como o ruído do chão hoje) — CSP/offline intactos, ~0 kB de
  bundle. Se um dia importarmos um atlas PNG, é asset estático (fora do
  orçamento de JS), mas começamos procedural.
- **Gameplay plano**: no MCD a navegação é majoritariamente plana; os
  desníveis são *cenário*. Vamos manter o plano jogável e adicionar elevação
  decorativa (bordas elevadas, canyons afundados com colliders) — sem tocar
  em movimento/colisão/IA.
- **Orçamentos**: bundle ≤ 230 kB, 60 fps em tablet, InstancedMesh para tudo
  que repete (ADR 0015).

## Riscos e decisões técnicas

- **Terreno em blocos** é o item pesado. Estratégia: o chão vira uma grade
  visual de topos de bloco (1×1) via InstancedMesh com variação de altura
  sutil (±0.1) e textura por bioma; falésias/canyons são *features*
  decorativas em anéis de borda e POIs — não um voxel engine completo.
- **Limite de PointLights** (forward renderer): pool com culling — só as
  ~6 luzes mais próximas do grupo ficam ativas; as demais viram emissivo puro.
- **Mood escuro vs. legibilidade**: o ADR 0058 clareou o dia porque o jogo
  estava ilegível. O estilo MCD escurece o *ambiente*, não os *sujeitos* —
  a regra passa a ser: chão/parede frios e escuros, personagens/interativos
  com albedo claro + rim de luz local. Masmorras adotam o mood primeiro
  (são o habitat natural do estilo); o overworld escurece por último e com
  cuidado (dia nublado dramático, não noite permanente).

## Fases (uma por PR, shippável e com screenshot de evidência)

1. **M14.1 — Spike de validação**: atlas pixel-art procedural (pedra, terra,
   grama, tábua, tora, musgo, neve) + aplicar no chão e nas casas da
   clareira; NearestFilter. Meta: uma captura lado a lado que "parece MCD".
   Se o look não convencer, recalibramos antes de converter o resto.
2. **M14.2 — Chão de blocos**: grade de topos de bloco por bioma
   (InstancedMesh, altura ±, textura do atlas), transições de bioma em
   "degraus"; ruído antigo do chão aposentado.
3. **M14.3 — Elevação decorativa**: anéis de falésia nas bordas de bioma,
   desfiladeiro com lava no Coração (emissivo + brasas + colliders),
   plataformas/ruínas nos POIs.
4. **M14.4 — Luz dramática**: pool de tochas/braseiros com PointLight real
   (flicker + culling), masmorras no mood MCD (ambiente frio escuro, ilhas
   quentes), lava com emissivo forte.
5. **M14.5 — Personagens MCD**: proporção mais cabeçuda nos voxels, textura
   pixel nas faces (pele/roupa), losango de identidade sob o jogador.
6. **M14.6 — Polish**: brasas/poeira com profundidade, rim light barato nos
   heróis, vinheta/grade recalibrados para o novo contraste, passe final de
   paleta por bioma.

Cada fase: ADR + testes + verificação visual headless + PR mergeado no verde.
