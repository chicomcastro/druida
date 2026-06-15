# ADR 0023 — Rebind de controles (P1)

**Status:** Aceito · **Data:** 2026-06-15

## Contexto
O mapeamento de teclas era fixo no `InputManager`. Faltava personalização —
item de acessibilidade/UX do M8.

## Decisão
- Extrair o mapa para `core/input/bindings.ts`: `DEFAULT_BINDINGS`, carga/salva
  de overrides em localStorage, lista `REBINDABLE` (ações de gameplay do P1) e
  `keyLabel` para exibição.
- `InputManager` carrega `bindings` (mutável) e expõe `setBinding`/`resetBindings`.
- Tela **Controles** no menu de pausa: clicar numa ação entra em modo de captura
  e a próxima tecla vira o novo atalho (persistido). Botão de restaurar padrão.

Escopo: apenas as ações de gameplay do P1 (movimento, ataque, esquiva,
artefatos, interagir, formas). A mira é sempre pelo mouse; os atalhos de UI
(pausa/inventário/mapa) e os gamepads (P2–P4) não são rebindáveis por ora.

## Consequências
- Jogadores ajustam o teclado ao seu gosto; preferências persistem.
- Rebind de UI/gamepad e múltiplos perfis ficam como evolução.
