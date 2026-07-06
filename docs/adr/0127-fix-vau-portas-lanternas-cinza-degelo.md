# ADR 0127 — Fix: portas do Vau + lanternas do Vau/Cinza/Degelo

**Status:** Aceito · **Data:** 2026-07-06

## Contexto
Playtest apontou três problemas de cenário nas vilas 2–4:
1. **Vau**: as placas de porta (`_houseDoor`) flutuavam **fora da casa**, sobre a
   água — estavam a `3.0u` à frente do deck 5×5 (meio metro além da borda).
2. **Vau**: as lanternas caíam **no meio das passarelas**.
3. **Cinzafolha e Degelo**: quase não havia **postes de iluminação** visíveis —
   Cinza só tinha 2 nas quinas (fora de vista) e o Degelo, nenhum.

## Decisão
- **Porta do Vau na frente do deck**: o marcador foi de `3.0u` → `2.0u` à frente,
  caindo **sobre a plataforma sólida**, junto à cabine (não mais sobre a água).
- **Lanternas do Vau no canto do deck**: uma por palafita, empurrada `1.8u` para
  o canto **externo** do próprio deck (plataforma sólida, fora das passarelas),
  luz voltada ao centro.
- **Cinzafolha**: 4 postes de brasa ladeando a praça/corredor (além dos 2 de
  quina), luz ao centro — agora visíveis de onde o jogador chega.
- **Degelo**: 4 postes de gelo ao redor da chama azul (antes não tinha nenhum).

## Consequências
- As 4 vilas ficam com iluminação legível e sem props sobre os caminhos/água.
- Padrão do Vau (poste no canto do deck) respeita a natureza sobre estacas da
  vila, sem tentar "ladear" passarelas estreitas.
- Verificado nas 3 vilas por print; `footprints.test` verde.
