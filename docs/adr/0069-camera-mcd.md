# ADR 0069 — Câmera mais perto, estilo MCD (M15.3)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Playtest 3: "a câmera parece mais longe do que no MCD, é proposital?" Em
parte — o enquadramento (meia-altura 14) foi calibrado para coop same-screen
e touch. Mas o Minecraft Dungeons joga visivelmente mais perto, e a
distância escondia exatamente o que o M14 construiu (texturas, animações,
poças de luz).

## Decisão
`IsoCamera`: meia-altura padrão **14 → 11** e mínimo **11 → 9**; o máximo
continua 28 (o zoom dinâmico do coop segue afastando pelo spread do grupo).

Trade-offs aceitos:
- **Pró**: personagens ~27% maiores em tela, texturas/animações legíveis,
  drama de luz — o look da referência.
- **Contra assumido**: inimigos ranged (corvo/xamã, alcance ~12u) podem
  disparar de fora da tela em situações raras — mitigado pelos projéteis
  lentos e telegrafados (ADR 0035) e pelo minimapa.
- Touch: os polegares cobrem um pouco mais do mundo visível — monitorar no
  próximo playtest; se incomodar, um passo de zoom por opção resolve.

## Consequências
- Verificado visualmente no hub e em combate; coop intacto (dezoom por
  spread inalterado).
