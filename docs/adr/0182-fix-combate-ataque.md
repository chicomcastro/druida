# ADR 0182 — Correções de combate: direção do golpe, flash e tremor (E57/E58/E59)

**Status:** Aceito · **Data:** 2026-07-12

## Contexto
Playtest de combate melee apontou três bugs, todos ao atacar:

1. **Direção do arco do golpe aleatória** — o feedback visual do golpe saía "pro
   lado" ou "pra trás", não para onde o herói encara.
2. **Uma parte dos modelos "pisca"** (a calça) — tanto no jogador quanto nos
   NPCs — ao acertar; e a **tela treme demais**.
3. **"Subo de nível do nada, toda vez que ataco, até uns 4, aí para."**

## Investigação
- **E58 (direção):** o modelo encara `tr.rot = θ` e o `meleeArc` acerta na
  convenção `(sin θ, cos θ)` (θ=0 → +Z). Só a VFX do arco (`vfx.swing`) usava
  `rotation.z = -θ`, que projeta o centro do arco em `(cos θ, sin θ)` — defasado
  do rumo de 0 a 90° conforme o ângulo, daí parecer "aleatório". As faíscas da
  ponta já usavam `(sin, cos)`; só o anel destoava.
- **E59 (pisca):** os materiais voxel são **compartilhados por cor** (cache em
  `voxelModels`). O flash de dano (`render.applyEmissive`) mexia no `emissive`
  do material **in place**, então tingir as pernas de couro de UM inimigo tingia
  a mesma cor em **todos** os modelos — o "a calça pisca em todo mundo".
- **E59 (tremor):** o shake acumula (`addShake` soma até 1.2). O `combo` dispara
  a CADA acerto encadeado com shake 0.08–0.2 e cada morte comum somava 0.18 —
  num pack isso mantinha a tela tremendo o tempo todo.
- **E57 (nível):** medido com repro headless — **XP só é concedida na morte de
  inimigo** (`gameEvents` no `kill`), a fauna é excluída corretamente e não há
  caminho "XP por hit". A causa real: a **curva inicial era rasa demais**
  (`xpBase 38`; L1→L2 = 38 XP ≈ 6 comuns), então a primeira refrega despejava
  3–4 níveis de uma vez e depois estagnava — exatamente "toda vez que ataco…
  até 4, aí para". O caos visual de E58+E59 (golpes acertando fora do rumo, tudo
  piscando) ainda fazia os abates parecerem "do nada".

## Decisão
- **E58:** `vfx.swing` passa a orientar o anel com `rotation.z = θ - π/2` (e o
  sweep a partir daí), alinhando o centro do arco a `(sin θ, cos θ)` — o mesmo
  rumo do modelo e do acerto.
- **E59 pisca:** `applyEmissive` faz **clone-on-write** — cada malha que chega a
  piscar/tingir ganha sua própria cópia do material na 1ª vez (cenário estático
  nunca pisca, então nunca clona). O flash fica isolado no alvo.
- **E59 tremor:** shake do `combo` cai para 0.02–0.05 (o peso já vem do
  hit-stop) e a morte comum para 0.08; chefe (0.8), queda do jogador (0.6) e
  explosão de elite (0.35) permanecem como eventos.
- **E57:** `xpBase 38 → 64` (mantendo `xpExp 1.5`). Encarece os primeiros níveis
  para serem conquistados, sem tocar no poder — nível só concede ponto de
  encanto/talento; poder vem do gear (ADR 0175). Não afeta a matriz de
  balanceamento (os testes fixam o nível; XP não entra na escala de HP/dano).

## Consequências
- O arco do golpe cai onde o herói olha; o flash de dano fica no alvo acertado;
  a tela só treme em eventos de peso; a progressão inicial deixa de "vomitar"
  níveis na primeira luta.
- Travado por testes: `combatFeel.test` (5 ângulos do arco em `(sin, cos)` +
  isolamento do flash entre dois modelos que dividem material) e o canário da
  curva em `core.test` (`xpForLevel(1) = 64`).
- 423 testes verdes, `tsc` limpo, `vite build` ok, bundle 230 kB (< 236).

## Futuro
Se o clone-on-write dos materiais pesar com muitos inimigos piscando ao mesmo
tempo, migrar o flash para um atributo de instância / uniform em vez de material
por malha. Considerar mira assistida (snap suave ao inimigo mais próximo dentro
do arco) para o melee sem cursor.
