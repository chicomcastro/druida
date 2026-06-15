# 🌿 Druida — Game Design Document (GDD)

Versão viva. Este documento descreve a visão de design. Decisões técnicas estão em [`technical-architecture.md`](technical-architecture.md); execução está em [`backlog.md`](backlog.md).

---

## 1. Visão geral

**Druida** é um action-RPG / dungeon-crawler de **mundo aberto**, isométrico 2.5D, jogável no navegador, com **coop local same-screen** (até 4 jogadores). É amplamente inspirado em **Minecraft Dungeons** — mantém o combate, o loot, os encantamentos e os artefatos — mas substitui a estrutura linear de missões por um **mundo aberto contíguo** onde a campanha acontece.

**Pitch de uma frase:** *"Minecraft Dungeons de mundo aberto, jogado por druidas que dobram os elementos e viram bichos, no seu sofá com a galera."*

### 1.1. O conceito da série: "uma classe por jogo"

Cada título da série é dedicado a **uma única classe**. Isso concentra todo o design de habilidades, fantasia, arte e progressão numa identidade só, em vez de diluir entre várias classes genéricas. **Druida** é o primeiro. Futuros jogos (ex.: *Mago*, *Caçador*, *Guerreiro*) reutilizariam o mesmo motor e mundo, trocando a classe-tema.

> Implicação de design: a profundidade vem das **formas, magias, builds e sinergias do Druida**, não de escolher entre classes.

---

## 2. Pilares de design

1. **Natureza é poder.** Tudo no Druida emana da natureza: elementos (raiz, fogo selvagem, gelo, vento, raio), invocações de fauna/flora e **transformação em animais**.
2. **Fácil de pegar, difícil de dominar.** Controles diretos (mover + atacar + 1–3 habilidades), mas com builds, encantamentos e sinergias profundas — fiel ao MC Dungeons.
3. **Mundo aberto que convida a explorar.** Sem corredores de missão: regiões contíguas, segredos, masmorras opcionais e eventos dinâmicos.
4. **Coop é o coração.** Pensado primeiro para 2–4 amigos no mesmo sofá. Tudo escala e funciona em grupo.
5. **Loot que muda como você joga.** Itens não são só "+dano": redefinem builds (foco em forma animal, em invocações, em elementos...).
6. **Identidade voxel acolhedora.** Estética voxel/Minecraft, paleta orgânica, iluminação suave. Aconchegante, não realista.

---

## 3. A classe: Druida

A fantasia do Druida combina três eixos. O jogador transita livremente entre eles em combate.

### 3.1. Eixos de poder

| Eixo | Fantasia | Exemplos de habilidade |
|------|----------|------------------------|
| **Elemental** | Dobrar forças da natureza | Espinhos de raiz, chama selvagem, lança de gelo, rajada de vento, raio |
| **Formas (transformação)** | Virar animais com kits próprios | Urso (tank/CC), Lobo (mobilidade/burst), Corvo (recon/AoE aéreo), Sapo (utilidade/veneno) |
| **Comunhão** | Invocar e sustentar a vida | Invocar lobos, árvore-totem que cura, enxame de vagalumes, raízes que prendem |

### 3.2. Recurso de classe: **Seiva (Sap)**

- Barra de recurso que **enche atacando/coletando essência da natureza** e **drena ao usar formas e grandes magias**.
- Manter uma forma animal consome Seiva por segundo; sair da forma é instantâneo.
- Cria a tensão "acumular ↔ gastar" e desencoraja ficar 100% do tempo transformado.

### 3.3. Formas animais (sistema central, diferencial da classe)

Cada forma é praticamente um "moveset" alternativo. Trocar de forma é a expressão tática do Druida.

