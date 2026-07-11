# ADR 0178 — Armadura no piso do simulador + veredito da curva de arma (E49/E50)

**Status:** Aceito · **Data:** 2026-07-11

## Contexto
O E45 achou um **vale de dificuldade** no meio do jogo: um trio de comuns a L10–15
quase dizimava o **piso** (bot melee sem esquiva). Mas o piso lutava **pelado** —
só arma, nenhuma armadura. Como no MCD "poder vem do gear", a armadura (mitigação
+ vida que escalam com o tier) faz parte do poder do jogador; ignorá-la
**subestima** o jogador justo onde o gear mais importa.

Duas fatias candidatas: **E49** (modelar armadura no piso — medição fiel) e **E50**
(mexer no `loot.lvlMul`, a curva de poder da arma, para achatar o vale).

## Decisão
1. **E49 — armadura no simulador.** `equipArmorSet(game, id, level)` veste um set
   completo (4 peças) no tier do nível, e `runScenario/runMatrix` ganham
   `armor?: boolean`. Rarity fixa **`common`** (o gear mais fraco) para uma
   medição determinística e **conservadora**.
2. **E50 — descartada (não-op).** Medindo o trio (comuns, média) com o piso
   vestido:

   | Nível | pelado | com armadura (common) |
   |---|--:|--:|
   | L10 | **10%** | **60%** |
   | L15 | **7%** | **64%** |
   | L20 | 36% | 69% |

   Com **até a armadura mais fraca**, o vale **some** (trio médio/difícil, 50–69%,
   em toda a curva). O vale era **artefato de medição**, não desbalanceamento — a
   curva de poder do gear já casa com a escala de inimigo. Mexer no `loot.lvlMul`
   seria **churn de balance sem motivo**, então **não** foi feito.

## Consequências
- O simulador agora mede o piso "com gear" (fiel) e o "pelado" (pior caso, sem
  gear) — os dois extremos úteis. Confirma que o jogo é bem balanceado do L1 ao
  L20 quando o jogador está equipado.
- **Nenhuma mudança de balance** (`balance.ts`/`loot.ts` intactos) — só capacidade
  de medição no `simMatrix.ts`.
- Travado por canary (`simBalance.test`): com armadura o trio no vale (L10/L15)
  fica bem acima do pelado (> +15 pts) e deixa de ser quase-wipe (> 30%).
- 406 testes verdes, `tsc` limpo, `vite build` ok.

## Futuro
Varrer o piso "com gear" por estilo/forma; modelar afixos de armadura (Vitalidade/
Baluarte) e dons para uma medição ainda mais fiel do endgame.
