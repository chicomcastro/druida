# ADR 0168 — Interiores dimensionados por tema (tamanhos e formatos variados) (E35)

**Status:** Aceito · **Data:** 2026-07-11

## Contexto
Todo interior usava a MESMA sala quadrada 8×8 (ROOM_R fixo), construída uma vez e
só recolorida por tema. Entrar em qualquer porta dava a mesma caixa — "tá sempre
a mesma coisa". Faltava variedade de **tamanho e formato**.

## Decisão
1. **Sala dimensionada por tema** (`InteriorManager._roomSpec`): cada tema tem
   meia-largura `rx` e meia-profundidade `rz` próprias — moradia aconchegante
   (6×6), liderança larga e rasa (7×6), lojas com fundo/largura variados (7..8 ×
   7..9, determinístico por tema), taverna ampla (9×8) e salão grande (10×9).
   Rooms retangulares (não só quadradas) → formatos diferentes.
2. **Sala refeita a cada visita** (`_buildRoom(theme)`): antes era construída uma
   vez (`_built`) e presa no tamanho. Agora é montada por visita com as dimensões
   do tema (chão, paredes com colisores em fileira — nunca um raião que prende o
   jogador, ADR 0162 —, lâmpadas de canto e portal de saída), guardando as malhas/
   colisores em `this._room` para **desmontar na saída**.
3. **Props relativos às dimensões**: todos os móveis, quadros, decoração de vila e
   cozinha passaram a se posicionar por `this._rx`/`this._rz` (eixo x/z) em vez do
   `ROOM_R` fixo — escalam com a sala. (De quebra, consertei a lareira da taverna,
   que estava sendo colocada ~1000u fora da sala por um bug de coordenada.)
4. **Luzes limpas na saída** (`LightPool.mark`/`truncate`): interiores registram
   lâmpadas/lareira/caldeirão por visita; ao sair, `truncate(mark)` descarta todas
   de uma vez — some o acúmulo (que já existia com a cozinha/lareira).

## Consequências
- Entrar em prédios diferentes agora *sente* diferente: uma casa apertada, um
  salão amplo, uma loja funda. Sem prender o jogador (colisores pequenos; spawn
  sempre dentro das paredes).
- Travado por teste (`interiors.test` E35: dimensões variam por tema — moradia <
  salão —, o jogador não nasce dentro de colisor, e a saída desmonta a sala/portal).
  366 testes verdes, `tsc` limpo, `vite build` ok. Runtime: moradia 6×6 vs salão
  10×9 renderizam certo (paredes, lâmpadas, quadros, móveis no lugar).

## Futuro
Formatos não-retangulares (em L, com alcovas/mezaninos) e variação de pé-direito
ficam para uma próxima; a base (`rx`/`rz` por tema, rebuild por visita) já suporta.
