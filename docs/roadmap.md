# 🗺️ Druida — Roadmap de Épicos (E1–E9)

Visão de longo prazo acordada no playtest 8 (2026-07-05). Organiza TODO o
trabalho vindouro em épicos com dependências explícitas, o que roda em
**trabalho autônomo** e onde ficam os **gates de playtest/feedback** do
Chico. Os milestones (M21+) do `backlog.md` são fatias destes épicos.

## Princípios de priorização

1. **Fundações antes de conteúdo**: itens/slots anatômicos vêm antes das
   lojas temáticas que os vendem; UI antes do conteúdo que ela expõe.
2. **Sistemas com parâmetros em data**: tudo que precisa de tuning (combo,
   economia, drops) nasce configurável pra ajustar no gate sem reescrever.
3. **Vila 1 como template**: cada mecânica social/urbana nasce no Círculo
   do Carvalho e replica para as demais vilas com identidade própria.
4. **Sem playtest disponível → gates viram review assíncrono** por
   prints/GIFs; o trabalho autônomo não bloqueia.

## Sequência e gates

```
E1 Itens ──► E2 UI MCD 2.0 ──► [Gate A: legibilidade]
   │             │
   └──► E3 Combate/Combo ──► [Gate B: combate gostoso? tuning sweet spot]
                 │
                 ▼
        E4 Especialização & Skill Tree ──► [Gate C: builds diversos?]
                 │
                 ▼
        E5 Vila 1 viva (interiores) ──► [Gate D: explorar a vila é gameplay?]
                 │
                 ▼
        E6 Side quests & eventos ──► E7 Réplica vilas 2–4
                 │
                 ▼
        E8 Mundo vivo (fauna/inimigos/bosses) ──► [Gate E]
                 │
                 ▼
        E9 Economia & primeira hora ──► [Gate F: jogar 1h inteira]
```

---

## E1 — 💎 Fundação de Itens RPG (100% autônomo)

Tudo o que vem depois (UI, lojas, skill tree, economia) referencia itens.

- Slots **anatômicos**: cabeça, corpo, calça, botas (+ arma + artefatos);
  migração do save (armadura única → 4 peças).
