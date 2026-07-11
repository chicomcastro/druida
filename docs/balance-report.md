# Relatório de balanceamento (E42)

Gerado com o **simulador sintético** (ADR 0173/0174): o jogador-robô joga cada
cenário e mede TTK, dano causado/sofrido, sobrevivência e vida restante. O
**piso de dificuldade** é o bot `melee` **sem esquiva** (pior caso realista); um
jogador que esquiva ou luta à distância se sai melhor (o "teto").

Reproduzir: `runMatrix(spawnGame, { styles, enemies, counts, levels, seeds })`
em `src/gameplay/simMatrix.ts` (ver `tests/simBalance.test.ts`).

## Metas (pedido do design)
- **Nada trivial**: matar 1 inimigo comum deve **dar trabalho** ("médio").
- **Packs perigosos**: **3 juntos** devem ficar **difíceis**.
- **Existir inimigos duros** de verdade; **média** da roster = "médio".

## Alavancas ajustadas
| Constante | Antes | Depois | Efeito |
|---|--:|--:|---|
| `BALANCE.enemy.hpBase` | 1.0 | **1.4** | inimigos duram mais (mais janelas de dano; packs viram guerra de atrito) |
| `BALANCE.enemy.damageBase` | 1.0 | **1.9** | cada acerto do inimigo dói mais (encarar custa) |
| `BALANCE.player.baseHp` | 130 | **118** | corte leve p/ o combate custar algo |
| `ashwraith.speed` / `onHit.stun` | 3.2 / 0.5 | **2.9 / 0.4** | Espectro deixa de ser incatchável, segue sendo um "dodge-check" |

## Antes × Depois (piso `melee`, nível 1, comuns)
| Cenário | Antes (vida restante) | Depois | Leitura |
|---|--:|--:|---|
| **1 comum** (média) | 90% · *fácil* | **78% · fácil/médio** | agora dá trabalho |
| **3 comuns** (média) | 65% · *médio* | **26% · difícil/brutal** | packs viraram ameaça |

## Depois — por inimigo (piso `melee`, nível 1)
| Inimigo | 1× | 3× |
|---|---|---|
| rotboar (javali) | fácil (87%) | médio (61%) |
| shadecrow (corvo) | fácil (80%) | difícil (40%) |
| fungling (esporo) | médio (77%) | difícil (31%) |
| husk (casca oca) | médio (58%) | **letal** (bruiser em trio) |
| shaman (xamã) | fácil (87%) | **letal** (3 conjuradores à distância) |
| bogbrute (atoladiço) | médio (76%) | brutal (29%) |
| frostfang (presa-gélida) | fácil (81%) | brutal (23%) |
| **ashwraith (espectro)** | **letal** (dodge-check) | **letal** |

## Como ler as notas
- **fácil/médio** num comum solo = alvo atingido ("dá trabalho, não trivial").
- **difícil/brutal** num pack = alvo atingido ("3 juntos perigosos").
- **letal** no PISO (melee sem esquiva) para os inimigos duros (husk/shaman em
  trio, e o Espectro) **não** significa impossível: é o pior caso. Com **esquiva**
  ou **kite** o mesmo cenário é vencido — o Espectro, por exemplo, é `fácil` para
  `melee_dodge` (vence com 100% de vida) e para `ranged`. É intencional: os
  inimigos duros **cobram a mecânica** (esquivar/kitar), como o design pediu.

## Validação com jogador realista (E43)
O piso é o bot que **nunca esquiva**. Para conferir se o tuning vale para um
**jogador médio** (que esquiva parte dos golpes), o `SimPlayer` ganhou o parâmetro
`reaction` (0..1 = chance de esquivar cada telégrafo). Varredura nos comuns
(`melee_dodge`, nível 1, vida restante média):

| `reaction` | 1 inimigo | 3 inimigos | leitura |
|---:|--:|--:|---|
| 0.0 (nunca) | 76% | 22% | = piso do E42 |
| 0.3 | 76% | 29% | quase igual ao piso |
| **0.6 (médio)** | **79%** | **29%** | **difícil em grupo, como o piso** |
| 0.85 | 81% | 50% | começa a aliviar |
| 1.0 (perfeito) | 93% | 75% | jogador impecável trivializa (esperado) |

**Conclusão:** até ~0.6 de reação (jogador médio) a dificuldade é praticamente a
mesma do piso — esquivar só ~60% dos golpes ainda faz absorver quase toda a
punição. Só a esquiva **quase perfeita** (0.85+) alivia de verdade. Ou seja: o
tuning do E42 **não é duro só para o pior caso** — vale para o jogador médio; e
recompensa quem domina a esquiva (o teto), como deve ser num ARPG.

