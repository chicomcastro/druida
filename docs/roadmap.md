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
| E39 Chefes não-humanoides | ✅ os três chefes de bioma ganham modelos e animações próprios, menos humanoides: O Apodrecedor (tronco arraigado sobre raízes que se contorcem, andadura `rooted`), Senhor do Lodo (massa de lodo que se ondula, `ooze`) e Ceifador Gélido (espectro que paira com cauda de névoa e cacos orbitando, `floating`) — sem quebrar dados/combate; wiki re-ilustrada — ADR 0172 | — |
| E38 Vila viva nas demais vilas | ✅ Vau, Cinzafolha e Degelo ganham moradia por-casa (fecha o gap do E36): lares entráveis no vocabulário de cada vila (palafitas-lar, cabanas-lar, tendas-lar), temas de interior *_home com paleta/formato próprios por vila, famílias ancoradas a cada lar (household 1:1) e mais moradores nomeados — o cronograma recolhe cada morador na SUA casa em qualquer vila — ADR 0171 | — |
| E37 Ermos: cenários únicos + eremitas + caçadas | ✅ spots isolados no ermo (torre, cemitério, estátua, pedras eretas, marco da romaria) com placa; eremitas com rotina; caçadas exploratórias (expurgar N do bicho local) com recompensa ÚNICA nomeada (arma/armadura/artefato lendário); persiste no save — ADR 0170. Próximas fatias: coletar/usar-poder, recompensa em skill, mais spots | — |
| E36 Moradia por-casa | ✅ cada porta 'home' vira um recinto próprio (id único + família); o morador vai à SUA casa (homeVenueId) no cronograma; entrar numa porta mostra exatamente aquela família (Clareira: 6 moradias distintas) — ADR 0169 | — |
| E35 Interiores dimensionados por tema | ✅ cada tema tem tamanho/formato próprio (moradia 6×6 aconchegante, taverna 9×8, salão 10×9, lojas variadas) — salas retangulares refeitas por visita, props/luzes escalam, sem prender o jogador; luzes limpas na saída (LightPool.truncate) — ADR 0168 | — |
| E34 Cronograma determinístico dos NPCs | ✅ cada morador tem LUGAR por hora do jogo (função pura), independente do jogador: num horário está num recinto só (nunca em dois), sair/voltar acha a mesma pessoa, varia por dia; entra caminhando pela porta e o cronograma o tira pela porta na hora certa; o interior mostra exatamente quem o cronograma pôs ali — ADR 0167 | — |
| E33 Saída de interior pela porta | ✅ quem sai de um interior EMERGE na porta externa (escalonado, com dispersão) e retoma a rotina andando pela cidade — fim do "reaparece num ponto aleatório"; vale pro rodízio e pra saída do jogador — ADR 0166 | — |
| E32 Interior integrado à vila | ✅ os que estão dentro são MORADORES REAIS da vila (mesma entidade do overworld, recolhida por check-out → nunca em dois lugares), escolhidos pela rotina; vida dentro (gesto de comer/beber/servir + rodízio: gente sai pela porta, chega gente nova); decoração também varia por tipo de casa — ADR 0165 | — |
| E31 Interiores vivos e mobiliados | ✅ móveis fartos (mesas com assado/pão/canecas, quadros, jarros, tapete, planta, estandarte); Salão Comunal vira banquete; interiores povoados por moradores REAIS da vila (nomes do elenco + paleta da vila) comendo/servindo; NPCs encaram a câmera (fim do "sem olhos") — ADR 0164 | — |
| E30 Polish: olhos, rua explícita, deco de interior | ✅ olhos nas formas Lobo/Urso/Corvo; aldeões andam pelas ruas (streetForce puxa para a laje mais próxima); interiores com decoração da vila de origem (Vau pesca, Cinzafolha toras, Degelo peles, Clareira ervas) — ADR 0163 | — |
| E29 Correções do playtest | ✅ jogador começa só humanoide (Lobo vem do santuário); interior deixa de prender (colisores de parede como fileira, não círculo gigante); proficiência só ao acertar (não no golpe ao ar); botão "Menu inicial" na pausa — ADR 0162 | — |
| E28 Wiki 100% ilustrada | ✅ hazards ilustrados (anel telegrafado de cada bioma: lodo/cinza/gelo/carne) — 4 imagens; a wiki agora ilustra TODA entidade citada — ADR 0161 | — |
| E27 Wiki ilustrada, lote 2 | 🚧 biomas (5 close-ups), interiores (6), armas (tabela das 9 + galeria de modelos) e skills (painel de Talentos) ilustrados na wiki — 15 imagens novas; falta só os hazards — ADR 0160 | — |
| E26 Wiki ilustrada por entidade | 🚧 galerias de foto para toda entidade citada na wiki: 4 vilas, 8 inimigos, 3 chefes, 7 fauna, 4 NPCs (+ formas/mapa que já existiam) — 20 imagens novas; fauna extraída para `buildFaunaModel` reusável + grupo Fauna na vitrine — ADR 0159. Follow-up: interiores, hazards e close-ups por bioma | — |
| E25 Fauna & forrageamento | 🚧 E25.1 fauna caçável: cervo/lebre/cabra/corvo/coruja/sapo ganham vida e soltam ingredientes temáticos (carne/sebo/ovo) ao serem abatidos — carne vem dos animais, não só dos monstros; sem IA de perseguição, seguem fugindo — ADR 0157; E25.2 forrageamento por bioma corrigido (chaves 'cinza'→'bosque_cinza', 'degelo'→'picos' que quebravam a coleta) + ≥2 forrageáveis por bioma jogável, com testes — ADR 0158 | — |
| E24 Polish 2: vilas & culinária | 🚧 E24.1 caminhos não cortam casas: roteador de espigão que desvia das pegadas + validador `pathsThroughHouses` e teste `streetsClear` (furo do playtest onde o caminho de uma casa passava por dentro de outra) — ADR 0155; E24.2 culinária sem ingredientes órfãos + comidas em 3 linhas × 3 tiers (couro/pena→sebo/ovo, 9 receitas, todo ingrediente em ≥2 pratos, comida rara exige mais Craft) — ADR 0156; recaptura de `mundo-mapa.jpg` (mapa-mundi atualizado) e atualização da wiki | — |
| E23 Polish: modelo, mobile & IA | 🚧 E23.1 arma na mão (fim do "rabo" cinza entre as pernas) — ADR 0152; E23.2 anti-zoom no touch + E23.3 modais responsivos/fecha-fora + E23.4 botões de mochila/talentos — ADR 0153; E23.5 IA dos aldeões (desvio de estruturas + separação, não trombam na árvore/entre si) — ADR 0154; E23.6 furos de UI mobile: prompt de interação vira ✋ no toque, subtítulo do menu principal sem teclas no touch, larguras `.controls`/`.panel` responsivas — ADR 0153; E23.7 auditoria + wiki atualizada: wiki.md reescrita para cobrir hotbar/culinária/plantação/mercadores especializados/vila viva/mobile + recaptura das imagens `forma-druida.png` (arma na mão) e `vila-clareira.jpg` (anel de casas + canteiros) | — |
| E22 Vila viva (moradia + rotina) | ✅ entregue (E22.1 rotina de dia/noite por arquétipo (trabalho/passeio/casa) + almoço e reunião ao entardecer no salão comunal + variação diária (vila nunca igual) — ADR 0147; E22.2 famílias/gênero/lares: moradores agrupados em famílias (casal + eventual filho) que dividem um lar, com gênero visível; a rotina gira em torno da casa da família — ADR 0148; E22.3 casas de família na Clareira: +3 moradias no anel externo e famílias ancoradas a casas reais (10/10 moradores com casa) — ADR 0149; E22.4 casa pra todo mundo nas vilas 2–4: famílias ancoradas às próprias construções (palafitas/cabanas/tendas) — 35/35 moradores com casa — ADR 0150; E22.5 aldeões conversam entre si ao se cruzarem (balão de fala + cooldown) — ADR 0151) | — |
