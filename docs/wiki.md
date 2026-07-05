# 🌿 Druida — Wiki do Jogo

> **Fonte da verdade viva.** Este documento consolida tudo que existe no jogo
> hoje para iterar em cima do desenvolvimento. Quando o conteúdo é gerado por
> dados, o arquivo-fonte está indicado — mexer lá muda o jogo. Decisões de
> design têm um ADR ligado (ver `docs/adr/`). Última revisão: 2026-07-05.
>
> Mapa de fontes: biomas `src/data/biomes.ts` · vilas `src/data/settlements.ts`
> · interiores `src/data/interiors.ts` · famílias `src/data/families.ts` ·
> formas `src/gameplay/forms.ts` · inimigos/bosses `src/data/enemies.ts` ·
> hazards `src/data/hazards.ts` · fauna `src/data/fauna.ts` · itens
> `src/gameplay/loot.ts`+`modifiers.ts` · skills `src/gameplay/skills.ts` ·
> quests `src/data/sidequests.ts` · combo `src/gameplay/combo.ts` · lore
> `src/data/lore.ts` · campanha `src/gameplay/story.ts`.

## Índice
1. [Pilares & visão](#1-pilares--visão)
2. [Controles](#2-controles)
3. [Mundo & biomas](#3-mundo--biomas)
4. [Vilas](#4-vilas)
5. [Interiores das casas](#5-interiores-das-casas)
6. [Formas ancestrais](#6-formas-ancestrais)
7. [Combate](#7-combate)
8. [Especialização & skill tree](#8-especialização--skill-tree)
9. [Itens & equipamento](#9-itens--equipamento)
10. [Inimigos, elites, hazards & fauna](#10-inimigos-elites-hazards--fauna)
11. [Chefes & masmorras](#11-chefes--masmorras)
12. [Quests & campanha](#12-quests--campanha)
13. [Economia & progressão](#13-economia--progressão)
14. [Save & telemetria](#14-save--telemetria)
15. [Lacunas conhecidas](#15-lacunas-conhecidas)

---

## 1. Pilares & visão
ARPG isométrico coop-local, estilo **Minecraft Dungeons** (voxel, câmera
próxima). Você é o **Druida**: luta com arma equipada + magias, e **assume
formas ancestrais** (lobo/urso/corvo/sapo). O poder vem do **equipamento**
("evoluir comprando/saqueando"), não de stats brutos de nível. Objetivo da
campanha: purificar os biomas e derrotar O Apodrecedor. Ver `docs/game-design.md`.

## 2. Controles
WASD mover (o herói olha para onde anda) · **J/clique** atacar · **Shift**
esquivar (i-frames) · **5–9** trocar de forma · **U/I/O** artefatos/dons ·
**Q/4** poções (cinto) · **B/Tab** mochila · **K** talentos · **E** interagir ·
**M** mapa · **T** voltar ao Carvalho · **Esc/P** pausar. Rebind em Pausa →
Controles. Suporte a toque (tablet) e gamepad no P1.

## 3. Mundo & biomas
Fonte: `src/data/biomes.ts` · anéis em `src/world/WorldManager.ts`. O mundo é
concêntrico no eixo −Z; cada anel é um bioma com nível recomendado (define o
item level dos drops) e uma vila.

| Bioma | Chave | Nível | Raio até | Clima/assinatura |
|---|---|---|---|---|
| Clareira Viva | `clareira` | 1 | 55 | verde, vagalumes; vila-hub |
| Pântano Apodrecido | `pantano` | 3 | 110 | lodo, esporos |
| Bosque Cinza | `bosque_cinza` | 5 | 165 | cinza, brasas |
| Picos Gélidos | `picos` | 7 | 220 | neve, gelo |
| Coração Corrompido | `coracao` | 9 | ∞ | podridão roxa; sem fauna |

Cada bioma tem: tabela de spawn + packs (ADR 0045), **hazard** ambiental
(§10), **fauna** (§10), clima dia/noite (ADR 0049), purificação visível ao
avançar a campanha (ADR 0044) e uma **masmorra** temática (§11).

## 4. Vilas
Fonte: `src/data/settlements.ts` · geometria `src/world/SettlementManager.ts`.
Quatro vilas, uma por bioma habitável, com **formato de casa próprio**, mercador
regional (estoque próprio), moradores com falas e **portas entráveis** (§5).

| Vila | Tema | Bioma | Formato de casa | Assinatura |
|---|---|---|---|---|
| Círculo do Carvalho (hub) | `druida` | Clareira | casa de viga, telhado vivo | Carvalho-Mãe + fogueira |
| Vau das Palafitas | `palafitas` | Pântano | palafita sobre estacas | píer de pesca + lagoa |
| Cinzafolha | `lenhadores` | Bosque Cinza | cabana de tronco | paliçada + torre de vigia + serraria |
| Abrigo do Degelo | `degelo` | Picos | tenda de pele | cairns + muro de gelo + chama azul |

**Moradores** (ADR 0081): modelo voxel variado por hash (túnica, capuz, cabelo,
avental, mochila, **tom de pele e barba** — ADR 0103). Anciãos usam capa/cajado
e dão a missão da vila (§12). Todo morador tem rosto (capuz não cobre mais os
olhos — ADR 0103).

**Camada social — só na Clareira** (ADR 0095): duas famílias em rixa —
**Fenwick** (a forja) × **Aldren** (os campos). Falas cruzadas + 3 fragmentos
de codex (l13–l15) revelados ao conversar; arco resolvido pela quest "O Nó de
Duas Cordas" (§12). As outras vilas ainda não têm família própria (§15).

## 5. Interiores das casas
Fonte: `src/data/interiors.ts` · `src/world/InteriorManager.ts` (ADR 0094/0104).
Entrar por uma porta abre uma **micro-instância** (mesma técnica da masmorra):
sala fechada, clima escuro selado, **móveis temáticos** e um NPC responsável.

| Tema | Serviço | NPC (Clareira) | Móveis | Notas |
|---|---|---|---|---|
| `weapons` | loja (só armas) | Brida Fenwick | balcão, prateleiras, **bigorna/forja** | exclusivo da Clareira |
| `armor` | loja (só armaduras) | Orin Aldren | balcão, prateleiras, engradados | exclusivo da Clareira |
| `market` | loja geral | Mercador | balcão, prateleiras | vilas 2–4 |
| `tavern` | descanso | Vesna | mesas, banquetas, barris, **lareira** | cura + refeição (buff) |
| `leader` | diálogo | Anciã Maroa | tapete, cadeira, estante, estandarte | segredo/pista da rixa |
| `hall` | diálogo | Tovar, o Cronista | idem | codex da rixa |
| `home` | diálogo | Morador | genérico | moradias |

**Distribuição por vila** (ADR 0097): Clareira = weapons, armor, tavern, leader,
hall + 4 casas `home`. Vilas 2–4 = market, tavern, leader, home. **Armeiro/
armaduraria e a rixa são assinatura exclusiva da Clareira.**

**Taverna** (ADR 0094): descansar cura o grupo, passa a noite e **salva**; a
refeição dá **+12% de dano por 120s** ("bem alimentado").

## 6. Formas ancestrais
Fonte: `src/gameplay/forms.ts`. O Druida troca de forma (teclas 5–9). Cada forma
muda velocidade, cadência e o ataque básico. Modelos voxel em
`src/entities/voxelModels.ts`.

| Forma | Tecla | Vel. | Cadência (s) | Ataque | Modelo |
|---|---|---|---|---|---|
| Druida (humanoid) | — | 1.0 | 0.45 | magia/arma equipada | herói com capuz (tem rosto — ADR 0105) |
| Lobo (`wolf`) | 5 | **1.5** | 0.32 | mordida | quadrúpede: focinho, orelhas, crista, cauda |
| Urso (`bear`) | 6 | 0.8 | 0.70 | patada | quadrúpede robusto: orelhas redondas |
| Corvo (`raven`) | 7 | **1.8** | 0.40 | bicada | ave: asas, bico |
| Sapo (`frog`) | 8 | 1.1 | 0.55 | língua | anfíbio agachado: olhos saltados |

**Critério de desbloqueio** (ADR 0050 · `src/gameplay/story.ts`): despertar o
**Santuário** da forma, no bioma correspondente, no passo certo da campanha —
cada santuário também concede um **Dom** (escolha de 1 de 2 passivas):

| Forma | Santuário em | Passo da campanha | Dons |
|---|---|---|---|
| **Lobo** | **Clareira (z −40)** | `find_wolf` | Sede de Sangue (cura ao abater) / Instinto de Caça (+10% dano) |
| Urso | Pântano (z −82) | `find_bear` | Casca de Carvalho (+vida) / Pelagem de Espinhos (reflete) |
| Corvo | Bosque Cinza (z −138) | `find_raven` | Asas do Vento (+vel) / Presságio (+i-frames) |
| Sapo | Picos (z −192) | `find_frog` | Orvalho Eterno (+seiva) / Pele Úmida (cura ao trocar) |

O **Lobo é a primeira Forma Ancestral** (ADR 0106): seu santuário fica na própria
Clareira e desperta logo após purificar a região — é a introdução ao sistema de
Dons. As formas **não são conteúdo das vilas** — são recompensas de santuários no
mundo aberto, na trilha da campanha (um por bioma). Modelos: serviçáveis e no
padrão MCD; lobo/urso são os mais legíveis, corvo/sapo mais simples.

## 7. Combate
- **Combo por timing** (ADR 0092 · `combo.ts`): cada golpe enche uma barra
  0→1; apertar de novo no **sweet spot 0.75** (janela 0.60–0.90) encadeia antes
  do fim → +DPS e **+12% de dano por stack** (teto 8). Fora da janela quebra o
  combo e adiciona recuperação. Talentos de "ritmo" alargam a janela.
- **Esquiva** (Shift): roll com i-frames (~0.3s, +50% com Presságio).
- **Telegrafo do inimigo** (ADR 0092): golpe melee tem windup com anel de aviso;
  erra se você sair do alcance — recompensa a esquiva. Novos inimigos aplicam
  **status no golpe** (§10).
- Game feel: hit-stop + screen shake ao encadear.

## 8. Especialização & skill tree
Fonte: `src/gameplay/skills.ts` (ADR 0093). Duas fontes de progressão além do
nível: **proficiência por uso** (cada golpe conta para a trilha da arma/forma
ativa) e **1 ponto de talento por nível**. Tela: **K**.

- **Trilhas por arma**: Machado, Foice, Garras, Cajado.
- **Trilhas por forma**: Lobo, Urso, Corvo, Sapo.
- Nós dão `dmg` / `atkSpeed` / `combo` (janela) / `range` / `formDur` / `dr`,
  com pré-requisitos encadeados. **Bônus só valem com a arma/forma
  correspondente ativa** — força builds coerentes.
- **Respec grátis** (na tela; pensado para a Guardiã).

## 9. Itens & equipamento
Fonte: `src/gameplay/loot.ts`, `modifiers.ts`, `equip.ts` (ADR 0087/0088).
Inventário 5×10; **paperdoll anatômico**; ícones ilustrados (ADR 0090).

- **Tipos**: arma, armadura, artefato (dom), consumível.
- **Slots de armadura**: elmo (`head`), peito (`body`), calças (`legs`), botas
  (`boots`).
- **Famílias de arma**: machado (`axe`), foice (`scythe`), garras (`claws`),
  cajado (`staff`) — ligam à skill tree.
- **Raridades**: comum (0 mods) · raro (1) · único (2), cada uma com cor e
  multiplicador.
- **Modificadores** (afixos de gameplay): armas — Potência (+dano), Roubo de
  Vida, Talho (cleave), Ímpeto; armaduras — Baluarte (mitigação), Vitalidade,
  Ligeireza, Espinhos; artefatos — Manancial, Eco.
- **Encantamentos**: pontos de encanto sobem níveis de encanto do item.
- **Consumíveis** (ADR 0089): Seiva Vital (cura 40) e Densa (cura 90), Seiva de
  poder; **cinto rápido** Q/4 (ADR 0091). Desmontar itens dá essência.

## 10. Inimigos, elites, hazards & fauna
**Inimigos** (`src/data/enemies.ts`):

| Chave | Nome | Comportamento | Efeito | Onde |
|---|---|---|---|---|
| `rotboar` | Javali Apodrecido | melee | — | Clareira+ |
| `fungling` | Fungo Explosivo | exploder | — | Clareira+ |
| `shadecrow` | Corvo-Sombra | ranged | — | Pântano+ |
| `husk` | Casca Oca | melee tanque | — | Pântano+ |
| `shaman` | Xamã Corrompido | summoner | invoca | Pântano+ |
| `bogbrute` | Atoladiço | melee | **veneno** | Pântano |
| `ashwraith` | Espectro de Cinza | melee veloz | **atordoa** | Bosque Cinza |
| `frostfang` | Presa-Gélida | melee matilha | **congela** | Picos |

**Elites** (ADR 0045): qualquer comum pode ser promovido — Veloz, Pétreo,
Volátil (explode), Sanguessuga (leech). Corpo maior + gema + recompensa maior.

**Hazards ambientais** (`src/data/hazards.ts`, ADR 0099) — zona telegrafada
periódica fora das vilas: Pântano **lodo/root** · Bosque **cinza/atordoa** ·
Picos **gelo/congela** · Coração **chão/queima**. Clareira é segura.

**Fauna** (`src/data/fauna.ts`, ADR 0098/0103) — bichos inofensivos que
vagueiam e fogem: Clareira cervo+lebre · Pântano sapo+libélula · Bosque corvo ·
Picos cabra+coruja · Coração nenhum. Silhueta própria por espécie.

## 11. Chefes & masmorras
**Chefes** (`src/data/enemies.ts`, ADR 0101) — fases por % de vida, slam em
área, invocações (via `bossSystem`):
- **O Apodrecedor** (`rotlord`) — chefe final da campanha (Coração).
- **Senhor do Lodo** (`mirelord`) — invoca Atoladiços; clímax da masmorra do
  Pântano.
- **Ceifador Gélido** (`frostreaver`) — congela, foice de gelo; clímax da
  masmorra dos Picos.

**Masmorras** (`src/data/dungeons.ts`, ADR 0048) — POI instanciado por bioma:
ondas + perigo ambiental + mini-chefe (ou chefe pleno no Pântano/Picos) e
recompensa garantida (Único na 1ª limpeza). 5 temas (um por bioma).

## 12. Quests & campanha
**Campanha** (`src/gameplay/story.ts`) — 9 passos: falar com a Guardiã →
purificar a Clareira (8 abates) → **Santuário do Lobo (Clareira)** → Santuário do
Urso (Pântano) → Árvore-Carniça → Santuário do Corvo (Bosque) → Santuário do Sapo
(Picos) → Coração → vitória.

**Missões de vila** (ADR 0047) — o ancião de cada vila dá uma missão temática
(coletar/caçar/elite) por essência + artefato único.

**Side quests por trigger** (`src/data/sidequests.ts`, ADR 0096):
- **O Nó de Duas Cordas** — desbloqueia ao descobrir o segredo (l14); encadeia
  forja → campos → liderança (inter-NPC); resolve a rixa.
- **Pele Emprestada** — desperte uma forma → mostre ao cronista.
- **Pés de Estrada** — visite 2+ vilas → descanse na taverna (inter-vilas).

## 13. Economia & progressão
Fonte: `src/gameplay/economy.ts` (ADR 0104), `progression.ts`.
- **Essência** = moeda do grupo (drops + desmontar). **Loja**: 5 equipamentos +
  2 poções por mercador (estoque próprio por vila); renovar por 5✦. Preço-base
  comum 12 / raro 30 / único 70, escalando com o nível da região. Lojas de
  interior têm **viés** (armeiro só armas, armaduraria só peças).
- **Progressão de grupo**: XP compartilhado; subir de nível dá pontos de encanto
  (a todos) + 1 ponto de talento. `xpForLevel = base·nível^exp` (ver
  `data/balance.ts`).
- **Tuning numérico** (curva de XP, drops, preços) é **pendente do Gate F** —
  playtest da primeira hora (§14).

## 14. Save & telemetria
- **Save** (`src/gameplay/save.ts`): IndexedDB; autosave em eventos-chave
  (levelUp, formUnlocked, questCompleted, rested, …). Persiste progresso, formas,
  dons, talentos, quests, side quests, fog, baú, lore.
- **Telemetria local** (ADR 0051/0102): contadores agregados só no navegador,
  opt-out, exporta JSON na pausa. **Funil da 1ª hora**: essência ganha×gasta,
  itens comprados, níveis, vilas/interiores/descansos, e marcos
  (`firstKill/Level/Purchase/Down/QuestAt`). É o que embasa o tuning do Gate F.

## 15. Lacunas conhecidas
- ~~**Forma Lobo sem desbloqueio**~~ ✅ **Resolvido (ADR 0106)**: o Santuário do
  Lobo agora fica na Clareira e é a 1ª Forma Ancestral da campanha, com Dons
  próprios (Sede de Sangue / Instinto de Caça).
- **Famílias/rixa só na Clareira**: vilas 2–4 têm interiores mas não têm
  família/arco social próprios (candidato a expansão de dados).
- **Modelos**: formas e fauna são serviçáveis mas sem animação própria além do
  gait; interiores mobiliados mas sem variação por vila.
- **Tuning numérico**: preços/curva/drops aguardam o playtest (Gate F).
- **Gates de playtest A–F**: legibilidade, combate, builds, vila, mundo,
  primeira hora — todos dependem de jogo real (ver `docs/roadmap.md`).