## Caster e Formas Ancestrais (E44)
Além de melee/esquiva/ranged, o simulador agora mede o **caster** e as **formas**:

- **Caster** = kite + dispara o **artefato** do slot 0 além do ataque básico. Rende
  um pouco MAIS de DPS que o ranged puro (ex.: rotboar 39 vs 33; husk 40 vs 38) —
  confirma que o artefato soma dano (e é atribuído ao jogador).
- **Formas** (`runScenario({ form })` concede+ativa a forma; ela se sustenta com a
  seiva que o próprio golpe rende). DPS bruto (melee puro, nível 1, média de 3
  sementes):

  | Forma | DPS rotboar | DPS husk | perfil |
  |---|--:|--:|---|
  | Humanoide (arma inicial) | 30 | 36 | base |
  | **Lobo** | **50** | **59** | cadência rápida → maior DPS sustentado |
  | **Urso** | **42** | **45** | patada pesada + atordoa + 35% de redução (tank) |

  Ambas as formas batem bem mais que a arma inicial — são um upgrade de poder real,
  com papéis distintos (Lobo = DPS móvel; Urso = dano/controle/tanque). Corvo/Sapo
  (formas à distância) ficam para uma próxima fatia.

## Curva por nível / equipamento (E45)
O simulador aceita `levels` — dá para varrer a dificuldade conforme o grupo sobe
de nível (inimigos escalam por `hpPerLevel`/`damagePerLevel`; o jogador ganha
poder pela **arma no tier do nível**, fiel ao MCD: "poder vem do gear, não de
stat bruto de nível"). Medindo o piso (melee sem esquiva/sem armadura):

| Nível | 1 comum | 3 comuns | | 1 comum | 3 comuns |
|---|--:|--:|---|--:|--:|
| | **antes (0.16/0.07)** | | | **depois (0.12/0.05)** | |
| L1 | 76% | 22% | | 76% | 22% |
| L5 | 76% | 19% | | 77% | 23% |
| L10 | 66% | **4%** | | 73% | **10%** |
| L15 | 63% | **4%** | | 68% | **7%** |
| L20 | 75% | 17% | | 85% | 36% |

**Drift encontrado:** matar **1 comum** ficava estável (médio) em toda a curva —
ótimo. Mas um **trio no meio do jogo (L10–15)** virava quase invencível para o
piso (4% de vida): a HP dos inimigos (`hpPerLevel 0.16`, composta) crescia mais
rápido que o poder de arma do jogador, e a luta arrastava até o piso quase morrer.

**Ajuste (design-fiel):** suavizei só as curvas de inimigo — `hpPerLevel
0.16→0.12`, `damagePerLevel 0.07→0.05` (sem stat bruto de vida por nível, que o
design MCD evita). O **L1 fica idêntico** (o termo por nível é 0 no L1, então o
tuning do E42 não muda). O vale L10–15 sobe de 4%→7-10% e o L20 fica em 36%
(médio-difícil). Singles seguem "médio" (68–85%) em toda a curva.

**Nota honesta:** o vale L10–15 do TRIO ainda existe no piso — é o pior caso
(sem esquiva, **sem armadura**, 3 inimigos idênticos de uma vez). Em jogo real, a
**armadura** (mitigação + vida, que escala com o gear) e a **esquiva** enchem
esse vale; fechá-lo por completo pediria mexer também na curva de poder da arma
(`loot.lvlMul`), o que fica para uma próxima fatia. O canary trava o essencial:
1 comum nunca fica trivial (L1–L10) nem vira massacre (qualquer nível).

## Trava de regressão (canary)
`tests/simBalance.test.ts` fixa as faixas: 1 comum não-trivial (vida < 90%) e não
massacrado (> 45%); 3× muito mais duros (delta > 20 pts e vida < 55%); e o
Espectro fatal p/ quem não esquiva, mas vencido por esquiva/kite. Um tuning futuro
que quebre essas faixas falha no CI.

## Próximas fatias
- Medir `caster`/formas (Lobo/Urso) a fundo e afinar as skills.
- Curva por nível/equipamento (o simulador já aceita `levels`); afinar o
  `hpPerLevel`/`damagePerLevel` com a mesma matriz.
- Ajustar a IA de esquiva do bot (hoje esquiva demais → mede o "jogador perfeito").
