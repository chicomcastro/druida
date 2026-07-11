# ADR 0177 — Curva de dificuldade por nível/equipamento (E45)

**Status:** Aceito · **Data:** 2026-07-11

## Contexto
O E42 afinou o balanceamento no **nível 1**. Faltava conferir se a dificuldade se
mantém conforme o grupo **sobe de nível** (inimigos escalam por `hpPerLevel`/
`damagePerLevel`; o jogador ganha poder pela **arma no tier do nível** — fiel ao
MCD: "poder vem do gear, não de stat bruto de nível"). Varrendo o piso (bot melee
sem esquiva/sem armadura) em L1→L20:

- **Matar 1 comum** ficava estável (médio, ~63–76% de vida) em toda a curva — bom.
- Mas um **trio no meio do jogo (L10–15)** virava quase invencível para o piso
  (**~4% de vida restante**): a HP dos inimigos (0.16/nível, composta) crescia
  mais rápido que o poder de arma, a luta arrastava e o piso quase morria.

## Decisão
Suavizar **apenas as curvas de inimigo** — `enemy.hpPerLevel 0.16→0.12` e
`enemy.damagePerLevel 0.07→0.05` — sem introduzir vida-por-nível no jogador (o
design MCD evita stat bruto de nível). Como o termo por nível é **0 no L1**, o
balanceamento do E42 (nível 1) **não muda**. Resultado no piso (comuns, média):

| Nível | 1 comum (antes→depois) | 3 comuns (antes→depois) |
|---|--:|--:|
| L1 | 76 → 76% | 22 → 22% |
| L10 | 66 → 73% | **4 → 10%** |
| L15 | 63 → 68% | **4 → 7%** |
| L20 | 75 → 85% | 17 → 36% |

## Consequências
- O vale mortal do trio no meio do jogo sobe de ~4% para 7–10%, e a curva do
  single fica mais consistente (médio 68–85%) do L1 ao L20.
- **Trava por canary** (`simBalance.test`): 1 comum não fica trivial em L1–L10 nem
  vira massacre em qualquer nível; e os fatores por nível ficam ≤ os novos valores.
- **Honestidade:** o vale L10–15 do TRIO ainda existe no **piso** (pior caso: sem
  esquiva, **sem armadura**, 3 inimigos idênticos). Em jogo real, a **armadura**
  (mitigação + vida, que escalam com o gear) e a **esquiva** enchem esse vale — o
  simulador subestima o jogador por não equipar armadura. Fechar o vale por
  completo pediria mexer também na curva de poder da arma (`loot.lvlMul`).
- 402 testes verdes, `tsc` limpo, `vite build` ok.

## Futuro
Modelar armadura no piso do simulador (medição mais fiel do meio do jogo);
alinhar a curva de poder da arma (`loot.lvlMul`) com a escala de inimigo para
achatar o vale de vez; varrer também esquiva/formas por nível.
