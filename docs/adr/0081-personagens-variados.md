# ADR 0081 — Personagens com trama visível e variedade (M18.3)

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
Playtest 5: "avatares e NPCs estão sem textura e todos iguais; o mercador
só faltou textura". A trama 'cloth' (ADR 0066) era sutil demais para ler à
distância da câmera, e todos os moradores de uma vila usavam exatamente o
mesmo modelo.

## Decisão
- **Trama 'cloth' mais forte** (`pixelTextures`): xadrez 0.88–0.95 + linhas
  de costura a cada 5 px — visível no jogo, ainda tintada pela cor da parte
  (personagens, tendas, toldos e bandeiras herdam de graça).
- **Variedade determinística por NOME** (`makeVillagerSpec` + hash):
  - tom da túnica varia ±18% dentro da paleta do tema;
  - **capuz ou cabelo** (5 cores de cabelo, com franja);
  - **avental de linho** (1 em 4) e **mochila de couro** (1 em 5);
  - anciãos mantêm capuz/capa/cajado (autoridade visual preservada).
- **Mercadorias da banca texturizadas** (trama de tecido nos fardos).

## Consequências
- Cada morador tem cara própria sem nenhum asset novo — tudo procedural e
  estável entre sessões (hash do nome).
- Fecha o M18 (3/3).