| Forma | Papel | Movimento básico | Especial |
|-------|-------|------------------|----------|
| **Humanoide (base)** | Versátil, conjura magias e usa o cajado | Golpe de cajado | Lança a magia equipada |
| **Urso** 🐻 | Tank / controle | Patada em área | Rugido (taunt + slow) |
| **Lobo** 🐺 | Mobilidade / burst | Mordida rápida | Investida que atravessa inimigos |
| **Corvo** 🐦‍⬛ | Recon / AoE aéreo | Bicada/voo rasante | Revoada (visão ampliada + dano em cone) |
| **Sapo** 🐸 | Utilidade / veneno | Língua (puxa item/inimigo) | Nuvem tóxica |

> Formas são desbloqueadas pela progressão/história. A primeira (provavelmente **Lobo**) entra cedo para ensinar o sistema.

### 3.4. Loadout (estilo MC Dungeons, sem árvore de talentos fixa)

Inspirado no MC Dungeons, **não há árvore de skills**. O build emerge do equipamento:

- **Arma de conjuração** (cajado/foice/garras) — define o ataque básico e escala magias.
- **Armadura** — bônus passivos (ex.: "+duração de forma", "invocações ganham vida").
- **3 Artefatos** — habilidades ativas com cooldown (ex.: totem de cura, chamado da matilha, meteoro de seiva).
- **Encantamentos** — pontos gastos em slots de itens para modificar comportamentos.

---

## 4. Core loop

**Moment-to-moment (segundos):** mover → atacar/conjurar → trocar de forma → desviar → coletar Seiva/loot.

**Curto (minutos):** limpar um acampamento corrompido / resolver um evento → pegar loot → reequipar/reencantar.

**Médio (sessão):** explorar uma região → encontrar masmorras e segredos → enfrentar mini-chefe → subir de nível e desbloquear forma/área.

**Macro (campanha):** purificar regiões da corrupção → avançar a história contra o antagonista → fechar o mapa e mirar dificuldades maiores (estilo "Apocalypse" do MC Dungeons).

---

## 5. Mundo aberto

A grande alteração em relação ao MC Dungeons.

### 5.1. Estrutura do mundo

- **Mundo contíguo** dividido em **regiões/biomas** com tom e inimigos próprios, sem telas de carregamento perceptíveis (streaming de chunks — ver arquitetura).
- **Hub central** (ex.: um **Bosque Ancião / Carvalho-Mãe**) que serve de base: NPCs, mercador, baú compartilhado, fast travel.
- **Masmorras** espalhadas: instâncias opcionais com loot e mini-chefes.
- **Pontos de interesse:** ruínas, santuários (desbloqueiam buffs/formas), acampamentos inimigos, eventos dinâmicos.

### 5.2. Biomas (proposta inicial)

1. **Clareira Viva** (tutorial, floresta saudável) — onboarding.
2. **Pântano Apodrecido** — veneno, lentidão, fauna corrompida.
3. **Bosque Cinza** — floresta queimada, tema fogo.
4. **Picos Gélidos** — gelo/vento, plataformas.
5. **Coração Corrompido** — reduto final do antagonista.

### 5.3. Exploração

- **Fog of war** por região, revelado ao explorar; mapa no hub.
- **Fast travel** entre santuários descobertos.
- **Verticalidade leve** (a forma Corvo permite atravessar abismos / alcançar áreas).
- **Recursos colhíveis** (essência, ervas) usados em encantamentos/consumíveis.

### 5.4. Escala e nivelamento do mundo

- Regiões têm **faixa de nível recomendada**, mas inimigos fazem **soft-scaling** com o nível médio do grupo para manter coop e backtracking relevantes.

---

## 6. História / Campanha

- **Antagonista:** uma força que **corrompe a natureza** (proposta: *O Apodrecedor* / um ex-druida caído). Espelha o papel do Arch-Illager, mas temático à natureza.
- **Arco:** o último Druida desperta para encontrar o mundo sendo corrompido; precisa **repurificar as regiões**, recuperar as **formas ancestrais** (gating natural de habilidades) e enfrentar a fonte da corrupção.
- **Entrega não-linear:** a história avança ao purificar regiões, mas a ordem é parcialmente livre — coerente com o mundo aberto.
- **NPCs no hub** dão missões/lore opcionais e desbloqueiam serviços.

---

## 7. Combate

