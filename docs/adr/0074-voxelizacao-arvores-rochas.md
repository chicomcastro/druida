# ADR 0074 — Árvores, pinheiros e rochas em blocos (M16.1)

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Playtest 4 (print de referência do MCD): a sensação de "câmera longe" era
na verdade **cenário pequeno e não-cúbico**. No MCD tudo — árvores, copas,
rochas — é feito de cubos alinhados ao grid. Nossas árvores ainda eram
cilindro + icosaedro, pinheiros eram cones e rochas dodecaedros: os últimos
sólidos "orgânicos" do overworld.

## Decisão
- **`voxelGeo.ts`**: helper `mergeBoxes(specs)` funde clusters de
  `BoxGeometry` numa única BufferGeometry — cada pool instanciado continua
  custando 1 draw call.
- **Árvore**: tronco = caixa 0.55², copa = núcleo 2.4³ + 4 cubos satélites
  (silhueta irregular, mas 100% cúbica).
- **Pinheiro**: torre de 4 camadas quadradas decrescentes (a leitura clássica
  de pinheiro em Minecraft), ancorada na base.
- **Rocha**: aglomerado de 3 blocos baixos, ancorado na base (some o "flutuar"
  do dodecaedro centrado).
- **Brotos** (detail): mini-caixas em vez de mini-cones.
- **Carvalho-Mãe**: coluna quadrada com base alargada + copa em 5 blocos
  grandes (7.5³ no núcleo).
- **Rotações**: props e brotos só giram em passos de 90° — nada "torto" no
  mundo, como no grid do MCD.

## Consequências
- Zero draw calls extras; vento por shader continua funcionando (desloca o
  topo de qualquer geometria).
- Colliders inalterados (mesma pegada).
- Escala do cenário (postes/banca jumbo) fica no M16.2; alinhamento das
  construções no M16.3; sweep dos sólidos restantes no M16.4.
