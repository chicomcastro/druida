# ADR 0167 — Cronograma determinístico dos NPCs, independente do jogador (E34)

**Status:** Aceito · **Data:** 2026-07-07

## Contexto
As iterações anteriores (E32 sorteava quem entrava; E33 fazia todos saírem pela
porta quando o jogador saía) não davam o que se queria: **cada morador com a sua
rotina e o seu lugar, em função da hora do jogo, independente de onde o jogador
esteja**. O pedido concreto: ir à noite a um recinto e encontrar uma pessoa; ela
está **só ali** (não em outro lugar ao mesmo tempo); dá pra sair e voltar (mesmo
horário) que **continua lá**; outro dia no mesmo horário ela **pode** estar lá de
novo (varia num delta); e isso vale **estando o jogador dentro ou fora**.

## Decisão
1. **Cronograma puro** (`gameplay/npcSchedule.ts`): `npcPlace(npc, hora, dia,
   recintos)` é função determinística que devolve o objetivo da rotina + o
   **recinto** (venue) onde o NPC está, se estiver dentro de algum. Estável dentro
   do bloco de tempo (sair/voltar acha a mesma pessoa) e variável por dia (delta).
   Trabalho → dentro de uma loja; entardecer → recinto social; noite → parte na
   taverna, parte em casa; passeio/casa → fora.
2. **Recintos indexados por vila** (`SettlementManager._indexVenues`): cada porta
   de casa entrável vira um venue `(vila, tema)` com a posição da porta. Temas
   repetidos colapsam num só (o interior é uma sala compartilhada por tema).
3. **Aplicação todo tique, independente do jogador** (`_wander`): o cronograma
   decide, a cada quadro do overworld, se o morador está dentro de um recinto.
   Dentro → ele **some da multidão externa** (escondido; nunca em dois lugares).
   Vindo de fora, ele **caminha até a porta** e some ao entrar (com timeout);
   quando o cronograma o tira, ele **emerge na porta** (ADR 0166) e volta a andar
   — nada de aparecer/sumir do nada.
4. **Interior = janela do cronograma** (`InteriorManager`): ao entrar numa porta,
   o recinto mostra exatamente `residentsInVenue(vila, tema)` — quem o cronograma
   pôs ali agora (mesmas entidades reais da vila). **Sair não os move** (o
   cronograma é que os tira, na hora certa), então sair e voltar encontra as
   mesmas pessoas. Sem SettlementManager (testes) cai em figurantes efêmeros.

## Consequências
- Vida coerente e determinística: num horário, cada NPC está num lugar só; a
  vila esvazia/enche conforme a hora (ex.: quase todos no salão ao entardecer);
  dá pra criar rotina e reencontrar as pessoas. Tudo independe de onde o jogador
  está (dentro ou fora de um interior).
- Substitui o sorteio/rodízio (E32) e o "todos saem quando você sai" (E33); a
  emergência pela porta (0166) permanece, agora **disparada pelo cronograma**.
- Save/load não persiste posição de aldeão (regeneram na carga) e o cronograma é
  função pura da hora → ocupação reproduzível, sem estado preso.
- Travado por testes (`npcSchedule.test`: determinismo, um lugar só, persistência
  no bloco, variação diária; `interiors.test`: ocupantes vêm do cronograma, somem
  da multidão, persistem ao sair/voltar, e o cronograma os tira pela porta quando
  a hora muda). 365 testes verdes, `tsc` limpo, `vite build` ok. Runtime: ao
  entardecer 9/10 da Clareira recolhidos (salão 6, taverna 2, casa 1); entrar no
  salão, sair e voltar mostra as mesmas 6 pessoas.

## Limitação / futuro
Recintos são os **públicos** (salão, taverna, lojas, liderança) — casas
individuais colapsam num tema 'home' compartilhado. Um modelo de moradia por-casa
(cada lar um recinto) fica para depois.
