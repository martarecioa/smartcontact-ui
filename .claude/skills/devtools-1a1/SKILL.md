---
name: devtools-1a1
description: >-
  Valida si un componente está implementado 1:1 respecto a Figma, cruzando el
  diseño (Figma MCP) con la web real renderizada (Chrome DevTools MCP) y el
  código del design system. Úsala cuando el usuario diga cosas como "ejecuta el
  mcp devtools para este componente", "valida 1:1", "compara figma y la web",
  "revisa este componente contra figma" y pegue el enlace de Figma y el de la
  web. Requiere tener conectados el Chrome DevTools MCP y el Figma MCP.
---

# Validación 1:1 componente (Figma ↔ Web ↔ Código)

Compara un componente entre su diseño en Figma y su implementación real en la
web, y da un veredicto de si es 1:1 y validable.

## Entradas
El usuario pega **dos enlaces** (en cualquier orden):
- **Figma**: URL con `node-id` (ej. `.../design/<fileKey>/...?node-id=6738-52933`).
- **Web**: URL del componente desplegado (ej. `https://ui.smart-contact.com/#/components/breadcrumb`).

Si falta alguno, pídelo antes de continuar. Extrae `fileKey` y `nodeId` de la
URL de Figma (convierte `6738-52933` → `6738:52933`).

## Requisitos
- **Chrome DevTools MCP** conectado (para navegar y leer estilos computados).
- **Figma MCP** conectado y con sesión iniciada.
- Repo del design system disponible en local para el cruce de tokens.

## Método (4 pasos)

### 1. Figma (diseño) — economiza llamadas
- Llama a Figma MCP `get_variable_defs` sobre el `nodeId` para sacar los valores
  EXACTOS: tamaños en px, colores hex, `font-size`, `font-weight`, `gap`,
  `padding`, `border-radius`.
- **No** pidas capturas de Figma salvo que sean imprescindibles: un asiento
  *View* tiene tope de ~6 llamadas/mes. Con una llamada de variables suele bastar.

### 2. Web en vivo (Chrome DevTools MCP)
- Navega a la URL Web y espera a que renderice el componente.
- Lee primero `getComputedStyle(document.documentElement).fontSize` (base rem,
  para convertir rem↔px; en este DS la base es 16px).
- Para el componente y sus sub-elementos, captura `getComputedStyle` +
  `getBoundingClientRect`: `width/height`, `background-color`, `color`,
  `font-size`, `font-weight`, `border-radius`, `padding`, `gap`.
- Mide también los **estados y piezas que suelen diferir**: item actual/último,
  separadores, badges, iconos internos, y el estado `:hover`. Para la POSICIÓN
  de un sub-elemento (ej. badge, separador), compara su `getBoundingClientRect`
  con el del contenedor (arriba/abajo, izq/dcha).
- Haz una captura del componente para el cotejo visual.

### 3. Código (implementación)
- Localiza el preset/tokens y el wrapper/demo del componente en el repo. En
  Smart Contact:
  - Preset de tema: `projects/ui-smartcontact/src/lib/theme/sc-preset/<comp>.ts`
  - Tokens semánticos: `projects/ui-smartcontact/src/lib/theme/sc-preset/base.ts`
  - Valores primitivos: `projects/design-tokens/src/lib/styles/tokens/layers/*.css`
  - Wrapper/demo (si existe): `projects/ui-smartcontact/src/lib/components/<comp>/`
    y `projects/sc-demo/src/app/pages/components/<comp>/`
- Resuelve cada token encadenado hasta su valor final (ej.
  `content.background` → `--sc-bg-surface` → `--sc-color-slate-0` → `#ffffff`;
  `--sc-scale-1` → `0.875rem` → 14px).
- Si **no existe** wrapper propio ni demo en el repo, dilo explícitamente e
  indica si la web usa el componente de PrimeNG estilizado solo por el preset.

### 4. Cotejo y veredicto
- Tabla: `Propiedad | Figma | Web (computado) | Código (token→valor) | ✓/✗`.
- Marca toda divergencia (aunque sea <1px o de mapeo de color) y propón el arreglo
  con el valor/token correcto.
- Veredicto claro: ¿es 1:1 y validable? ¿qué falta o qué ajustar antes de darlo
  por bueno?

## Notas
- Convierte siempre rem→px con la base rem real leída del `<html>`.
- Divergencias típicas: tamaño de icono interior, grosor/color de aros o
  separadores, posición de badges, color del item activo, y radios.
- Si la web no es accesible desde el entorno actual (bloqueo de red), avisa: este
  skill necesita ejecutarse donde el Chrome DevTools MCP pueda abrir la URL.
