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
| E8 Mundo vivo | ⏳ | Gate E |
| E9 Economia/1ª hora | ⏳ | Gate F |
