# ADR 0061 — VFX de impacto: clarão aditivo, varredura e onda de choque

**Status:** Aceito · **Data:** 2026-07-04

## Contexto
Fechamento do pacote M13 de "cara profissional": o combate tinha feedback
(faíscas, anéis, flash emissivo no corpo, números de dano, screen shake já
ligado a dano/boss/downed), mas os efeitos eram opacos e estáticos — golpe
como decalque parado, morte sem "punch".

## Decisão
Upgrades no `VfxManager` (todos `MeshBasicMaterial` com **blending aditivo**
e `depthWrite:false` — brilham sobre a cena sem custo de luz real):

- **`flash()`**: clarão de impacto — icosaedro aditivo que incha e some em
  ~0.14s. Disparado em todo dano direto (na cor do elemento), cura (verde)
  e morte (maior; roxo em chefes).
- **`shockwave()`**: anel fino aditivo que expande no chão em 0.45s com fade
  quadrático. Disparado na morte (raio 2.8; 5 em chefes).
- **`swing()` com varredura**: o arco do golpe agora **gira no sentido do
  ataque** enquanto desaparece (leitura de movimento) e é aditivo.
- **Fagulhas de cura**: partículas verdes sobem do curado (ties com o número
  verde do ADR 0056; ignora ticks < 3 como lá).

## Consequências
- Cada golpe/kill tem 1–2 meshes transitórios a mais (vida < 0.5s, pool de
  partículas inalterado, cap de 260 preservado) — sem custo perceptível.
- O bloom do pós-processamento (ADR 0054) pega os aditivos de graça — os
  clarões ganham halo sem nenhum código novo.
- Geometrias dos efeitos continuam por instância (descartadas no fim da
  vida) — o `_add` já fazia dispose; nada compartilhado foi introduzido.
