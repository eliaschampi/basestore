Aquí tienes el **LUMI UI: TECHNICAL CODEX (v2.0.0)**.

Este documento ha sido expandido masivamente para incluir **cada detalle técnico** encontrado en los archivos fuente (`tokens.css`, `lumi-core.css`, `package.json`, scripts de docker y guías de componentes). Es la referencia absoluta, sin omisiones, diseñada para que un LLM o un Senior Dev construyan el sistema sin "alucinar" ni un solo píxel.

---

# 💎 LUMI UI: THE MASTER CODEX
**Version:** 2.0.0 | **Framework:** Svelte 5 (Runes) | **Style:** CSS Variables & Pure Utility Classes

---

## 1. 🧠 SYSTEM PROMPT (Instrucción para LLMs)

Copia este bloque en tu contexto para garantizar que el LLM actúe como un Desarrollador Senior de Lumi UI:

> **Rol:** Eres el Arquitecto Principal de Lumi UI, un sistema de diseño profesional basado en Svelte 5.
>
> **Reglas Inquebrantables de Desarrollo:**
> 1.  **Svelte 5 Puro:** NUNCA uses `export let` o sintaxis de Svelte 4. Usa exclusivamente Runes:
>     *   `let count = $state(0);`
>     *   `let doubled = $derived(count * 2);`
>     *   `let { title, open = $bindable() }: Props = $props();`
>     *   `$effect(() => { ... });`
> 2.  **Snippets sobre Slots:** No uses `<slot>`. Usa `{@render children()}` y define props como `children?: Snippet;`.
> 3.  **Design Tokens:** PROHIBIDO hardcodear valores (ej: `16px`, `#1e40af`). Usa SIEMPRE `var(--lumi-space-md)`, `var(--lumi-color-primary)`, etc.
> 4.  **Iconografía:** Usa siempre `<Icon icon="nombre-lucide" />`. No importes SVGs manualmente.
> 5.  **Estructura:** Componentes en `$lib/components`. Utilidades en `$lib/utils`.
> 6.  **Estilo:** Prioriza la legibilidad. Usa las clases utilitarias `lumi-flex`, `lumi-stack`, `lumi-grid` antes de escribir CSS personalizado.

---

## 2. 🎨 DESIGN SYSTEM (La Fuente de la Verdad)

Este sistema se basa en `tokens.css`.

### 🌈 Sistema de Color (Semantic & Palette)
Cada color semántico tiene una escala completa de 11 tonos (`50` a `950`) y una variable RGB base para opacidades.

| Semántica | Token Base | Hex (Ref) | Uso |
| :--- | :--- | :--- | :--- |
| **Primary** | `--lumi-color-primary` | `rgb(30, 64, 175)` | Marca, botones principales, enlaces activos. |
| **Secondary** | `--lumi-color-secondary` | `rgb(251, 113, 133)` | Acentos cálidos, UI decorativa. |
| **Success** | `--lumi-color-success` | `rgb(34, 197, 94)` | Confirmaciones, estados completados. |
| **Warning** | `--lumi-color-warning` | `rgb(245, 158, 11)` | Alertas no críticas, estados de espera. |
| **Danger** | `--lumi-color-danger` | `rgb(239, 68, 68)` | Errores, borrado, zonas críticas. |
| **Info** | `--lumi-color-info` | `rgb(59, 130, 246)` | Ayuda, estados neutrales. |

**Superficies y Texto (Light/Dark):**
*   `--lumi-color-background`: Fondo principal (`#f4f4f5` Light / `#09090b` Dark).
*   `--lumi-color-surface`: Tarjetas y contenedores (`#ffffff` Light / `#18181b` Dark).
*   `--lumi-color-text`: Texto principal (`#18181b` Light / `#fafafa` Dark).
*   `--lumi-color-text-muted`: Texto secundario (`#71717a`).
*   `--lumi-color-border`: Bordes sutiles.

### 📐 Espaciado y Geometría (Base 4px)

| Token | Valor | Uso Estándar |
| :--- | :--- | :--- |
| `--lumi-space-2xs` | `4px` | Ajustes finos, gaps de iconos. |
| `--lumi-space-xs` | `8px` | Agrupación interna tensa. |
| `--lumi-space-sm` | `12px` | Padding en botones pequeños. |
| `--lumi-space-md` | `16px` | **ESTÁNDAR** (Gaps, Paddings generales). |
| `--lumi-space-lg` | `24px` | Separación de secciones internas. |
| `--lumi-space-xl` | `32px` | Separación mayor. |
| `--lumi-space-2xl` | `40px` | Layouts amplios. |
| `--lumi-space-3xl` | `48px` | Hero sections. |
| ... hasta | `6xl` | (96px) Espaciado masivo. |