- **Hack-and-slash isométrico**, mira por direção/twin-stick, sem turnos.
- **Ataque básico** (depende da arma) + **3 artefatos** (cooldown) + **troca de forma** + **dodge/roll** (com i-frames curtos).
- **Status elementais:** queimar (DoT), congelar (slow/freeze), envenenar (DoT), enraizar (root), atordoar.
- **Multidões:** inimigos vêm em hordas; AoE e controle são essenciais (fiel ao MC Dungeons).
- **Sem fogo amigo** entre jogadores (padrão coop casual).

---

## 8. Loot, itens e encantamentos

Fortemente baseado no modelo do MC Dungeons.

- **Raridades:** Comum, Raro, Único (com efeito assinatura).
- **Drops:** inimigos, baús, recompensas de evento/masmorra.
- **Salvage:** desmontar itens vira recurso de encantamento.
- **Encantamentos:** cada item tem slots; o jogador gasta **pontos de encanto** (ganhos ao subir de nível) para ativar/escalar efeitos. Salvar um item devolve os pontos.
- **Exemplos de encantamento temáticos:**
  - *Fotossíntese* — curar-se ao ficar parado em grama.
  - *Matilha* — invocações duram mais e ganham vida.
  - *Metamorfo* — trocar de forma libera uma onda de dano.
  - *Raízes Profundas* — ataques têm chance de enraizar.

---

## 9. Progressão

- **Nível do jogador** → concede **pontos de encanto** (não aumenta stats diretamente; o poder vem do equipamento, como no MC Dungeons).
- **Poder do equipamento** define o "item level" recomendado por região.
- **Formas ancestrais** desbloqueadas pela história/santuários.
- **Endgame:** níveis de dificuldade crescentes (estilo Aventura/Apocalipse), regiões com modificadores, caça a Únicos.

---

## 10. Coop local same-screen

Decisão travada: **coop local, tela compartilhada, até 4 jogadores.**

- **Entrada:** P1 no teclado+mouse ou gamepad; P2–P4 em gamepads (Gamepad API). "Pressione para entrar" a qualquer momento.
- **Câmera compartilhada:** segue o **centróide** do grupo; **zoom dinâmico** para manter todos enquadrados; **clamp de distância** (jogadores muito longe são puxados/recebem aviso ou teleporte suave).
- **Loot:** instâncias de drop por jogador **ou** loot compartilhado com round-robin (decidir no protótipo — ver backlog).
- **Revive:** jogador caído fica "incapacitado"; aliado revive ao chegar perto por X s. Wipe = checkpoint.
- **Escala de dificuldade:** vida/quantidade de inimigos escalam com o nº de jogadores.
- **HUD por jogador:** vida, Seiva, artefatos e forma atual, com cor/identidade por jogador.

---

## 11. Inimigos e chefões (proposta)

- **Comuns:** fauna corrompida (javalis-podres, corvos-sombra), brotos hostis, fungos explosivos.
- **Elite:** xamãs corrompidos (invocam/curam), tanques de casca.
- **Mini-chefes** por região (ex.: *Árvore-Carniça* no pântano).
- **Chefe final:** *O Apodrecedor* — múltiplas fases temáticas aos elementos corrompidos.

---

## 12. Fora de escopo (por enquanto)

- Multiplayer online / netcode (foco é coop local).
- Outras classes jogáveis (é a premissa da série: uma por jogo).
- Construção/crafting estilo Minecraft survival (não é o gênero).
- Economia monetária / loja real.

---

## 13. Riscos e questões em aberto

- **Performance do mundo aberto em WebGL** com voxels + hordas + 4 jogadores → exige instancing e streaming de chunks (ver arquitetura).
- **Câmera coop same-screen em mundo aberto** é tensão real (mundo grande × tela única). Mitigação: clamp + zoom dinâmico; avaliar split-screen no futuro.
- **Pipeline de assets voxel** (MagicaVoxel → glTF) precisa ser definido cedo.
- **Loot compartilhado vs instanciado** — validar no protótipo coop.
