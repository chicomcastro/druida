# ADR 0041 — Assentamentos temáticos: uma cidade-vila por região

**Status:** Aceito · **Data:** 2026-07-02

## Contexto
O mundo aberto (ADR 0008) tinha gradiente de dificuldade, mas pouca
construção de mundo: o "hub" era só a Carvalho-Mãe com três interativos
soltos, e as regiões externas não tinham civilização — nada contava quem vive
na floresta nem como cada povo resiste à Corrupção (ADR 0010). Faltava um
ponto inicial com cara de **vila dos druidas** e âncoras imersivas por nível.

## Decisão
**Uma cidade temática por região/nível**, autoral e distribuída pelo
mapa-múndi (prova de conceito com 4; o Coração Corrompido deliberadamente não
tem cidade — lá a civilização acabou):

| Cidade | Região (nível) | Tema | Papel na história |
|---|---|---|---|
| **Círculo do Carvalho** | Clareira (1) | Vila druida: cabanas de teto vivo, jardins de ervas, lanternas de vagalumes, menires no portão sul | Ponto inicial; última vila dos druidas ao redor da Carvalho-Mãe |
| **Vau das Palafitas** | Pântano (3) | Palafitas sobre lagoa, passarelas, juncos, lanternas de musgo | Coletores de seiva; a anciã Juncia conheceu O Apodrecedor antes da queda e aponta o Santuário do Urso |
| **Cinzafolha** | Bosque Cinza (5) | Paliçada, cabanas de tronco, serraria, braseiros | Lenhadores que queimam a madeira corrompida; apontam o Santuário do Corvo |
| **Abrigo do Degelo** | Picos (7) | Tendas de pele, cairns, cristais de gelo, chama azul | Montanheses que guardam a trilha antiga ao Coração; apontam o Santuário do Sapo |

Arquitetura:
- **Dados em `src/data/settlements.ts`** (posição, raio, tema, cor no mapa,
  diálogo de chegada e moradores com falas de worldbuilding), seguindo o
  padrão conteúdo-data-driven (ADR 0007). Construção procedural por tema em
  `src/world/SettlementManager.ts` (geometria low-poly no estilo do jogo,
  colisores, lanternas/chamas animadas, 1 PointLight por vila).
- **Moradores interativos** (`kind: 'villager'`): diálogo repetível roteado
  pelo `interactionSystem` direto ao HUD; anciãos têm falas que amarram a
  campanha (santuários, Árvore-Carniça, história do Apodrecedor). Guardiã,
  mercador e baú continuam nos `landmarks` (ADR 0016).
- **Zona segura**: `settlements.isSafe(x,z)` bloqueia spawns de inimigos
  dentro das vilas; POIs e entradas de masmorra reamostram posição para não
  nascer dentro delas; o WorldManager não espalha props na área urbana.
- **Chegada anunciada**: banner sempre + diálogo de worldbuilding na primeira
  visita (evento `settlementEntered`).
- **Mapa-múndi e minimapa** mostram as cidades; fast-travel ao explorá-las
  (hub sempre disponível). Lore do codex ganhou uma entrada por cidade.

Posições fixas (autorais) em vez de procedurais: cidades são âncoras de
narrativa e de navegação — precisam ser as mesmas em qualquer seed.

## Consequências
- O mundo conta a história por si: cada nível tem um "porto seguro" temático
  que reforça o tom da região e entrega o contexto da campanha por diálogo
  opcional, sem gates novos.
- Save não persiste `visited` (o diálogo de chegada pode repetir entre
  sessões) — aceitável; persistência fica para quando houver estado de vila.
- Mais ~4 PointLights e algumas centenas de meshes estáticos; o custo ficou
  dentro do orçamento (bundle e Lighthouse inalterados na prática).
- Evolução natural (backlog): quests locais por vila, reputação, mercadores
  regionais e persistência de estado das vilas.
