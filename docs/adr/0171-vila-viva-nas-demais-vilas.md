# ADR 0171 — Vila viva nas demais vilas: moradia por-casa em Vau, Cinzafolha e Degelo (E38)

**Status:** Aceito · **Data:** 2026-07-11

## Contexto
O E36 deu **moradia por-casa** (cada porta de lar vira um recinto próprio de
família, e o cronograma recolhe cada morador na SUA casa) — mas só a Clareira
tinha portas `home`. As outras três vilas (Vau das Palafitas, Cinzafolha, Abrigo
do Degelo) só tinham portas de **serviço** (lojas/taverna/mercado): entrar numa
casa nunca mostrava uma família, e o cronograma não tinha um lar para recolher os
moradores desses povos. O pedido do E38: dar vida às demais vilas, à escala da
Clareira, com **design distinto por vila**.

## Decisão
1. **Temas-lar por vila (`data/interiors.ts`)** — três novos interiores de
   moradia, marcados com `residence: true` e `service: 'talk'` (lar não é loja),
   cada um com a **paleta e o clima da sua vila**:
   - `vau_home` — verde-água da lagoa, lanterna de musgo;
   - `cinza_home` — brasa e tora, fogão aceso;
   - `degelo_home` — gelo azul, chama fria, peles no chão.
   O `home` genérico da Clareira também ganhou `residence: true`.
2. **Recinto de LAR generalizado (`_indexVenues`)** — deixou de casar só com o id
   literal `'home'`; agora **qualquer** interior com `residence` vira um venue de
   lar próprio (id único `home#<vila>#<n>`, família mais próxima, tema guardando o
   clima da vila). Fecha o gap do E36 para as três vilas de uma vez.
3. **Prédios-lar nos builders** — cada vila cresceu com casas de família
   entráveis no seu vocabulário: **palafitas-lar** sobre a lagoa do Vau (+2),
   **cabanas-lar** de tora em Cinzafolha (+3) e **tendas-lar** de pele no Degelo
   (+2). Posições validadas contra o `overlaps()` (ADR 0085) e o
   `pathsThroughHouses` (ADR 0155) — nenhuma casa nova invade prédio, cairn,
   cristal, muro de gelo, serraria, pilha de toras ou banca do mercador.
4. **Famílias ancoradas aos lares (`RESIDENCES`)** — as vilas 2–4 deixaram de
   ancorar as famílias nos prédios de serviço; cada lar é agora o âncora de um
   household, mapeando 1:1 lar↔família (`_nearestHousehold`).
5. **Formato de interior por vila (`InteriorManager._roomSpec`)** — as moradias
   variam de forma (Vau raso 7×5, Cinzafolha fundo 6×7, Degelo quadrado 6×6),
   somando ao E35.
6. **Mais moradores** — dois moradores nomeados novos por vila (com falas de
   sabor sobre morar ali), aumentando a população e o elenco de cada interior.

## Consequências
- As quatro vilas agora estão **vivas por igual**: entrar numa casa em qualquer
  vila mostra a família que o cronograma (E34) pôs ali naquele horário; à noite
  os moradores recolhem-se ao SEU lar, com o clima visual da sua vila.
- Travado por testes (`villagesHome.test`: cada vila não-hub tem ≥2 lares únicos
  com `residence`; temas-lar com paletas distintas; todo morador com lar aponta
  para um venue de lar existente) + validadores de layout intactos (`overlaps`,
  `streetsClear`, `lanternsOnStreets`). 380 testes verdes, `tsc` limpo,
  `vite build` ok.

## Futuro
Fatias seguintes: variar também o formato/tamanho EXTERIOR das casas por família;
mais lares onde a densidade da vila permitir (Vau/Degelo estão apertados);
famílias com sobrenome e diálogo próprio dentro do lar.
