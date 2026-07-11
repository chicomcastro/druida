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
