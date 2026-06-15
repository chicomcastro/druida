# ADR 0017 — POIs (acampamentos) e colhíveis

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
O mundo aberto precisava de objetivos opcionais e recompensa por explorar, além
da campanha linear.

## Decisão
- **Acampamentos corrompidos** (`PoiManager`): posições geradas
  deterministicamente por anel/bioma (seed). Ao aproximar (~30u) o acampamento
  **ativa**, ergue um totem e spawna guardas (quantidade escala com o anel),
  marcados com `CampMember`. Ao eliminar todos, o acampamento é **purificado**:
  recompensa (loot + essência), efeito e shake. Estado purificado é
  **persistido no save** (não reaparece).
- **Colhíveis** (`WorldManager`): fragmentos de essência aparecem no anel ao
  redor do grupo (limitados e podados quando colhidos ou distantes), coletados
  ao passar por cima — recompensa leve por explorar.

## Consequências
- Exploração passa a ter ganchos (camps com risco/recompensa) e renda passiva
  (shards), alimentando a economia do hub (ADR 0016).
- Camps usam o spawner/IA/loot existentes — baixo acoplamento.
- Masmorras instanciadas dedicadas continuam no backlog; camps cobrem o papel
  de POI de combate por ora.