### 🔲 Bordes y Sombras

*   **Radius:**
    *   `--lumi-radius-sm` (4px)
    *   `--lumi-radius-md` (8px - Inputs, Botones)
    *   `--lumi-radius-2xl` (24px - **Estándar Lumi** para Cards/Modales)
    *   `--lumi-radius-full` (9999px - Pills, Avatares)
*   **Shadows:**
    *   `--lumi-shadow-sm`: Sutil (UI plana).
    *   `--lumi-shadow-md`: Cards estándar.
    *   `--lumi-shadow-lg`: Dropdowns.
    *   `--lumi-shadow-xl`: Modales y Sidebars móviles.

### 🎬 Animaciones
*   `--lumi-transition-all`: `all 0.25s cubic-bezier(0.4, 0, 0.2, 1)`
*   **Keyframes definidos:** `lumi-spin`, `lumi-pulse`, `lumi-fade-in`, `lumi-slide-up`.

---

## 3. 🏗️ ARQUITECTURA Y STACK

### Tecnología
*   **Frontend:** Svelte 5 (Runes), Vite 7.
*   **Lenguaje:** TypeScript 5.9.
*   **Base de Datos:** PostgreSQL 16, Kysely (Query Builder).
*   **Seguridad:** `bcryptjs`, `jsonwebtoken`, `cookie`.
*   **Entorno:** Docker & Docker Compose.

### Estructura de Archivos
```
src/
├── lib/
│   ├── components/      # Catálogo completo (40 componentes)
│   ├── styles/          # tokens.css, lumi-core.css
│   ├── utils/           # icons.ts (Lucide), floating.svelte.ts, formatDate.ts
│   ├── stores/          # permissions.ts, toast.ts
│   └── permissions/     # definitions.ts
├── routes/              # SvelteKit App
├── database/            # Scripts y Migraciones
│   ├── dev/             # migrate.ts, setup.sh
│   └── init/            # SQL inicial
└── static/
```

---

## 4. 🧩 CATÁLOGO DE COMPONENTES (Especificación Técnica Completa)

Total: **40 Componentes**. Todos implementan `class` prop y eventos nativos.

### A. Form Components (Captura de Datos)

1.  **Button**
    *   **Props:** `type` ("filled"|"border"|"flat"|"gradient"), `color`, `size` (sm-xl), `icon` (string), `loading` (bool), `disabled` (bool), `button` ("submit"|"button").
    *   **Features:** Ripple effect implícito, estados de carga con spinner, variantes semánticas.
2.  **Input**
    *   **Props:** `value` ($bindable), `label`, `type`, `icon`, `iconAfter` (bool), `success/danger/warning` (bool), `descriptionText`, `successText`, `errorText`.
    *   **Features:** Validación visual integrada, soporte de iconos Lucide.
3.  **Select**
    *   **Props:** `value` ($bindable), `options` (Array `{value, label}`), `label`, `autocomplete` (búsqueda), `clearable`, `loading`, `placement`.
    *   **Features:** Floating UI, filtrado de opciones, teclado accesible.
4.  **Textarea**
    *   **Props:** `value`, `rows`, `maxlength`, `showCount`, `autosize`.
    *   **Features:** Contador de caracteres, auto-crecimiento.
5.  **Checkbox**
    *   **Props:** `checked` ($bindable), `label`, `indeterminate`, `color`.
    *   **Features:** Soporte para estado "parcialmente seleccionado".
6.  **Radio**
    *   **Props:** `group` ($bindable), `value`, `label`, `name`.
    *   **Features:** Animación de escala al seleccionar.
7.  **Switch**
    *   **Props:** `checked` ($bindable), `label`, `loading`, `color`.
    *   **Features:** Iconos dentro del thumb (check/x), estado de carga.
8.  **FileUpload**
    *   **Props:** `files` ($bindable array), `accept`, `multiple`, `maxSize`.
    *   **Features:** Drag & Drop, barra de progreso por archivo, validación de tipo/tamaño.
