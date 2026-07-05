# ADR 0104 — Polish: interiores mobiliados + loja com mais itens

**Status:** Aceito · **Data:** 2026-07-05

## Contexto
Validação visual pós-E9 apontou que os interiores (ADR 0094) eram **caixas
vazias** com o vazio do mundo aberto (fundo verde chapado) aparecendo em volta,
e que a loja tinha só **4 slots** — enxuta para o pilar "evoluir comprando".

## Decisão
- **Fundo selado** (`InteriorManager`): ao entrar, aplica um clima "interior"
  (`setBiomeMood`) com fundo escuro e névoa a distância grande (55/120 — a
  câmera ortográfica fica longe; valores curtos apagam a cena, como nas
  masmorras). Paredes subiram para 5u. Na saída, restaura o clima do bioma de
  retorno. Fim do vazio verde.
- **Móveis temáticos** (`_buildProps`, grupo próprio criado por visita e
  removido na saída):
  - **Lojas**: balcão à frente do NPC, prateleiras laterais com mercadoria na
    cor do tema, engradados; o armeiro ganha bigorna/forja.
  - **Taverna**: mesas com banquetas, barris e uma **lareira acesa** (brasa
    emissiva + luz do pool).
  - **Salão/liderança**: tapete na cor do tema, cadeira alta atrás do NPC,
    estante e estandarte na parede.
- **Loja maior** (`economy.rerollShop`): **5 equipamentos + 2 poções** (cura
  pequena e grande) em vez de 3+1. A grade da loja acomoda os 7 slots.

## Consequências
- Os interiores passam a ler como ambientes (forja, taverna, salão) em vez de
  caixas — explorar as casas ganha peso visual, fechando o débito de arte dos
  interiores.
- A loja oferece mais escolha por visita, reforçando o loop de compra; o
  **tuning de preços/quantidades** segue para o Gate F (playtest), guiado pela
  telemetria do funil (ADR 0102).
- Custo baixo: móveis são caixas simples criadas/destruídas por visita (como o
  NPC), sem impacto de sistema.
