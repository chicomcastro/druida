# ADR 0172 — Chefes com modelos e animações não-humanoides (E39)

**Status:** Aceito · **Data:** 2026-07-11

## Contexto
Os três chefes de bioma (O Apodrecedor, Senhor do Lodo, Ceifador Gélido) eram
modelos voxel **bípedes** — mesma silhueta braços+pernas dos aldeões e inimigos
comuns, só que maiores. Um chefe precisa **impor**: silhueta única e um jeito de
se mover que não seja "gente grande". O pedido do E39: modelos e animações novas,
**menos humanoides**.

## Decisão
1. **Três andaduras novas (`Gait`)** em `entities/voxelModels.ts` +
   `systems/animation.ts` — cada uma com sua física procedural (seno/fase, só
   rotação/escala/posição, testável sem WebGL):
   - **`ooze`** — a massa esmaga-e-estica (squash-stretch do tronco/base), o
     núcleo pulsa e os tentáculos se ondulam. Sem passada.
   - **`floating`** — o corpo **paira** (altura constante + respiração), a cauda
     de névoa balança e os cacos de gelo **orbitam** (giro contínuo).
   - **`rooted`** — não translada em pernas: o tronco balança no lugar e as
     **raízes se contorcem**, cada uma com sua fase; o núcleo em brasa pulsa.
2. **Modelos remodelados** (não-humanoides), reaproveitando os nomes de parte que
   o overlay de ataque já anima (`armL/armR/weapon`) para o slam continuar valendo:
   - **rotlord** → tronco nodoso gigante com **maw em brasa** (`core`), copa de
     galhos-chifre, braços-cipó e quatro **raízes** (`root1..4`) no lugar das pernas.
   - **mirelord** → **base** que se espalha (poça viva), montículo de lodo, núcleo
     úmido reluzente (`core`) e tentáculos-clava — sem pernas.
   - **frostreaver** → corpo de caco tapando numa **cauda de névoa** (`wisp`),
     cacos de gelo orbitando (`shardL/R/T`), coroa e foice — sem pernas, paira.
3. **Sem quebrar dados/combate** — as chaves de `mesh` (rotlord/mirelord/
   frostreaver), HP, invocações e `bossSystem` ficam intactos; só o modelo e a
   andadura mudaram. O animador recebe a andadura via `userData.gait` (render),
   então tudo flui sem tocar no pipeline.

## Consequências
- Os chefes agora têm presença própria: um horror arraigado, uma massa que se
  arrasta e um espectro que paira — leitura imediata de "isto não é um aldeão
  grande". As animações vivem mesmo parados (writhe/pulse/orbit/hover).
- Travado por testes (`bossModels.test`: andaduras não-humanoides + ausência de
  pernas; partes-assinatura por forma; o animador pulsa o núcleo, faz os cacos
  orbitarem, contorce as raízes, paira o espectro e o slam golpeia à frente).
  380 testes verdes, `tsc` limpo, `vite build` ok. Wiki re-ilustrada
  (`img/bosses-e39.jpg` + `chefe-*.png` recapturados no showcase).

## Futuro
Ataques com telegrafia própria por chefe (poças de lodo, estilhaços de gelo,
raízes que emergem); mini-chefes das masmorras com formas dedicadas; fase 2 que
muda a silhueta (o chefe "abre").
