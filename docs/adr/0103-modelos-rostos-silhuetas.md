# ADR 0103 — Polish de arte: rostos dos aldeões + silhuetas próprias

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
Validação visual pós-E9 (screenshots) apontou dois débitos de arte:
1. **Aldeões "sem rosto"**: o capuz cobria os olhos — a aba do capuz renderizava
   à frente/altura dos olhos, ocultando-os; além disso ~1/3 dos comuns + todos
   os anciãos usavam capuz.
2. **Silhuetas repetidas**: os 3 inimigos (E8.3) e 2 bosses (E8.4) reusavam
   malhas existentes (husk/shaman/wolf/rotboar) e a fauna (E8.1) tinha uma
   única silhueta genérica para todas as espécies.

## Decisão
- **Rosto dos aldeões** (`makeVillagerSpec`): a aba do capuz subiu e afinou
  (fica ACIMA dos olhos) e os olhos desceram — **todo aldeão tem rosto**,
  mesmo encapuzado. Novos knobs de variedade: `skin` (tom de pele) e `beard`.
  No `SettlementManager`, capuz caiu para ~1/4 dos comuns e cada morador sorteia
  tom de pele/barba por hash (determinístico — ADR 0081).
- **Silhuetas próprias** (`voxelModels`): specs voxel dedicados —
  - **Atoladiço** (bogbrute): brutamontes corcunda de lodo.
  - **Espectro de Cinza** (ashwraith): esguio, manto que vira fumaça (sem
    pernas), olhos ocos brilhantes.
  - **Presa-Gélida** (frostfang): lobo gélido com crista dorsal e presas.
  - **Senhor do Lodo** (mirelord): colosso pantanoso com núcleo úmido.
  - **Ceifador Gélido** (frostreaver): gigante de gelo com coroa e foice.
  Os defs em `data/enemies.ts` passam a apontar para esses `mesh` (antes
  reusavam husk/shaman/wolf/rotboar). Adicionados à vitrine (SHOWCASE).
- **Fauna** (`FaunaManager._model`): silhueta por espécie — galhadas do cervo,
  orelhas da lebre, chifres+barbicha da cabra, cabeça grande+olhos da coruja,
  asas do corvo/libélula (voa), corpo achatado do sapo.

## Consequências
- A vila lê como gente (rostos visíveis, variedade de pele/barba/capuz) e o
  bestiário/fauna ganha leitura à distância — cada ameaça e cada bicho tem
  forma própria, não só cor. Fecha o débito de "modelos reusados" do E8.
- Sem custo de sistema: continua tudo voxel data-driven; o size subiu ~1 kB.
- Ajustes finos de proporção/pose ficam para iteração futura com playtest.
