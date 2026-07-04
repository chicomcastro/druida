# ADR 0073 — Overworld nublado + água e tendas em blocos (M15.7–8)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Fecho do M15: o usuário aprovou dramatizar o overworld (as referências MCD
são mais pesadas que o nosso dia ensolarado) e converter os dois últimos
elementos "lisos" para o vocabulário de blocos.

## Decisão
- **Nublado MCD (M15.7)**: céu/névoa um degrau mais pesados (backgrounds
  −15%, fogFar −8%), sol −8% e hemisfério −15% nos 4 biomas de dia; topo do
  domo mais profundo (0.5→0.42) e vinheta 0.28. **Os albedos do chão não
  mudaram** — a lição do ADR 0058 (sujeito legível) fica preservada; o drama
  vem da atmosfera, não de escurecer o mundo. Versões purificadas intactas
  (o contraste corrompido→curado aumenta de graça).
- **Lagoa do Vau em blocos d'água (M15.8)**: o disco liso vira uma grade
  instanciada de blocos translúcidos (1 draw call, ~1.1k instâncias) com
  ondulação de altura e valor por célula; o material único continua pulsando
  no `animate` (compat com `_waterRef`).
- **Tendas do Degelo em pirâmide de blocos (M15.8)**: camadas 3×3 → 2×2 → 1
  de pele com trama, capuz de neve em bloco — a última silhueta cônica do
  mundo vira MC.

## Consequências
- M15 completo (8/8). O overworld ganha o peso atmosférico da referência
  sem regredir a legibilidade diurna.
- +1 draw call (água do Vau); tendas ~14 caixas cada (4 tendas).