- **Raridades** comum/raro/único com **modificadores que mudam a dinâmica**
  (ex.: "ataques atingem em área", "janela de combo +10%", "forma de urso
  reflete dano"); únicos com nome, lore e efeito exclusivo.
- **Itemização por nível/bioma** (tiers): armaduras condizentes com o nível
  e evolução clara via compra — a base do "ir à loja ficou mais forte".
- **Famílias de arma**: machado, foice, garras (base do E4).
- **Consumíveis** (poções e comidas — base da hotbar e da taverna).

## E2 — 🖥️ UI MCD 2.0 (autônomo → Gate A)

A UI atual não chega na referência do MCD; esta é a versão de verdade.

- **Ícones ilustrados** procedurais (pixel-art via canvas, sem assets
  externos) para itens e habilidades.
- **Cooldown visual** nos slots de habilidade (cortina/varredura radial).
- **Inventário em grade 5×10**.
- **Paperdoll anatômico**: slots de equipamento seguem o corpo do avatar
  (cabeça/corpo/calça/botas + arma).
- **Hotbar 1–9**: equip rápido de habilidades, troca de arma e uso de
  consumíveis; variante compacta no touch.
- **Gate A**: legibilidade desktop + mobile (prints/5 min de jogo).

## E3 — 🎮 Combate: combo bar + game feel (autônomo → Gate B)

- **Barra de conjuração central** no topo: cada habilidade/ataque carrega
  no seu tempo de execução; **sweet spot a 75%** (janela boa 60–90%).
  Acertar = próximo ataque antecipado + bônus de DPS acumulável (contador
  de combo). Errar degrada/interrompe proporcional à distância do sweet
  spot.
- **Game feel**: hit-stop, knockback, telegraphs de inimigos, SFX de
  impacto, shake calibrado.
- Parâmetros todos em data (janelas, multiplicadores) para tunar no Gate B.

## E4 — 🌿 Especialização & Skill Tree (autônomo → Gate C)

- **Proficiência por uso**: XP de arma (machado/foice/garras) e de cada
  forma animal — quanto mais usa, mais especializa.
- **Árvores por especialização** (3 armas + 3 formas) com nós que abrem
  leques de gameplay; pontos por nível/proficiência; respec na Guardiã.
- Sinergias com modificadores de itens (E1) = builds.

## E5 — 🗺️📖 Vila 1 viva: interiores com propósito (autônomo → Gate D)

- **Tech de interiores**: micro-instâncias (mesmo pipeline da masmorra —
  entrar pela porta → interior dedicado; controlável na isométrica).
- **Casas temáticas, cada uma com NPC responsável**: mercado geral (o
  mercador vai pra DENTRO), armeiro, armaduraria, **taverna** (comida =
  buffs, quarto = descanso/save/pular noite), casa da liderança, salão
  comunal, moradias de NPCs genéricos.
- **Camada social**: 2 famílias/clãs com rixa — diálogos que se
  referenciam, segredos no codex, hooks de quest. A vila explorável como
  gameplay por si só.
- **Gate D**: explorar a vila diverte sem combate?

## E6 — 📖 Side quests & eventos de mid-game (autônomo)

- **Sistema de triggers/condições**: visitou N vilas, falou com X, carrega
  item Y, despertou habilidade Z, hora do dia.
- **3–5 sides por vila**: coleta, exploração do mundo, uso de habilidades,
  **inter-vilas** (encomendas/cartas entre NPCs que já se citam nas falas).
- Quests da rixa da vila 1 (E5) como arco-piloto.

## E7 — 🗺️ Réplica: vilas 2–4 vivas (autônomo)

- **Novos formatos de casa por tema** (palafita com anexo, cabana comprida
  de lenhador, tenda-grande do Degelo) e estruturação completa
  (liderança/salão/taverna/lojas) em cada vila.
- Interiores, famílias e sides replicados com identidade própria.

## E8 — 🤖 Mundo vivo: fauna, hazards, inimigos, bosses (autônomo → Gate E)

- **Fauna por bioma** (cervos/lebres na Clareira, sapos/libélulas no
  Pântano, corvos no Bosque, cabras/corujas nos Picos): vagueiam, fogem,
  reagem ao jogador.
- **Hazards jogáveis** por bioma (lodo que prende, gelo que desliza, cinza
  que cega).
- **+3 inimigos** com comportamentos novos; **+2 bosses** (meio de jogo +
  variação por bioma).

## E9 — 💎🚀 Economia, progressão & primeira hora (contínuo → Gate F)

- Tuning com telemetria (ADR 0051): curva de XP, drops, preços por tier —
  sustentando o pilar "evoluir comprando".
- Onboarding revisado; **Gate F**: playtest da primeira hora inteira.

---

## Status

| Épico | Estado | Gate |
|---|---|---|
| E1 Itens RPG | ✅ entregue | — |
| E2 UI MCD 2.0 | ✅ entregue | Gate A |
| E3 Combate/Combo | ✅ entregue | Gate B |
| E4 Skill Tree | ✅ entregue | Gate C |
| E5 Vila 1 viva | ✅ entregue (interiores + rixa das famílias) | Gate D |
| E6 Side quests | ✅ entregue (motor de triggers + 3 arcos) | — |
| E7 Vilas 2–4 | ✅ entregue (interiores nas 4 vilas + mercado geral) | — |
| E8 Mundo vivo | ✅ entregue (fauna + hazards + 3 inimigos + 2 bosses) | Gate E |
| E9 Economia/1ª hora | 🚧 instrumentado (funil de telemetria); tuning aguarda Gate F | Gate F |
| E10 Santuário do Lobo | ✅ entregue (Lobo = 1ª forma, na Clareira + Dons) — ADR 0106 | — |
| E11 Rixa nas vilas 2–4 | ✅ entregue (famílias + arco em todas as vilas — ADR 0107; reputação por vila com desconto — ADR 0108) | — |
| E12 Wiki ilustrada | ✅ entregue (fotos de formas/inimigos/chefes/vila/mapa na wiki — ADR 0112) | — |
| E13 Missões/campanha | ✅ entregue (descrições de contexto por passo no HUD — ADR 0114) | — |
| E14 Mapa-mundi das vilas | ✅ entregue (legenda de biomas com nível + vilas em losango vs santuários em círculo — ADR 0117) | — |
| E15 Vilas evoluídas | 🚧 Clareira recentrada na Carvalho-Mãe (2 anéis + via em anel — ADR 0111); cenário sólido + banca fora das ruas (ADR 0113); postes atrelados aos caminhos + mercado como casa (ADR 0115); lanternas direcionais + postes nas artérias + fix de colisão de props (ADR 0116); postes ladeando os caminhos, luz p/ a rua, longe das casas (ADR 0120); moradores passivos dando vida às 4 vilas (ADR 0121); lanternas das vilas 2–4 ao centro (ADR 0122); postos de trabalho com trabalhador nas vilas 2–4 (ADR 0123) | — |
| E16 Mundo orgânico + progressão aberta | ✅ entregue (E16.1 mapa orgânico — ADR 0109; E16.2 level-scaling + marcos nas regiões + Clareira maior/vilas ao interior — ADR 0110; E16.3 santuários afastados das cidades, jornada como escolha — ADR 0118; E16.4 biomas maiores + cidades ao centro — ADR 0119) | — |
| E17 Hotbar 1–9 + skills | ✅ concluído (E17.1 fundação: árvore de skills ativas — data model + desbloqueio — ADR 0124; E17.2 UI da árvore no painel de Talentos — ADR 0125; E17.3a modelo da hotbar 1–9 — ADR 0126; E17.3b input+HUD+atribuição: teclas 1–4 conjuram skills, 5–9 formas, botões de slot no painel — ADR 0129; E17.4 VFX de conjuração por ramo (assinatura visual por elemento) — ADR 0130; E17.5 hotbar unificado 1–9: formas + skills numa fileira só, skills nos slots livres, sem quebrar save — ADR 0131) | ✅ |
| E18 Hotbar totalmente livre | ✅ concluído (E18.1 modelo de entradas tipadas — skill/forma/poção/equip em qualquer slot, migração de save, formas semeadas mas remapeáveis, HUD por tipo, atribuição de skill/forma no painel — ADR 0132; E18.2 atribuir equipamento/poção pelo inventário (hover + 1–9) + troca de equipamento por tecla com swap-back + prune — ADR 0133; E18.3 comida & buffs temporários (dano/velocidade/defesa) com HUD de buff e drop no mundo — ADR 0134) | ✅ |
| E19 Culinária & Craft | ✅ concluído (E19.1 fundação: despensa de ingredientes empilháveis + receitas + nível de Craft + buffs/despensa/craft salvos + ícones certos na hotbar + monstros dropam ingredientes no lugar de comida pronta — ADR 0135; E19.2 bancada de cozinha: caldeirão na praça + painel de craft (have/need, lock por nível, despensa) + cozinhar consome/dá XP/gera comida — ADR 0136; E19.3 forrageamento: nós de coleta por bioma espalhados no mapa (colher com E, respawn) — ADR 0137; E19.4 mercador vende ingredientes e comida — ADR 0138; E19.5 loja: ícone dedicado de comida + venda de ingredientes da despensa — ADR 0139; E19.6 Salão Comunal: caldeirão saiu da praça e passou a viver dentro da taverna e do salão comunal — ADR 0140) | ✅ |
| E20 Plantação | ✅ entregue (E20.1 fundação: culturas plantáveis (erva/cenoura/cogumelo) + sementes na despensa + canteiros com plantar/crescer/colher, funções puras salvas no progresso — ADR 0141; E20.2 canteiros interativos na praça da Clareira + painel de plantio/colheita + crescimento visual broto→fruto — ADR 0142; E20.3 sementes à venda no mercador, fechando o ciclo comprar→semear→crescer→colher — ADR 0143) | — |
| E21 Mercadores especializados + sementes no drop | ✅ entregue (E21.1 sementes no forrageamento: chance de dropar a semente da cultura ao colher no mundo — ADR 0144; E21.2 mercadores especializados (armeiro/armadureiro só equipamento; categorias food/garden/general) + cozinheiro na taverna vendendo comida — ADR 0145; E21.3 jardineiro numa casa própria vendendo sementes em cada uma das 4 vilas (4ª cabana no lenhadores) — ADR 0146)) | — |
| E22 Vila viva (moradia + rotina) | 🚧 E22.1 rotina de dia/noite por arquétipo (trabalho/passeio/casa) + almoço e reunião ao entardecer no salão comunal + variação diária (vila nunca igual) — ADR 0147; E22.2 famílias/gênero/lares: moradores agrupados em famílias (casal + eventual filho) que dividem um lar, com gênero visível; a rotina gira em torno da casa da família — ADR 0148; E22.3 casas de família na Clareira: +3 moradias no anel externo e famílias ancoradas a casas reais (10/10 moradores com casa) — ADR 0149; E22.4 casa pra todo mundo nas vilas 2–4: famílias ancoradas às próprias construções (palafitas/cabanas/tendas) — 35/35 moradores com casa — ADR 0150; a seguir: aldeões conversando entre si (E22.5) | — |
