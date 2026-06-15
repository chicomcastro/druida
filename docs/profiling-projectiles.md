# Profiling: object pooling de projéteis é necessário?

**TL;DR: não, hoje não.** A alocação de projéteis no pior caso realista fica
~**100 KB/s**, contra um limiar de pausa de GC na casa de **dezenas de MB/s** —
uma margem de ~200×. O vazamento que existia já foi corrigido (ADR 0015/#16).

Ferramenta: [`scripts/bench-projectiles.mjs`](../scripts/bench-projectiles.mjs)
(`node --expose-gc scripts/bench-projectiles.mjs`). Replica fielmente o que
`createProjectile`/`buildOrb` alocam.

## Medições (Node, V8)

| Métrica | Valor |
|---|---|
| Alocação por projétil (geom + material + mesh + componentes) | **~5.5 KB** |
| Retido após descarte | ~7 B/proj → **sem vazamento** (confirma o cleanup do #16) |
| CPU do ciclo criar+descartar | **~19 µs** (dominado pela construção da geometria) |

### Pressão de GC por cenário (só projéteis)

| Cenário | proj/s | Alocação | CPU |
|---|---|---|---|
| Solo, nível 5 | ~4.6 | 25 KB/s | 0.09 ms/s |
| Coop 4p, nível 10 | ~15 | 84 KB/s | 0.30 ms/s |
| Coop 4p, nível 20 (extremo) | ~18 | 100 KB/s | 0.35 ms/s |

Taxa de spawn derivada das constantes: ataque básico humanoide a cada 0.45s
(~2.2/s/jogador; formas Lobo/Urso/Sapo são corpo-a-corpo) + inimigos ranged
(shadecrow, a cada 1.8s) limitados pelo teto de spawn.

## Veredito

- **Pooling de entidades NÃO é necessário agora.** Economiza ~0.1 MB/s de lixo
  no pior caso — irrelevante para o GC. É invasivo (exige reciclar ids/limpar
  componentes no ECS) para ganho marginal.
- **O risco real não é a taxa média, é o pico em um frame.** Um disparo único
  de muitos projéteis (ex.: uma magia em leque/nova) é o que pesaria: ~50
  projéteis num frame ≈ 1 ms (6% do orçamento de 16.6 ms a 60 fps).

## Quando passaria a valer a pena (gatilhos)

Aja se **qualquer** um ocorrer (e confirme rodando o bench/Profiler do navegador):

1. **Habilidades multi-projétil** (leque, nova, bullet-hell) criando dezenas de
   projéteis por frame — o pico de CPU/criação é o que dói.
2. **Taxa sustentada > ~algumas centenas/s** (alocação cruzando ~poucos MB/s).
   Hoje estamos em ~18/s — seria preciso ~50–200× mais.
3. O Profiler do navegador mostrar **GC (young-gen) como gargalo** ou serrilhado
   correlacionado a combate intenso.

## Alternativa barata (faça ANTES do pooling, se precisar)

Compartilhar a **geometria e o material** dos projéteis (uma instância reusada)
em vez de criar por projétil — medido no bench:

- **−52%** de alocação e **−83%** de CPU por projétil.
- Bônus em WebGL (não medido aqui): evita criar/destruir o buffer de geometria
  na GPU a cada projétil.
- Risco quase nulo (poucas linhas em `buildOrb`/`meshes`), sem mexer no ECS.

Ou seja: a ordem correta é **(1) compartilhar geometria/material** → só depois,
se o profiling ainda apontar, **(2) pooling de entidades**.