9.  **Slider**
    *   **Props:** `value`, `min`, `max`, `step`, `showTooltip`, `showValue`.

### B. Layout & Estructura

10. **Card**
    *   **Props:** `title`, `subtitle`, `image`, `clickable`, `spaced`.
    *   **Snippets:** `header`, `footer`, `children`.
    *   **Style:** Radius `2xl`, Shadow `md`.
11. **Navbar**
    *   **Props:** `title`, `sticky`.
    *   **Snippets:** `actions`, `user`, `title`.
    *   **Features:** Responsive toggle integrado.
12. **Sidebar**
    *   **Props:** `collapsed` ($bindable), `open` (mobile state).
    *   **Snippets:** `header`.
    *   **Features:** Transición de ancho (260px -> 80px), modo overlay en móvil.
13. **PageHeader**
    *   **Props:** `title`, `subtitle`.
    *   **Snippets:** `breadcrumbs`, `actions`.

### C. Feedback & Overlay

14. **Alert**
    *   **Props:** `type`, `title`, `icon` (bool), `closable`.
    *   **Features:** Animación fade-out al cerrar.
15. **Dialog (Modal)**
    *   **Props:** `open` ($bindable), `title`, `size` (sm/md/lg/xl), `persistent` (no cerrar click fuera).
    *   **Snippets:** `footer`, `header`.
    *   **Features:** Focus trap, bloqueo de scroll del body, backdrop blur.
16. **Notification (Toast)**
    *   **Props:** `type`, `title`, `message`, `active` ($bindable).
    *   **Features:** Auto-dismiss, posicionamiento z-index alto.
17. **Progress**
    *   **Props:** `value`, `striped`, `animated`, `indeterminate`, `showLabel`.
    *   **Features:** Animación CSS pura para stripes.

### D. Navegación

18. **Tabs**
    *   **Props:** `value` ($bindable), `items` (Array `{label, value, icon}`), `vertical`.
    *   **Features:** Navegación por teclado, soporte de paneles.
19. **Dropdown**
    *   **Props:** `open` ($bindable), `trigger` ("click"|"hover"), `placement`.
    *   **Snippets:** `children` (trigger), `content` (menú).
20. **DropdownItem**
    *   **Props:** `icon`, `danger` (bool).
21. **Context** (Menú click derecho)
    *   **Props:** `open`, `x`, `y`.
    *   **Features:** Detección de bordes de pantalla.
22. **ContextItem**: Item para el menú contextual.
23. **Fieldset**: Agrupador semántico con `legend`.

### E. Data Display (Visualización Rica)

24. **Table**
    *   **Props:** `data`, `columns`, `pagination`, `search`, `selectable`, `sortable`, `hover`.
    *   **Snippets:** `thead`, `row` (para control total).
    *   **Features:** Paginación cliente, ordenamiento, selección múltiple.
25. **Avatar**
    *   **Props:** `src`, `name` (genera iniciales), `size`, `color`.
    *   **Style:** Radius `2xl` (no full, según auditoría).
26. **Chip**
    *   **Props:** `label`, `closable`, `color`, `icon`.
27. **TagIndicator**: Etiqueta de estado compacta con color custom.
28. **StatusIndicator**: Punto (`dot`) con animación pulse para estados (online, offline).
29. **SegmentedControl**
    *   **Props:** `value`, `options`.
    *   **Features:** Fondo animado "Glider" que se desliza entre opciones.
30. **List**: Contenedor vertical.
31. **ListItem**: Props `title`, `subtitle`, `avatar`, `active`.
32. **ListHeader**: Separador de secciones de lista.
33. **InfoItem**: Layout `Etiqueta: Valor` alineado.
34. **Image**: Wrapper con lazy loading, skeleton loader y zoom on hover.

### F. Utilidades

35. **Icon**
    *   **Props:** `icon` (Lucide name), `size`, `color`. Wrapper esencial.
36. **Loading**: Spinner o Pulse.
37. **Divider**: Línea horizontal, opcionalmente con texto o icono en medio.
38. **Tooltip**
    *   **Props:** `text`, `position` (top/bottom/left/right).
    *   **Features:** Flecha CSS, retardo de aparición.
39. **Collapse**: Acordeón para revelar contenido.
40. **EmptyState**: Placeholder visual con icono y acción para listas vacías.

---

## 5. 📐 CSS UTILITIES & LAYOUT PATTERNS

