# ADR 0097 — Réplica: vilas 2–4 vivas (E7)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
O E5/E6 deram vida à Clareira (interiores, famílias, side quests). O E7 pede o
mesmo tratamento nas outras três vilas — Vau das Palafitas, Cinzafolha e Abrigo
do Degelo — cada uma com seus **formatos de casa** próprios (palafita sobre
estacas, cabana de tronco, tenda de pele) e estruturação completa
(liderança/taverna/lojas). Os formatos já existem desde os milestones de arte;
faltava torná-los **entráveis** e povoar os interiores.

## Decisão
- **Reuso total do pipeline** (ADR 0094): o `InteriorManager` e os temas de
  interior já são genéricos. O E7 apenas **coloca portas** (`_houseDoor`) nos
  builders das três vilas, com a mesma placa temática + `Interactable
  {kind:'house'}` da Clareira.
- **Posição das portas por formato**: cada builder calcula a entrada conforme
  sua geometria — palafita (à frente da escada do deck), cabana (à frente da
  porta de tora) e tenda (o vão voltado ao centro) — reusando `_spun`/`snap90`
  e o alinhamento ao grid.
- **Tema `market` (novo, neutro)**: mercado geral (vende de tudo, sem viés e
  sem família). As vilas 2–4 recebem o conjunto **market · tavern · leader ·
  home**, dando a cada uma loja, taverna e liderança sem vazar a rixa
  Fenwick×Aldren, que fica como **assinatura exclusiva da Clareira** (a
  especialização armeiro/armaduraria e o arco social continuam só lá).
- Nenhum footprint/colisor novo: as portas são só entidades interativas na rua,
  então o validador de sobreposição (ADR 0085) segue limpo.

## Consequências
- As quatro vilas passam a ser exploráveis por dentro com serviços úteis
  (comprar, descansar, conversar) — cada bioma agora tem um refúgio funcional,
  não só cenário.
- Identidade preservada e barata: a Clareira continua sendo a vila "profunda"
  (famílias + lojas especializadas + arco de quest); as demais ganham vida
  suficiente para o loop sem duplicar conteúdo narrativo. Aprofundar cada uma
  (famílias/sides próprias) é incremento futuro puramente de dados.
- O `market` neutro vira a base de loja para qualquer vila nova (E9/pós-E7).