Extraído de `lumi-core.css`. Úsalas para maquetar sin escribir CSS nuevo.

### Flexbox (`.lumi-flex`)
*   **.lumi-flex**: `display: flex; gap: 16px;`
*   **.lumi-flex--column**: `flex-direction: column;`
*   **.lumi-flex--center**: `align-items: center; justify-content: center;`
*   **.lumi-flex--between**: `justify-content: space-between;`
*   **.lumi-flex--gap-sm** (12px) | **--gap-lg** (24px)

### Grid (`.lumi-grid`)
*   **.lumi-grid**: `display: grid; gap: 16px;`
*   **.lumi-grid--responsive**: `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));`
*   **.lumi-grid--columns-2** a **-4**: Columnas fijas (responsivas en móvil).

### Patrones de Layout Global
1.  **Dashboard Completo:**
    ```html
    <div class="lumi-dashboard-layout">
       <!-- Sidebar gestiona su propia clase collapsed -->
       <Sidebar ... />
       <Navbar ... />
       <main class="lumi-dashboard__content">
          <!-- Contenido scrolleable -->
       </main>
    </div>
    ```
2.  **Centrado (Login/Error):**
    ```html
    <div class="lumi-centered-layout">
       <div class="lumi-centered-card">
          <!-- Contenido -->
       </div>
    </div>
    ```
3.  **Dos Columnas (Settings/Filtros):**
    ```html
    <div class="lumi-layout--two-columns">
       <div class="lumi-layout--sidebar-left">...</div>
       <div class="lumi-layout--content-right">...</div>
    </div>
    ```

---

## 6. 🛠️ DEVOPS & WORKFLOW

### Docker Management (`docker.sh`)
El script maestro para controlar el entorno.

| Comando | Acción Técnica |
| :--- | :--- |
| `./docker.sh up` | Levanta `app` (5173) y `postgres` (5432). |
| `./docker.sh setup` | Ejecuta scripts de inicialización (sin migraciones). |
| `./docker.sh db:migrate` | Ejecuta `tsx database/dev/migrate.ts migrate`. |
| `./docker.sh db:rollback` | Deshace la última migración. |
| `./docker.sh db:create [name]` | Crea un nuevo archivo de migración en TS. |
| `./docker.sh db:generate` | Genera tipos TypeScript a partir del esquema SQL (`kysely-codegen`). |
| `./docker.sh shell` | Abre terminal dentro del contenedor `app`. |

### Variables de Entorno (`docker-compose.yml`)
*   `NODE_ENV`: development
*   `DB_HOST`: postgres
*   `DB_USER`: postgres
*   `DB_NAME`: faztore
*   `JWT_SECRET`: **CRÍTICO** Cambiar en producción.
*   `JWT_EXPIRES_IN`: 7d

---

## 7. 🔐 PERMISOS Y SEGURIDAD (RBAC)

Lumi UI incluye un sistema de permisos integrado en el frontend.

**Definiciones:** `$lib/permissions/definitions.ts`
```typescript
export const PERMISSION_DEFINITIONS = [
    { key: 'users:read', label: 'Ver usuarios' },
    { key: 'users:create', label: 'Crear usuarios' },
    // ...
];
```

**Uso en Componentes:**
```svelte
<script>
    import { can } from "$lib/stores/permissions";
    // Reactivo automáticamente gracias a Runes
    let canDelete = $derived(can("users:delete"));
</script>

{#if canDelete}
    <Button color="danger">Eliminar</Button>
{/if}
```

---

## 8. ✅ DEVELOPER CHECKLIST (Quality Assurance)

Para mantener la calificación de "5/5 Quality", verifica:

1.  [ ] **Runes Only:** ¿Has usado `$state` en lugar de `let` simple para variables reactivas?
2.  [ ] **Tokens:** ¿Has verificado que `border-radius` sea `var(--lumi-radius-2xl)` para cards y no `16px`?
3.  [ ] **Imports:** ¿Los componentes vienen de `$lib/components`?
4.  [ ] **Accesibilidad:** ¿Los inputs tienen `label` o `aria-label`?
5.  [ ] **Limpieza:** Elimina `console.log` y código muerto antes de commitear.
6.  [ ] **Visual:** ¿El componente se ve bien tanto en Light como en Dark mode?

---

*Documento generado a partir de la auditoría completa del proyecto `faztore`/`lumi-ui`. Última actualización: Octubre 2025.*