# 🚀 Lumi UI - Guía Completa para Dashboards Modernos

**Documento Entregable para LLMs y Desarrolladores**  
**Versión:** 1.1.0 | **Fecha:** 2025-10-10  
**Actualización:** Componentes mejorados + Users CRUD + Permissions Management

---

## 📋 Índice Rápido

1. [Sistema de Diseño](#sistema-de-diseño)
2. [Utilidades CSS](#utilidades-css)
3. [Componentes](#componentes)
4. [Patrones de Layout](#patrones-de-layout)
5. [Ejemplos Completos](#ejemplos-completos)

---

## Sistema de Diseño

### Design Tokens Globales

**Colores (6 variantes consistentes):**

```css
--lumi-color-primary: rgb(30, 64, 175); /* Azul */
--lumi-color-secondary: rgb(251, 113, 133); /* Coral */
--lumi-color-success: rgb(34, 197, 94); /* Verde */
--lumi-color-warning: rgb(245, 158, 11); /* Ámbar */
--lumi-color-danger: rgb(239, 68, 68); /* Rojo */
--lumi-color-info: rgb(59, 130, 246); /* Azul cielo */
```

**Espaciado (base 4px):**

```css
--lumi-space-xs: 0.5rem; /* 8px */
--lumi-space-sm: 0.75rem; /* 12px */
--lumi-space-md: 1rem; /* 16px - ESTÁNDAR */
--lumi-space-lg: 1.5rem; /* 24px */
--lumi-space-xl: 2rem; /* 32px */
```

**Sombras:**

```css
--lumi-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--lumi-shadow-md: 0 4px 20px 0 rgba(0, 0, 0, 0.05); /* Cards */
--lumi-shadow-lg: 0 10px 25px 0 rgba(0, 0, 0, 0.1); /* Dropdowns */
--lumi-shadow-xl: 0 20px 40px 0 rgba(0, 0, 0, 0.15); /* Modals */
```

**Border Radius:**

```css
--lumi-radius-md: 0.5rem; /* 8px */
--lumi-radius-2xl: 1.5rem; /* 24px - Componentes */
--lumi-radius-full: 9999px; /* Circular */
```

---

## Utilidades CSS

### Flexbox

```css
/* Base */
.lumi-flex                  /* display: flex + gap: 16px */
.lumi-flex--column          /* flex-direction: column */
.lumi-flex--between         /* justify-content: space-between */
.lumi-flex--center          /* align + justify center */

/* Gaps */
.lumi-flex--gap-sm          /* gap: 12px */
.lumi-flex--gap-md          /* gap: 16px */
.lumi-flex--gap-lg          /* gap: 24px */
```

**Ejemplo:**

```svelte
<div class="lumi-flex lumi-flex--between lumi-flex--gap-md">
	<h1>Dashboard</h1>
	<Button>Nuevo</Button>
</div>
```

### Grid

```css
/* Columnas fijas */
.lumi-grid--columns-2       /* 2 columnas */
.lumi-grid--columns-3       /* 3 columnas */
.lumi-grid--columns-4       /* 4 columnas */

/* Responsive */
.lumi-grid--auto-fit        /* repeat(auto-fit, minmax(300px, 1fr)) */
.lumi-grid--responsive      /* repeat(auto-fit, minmax(280px, 1fr)) */

/* Gaps */
.lumi-grid--gap-md          /* gap: 16px */
.lumi-grid--gap-lg          /* gap: 24px */
```

**Ejemplo - Métricas:**

```svelte
<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-lg">
	<Card
		><Title>Usuarios</Title>
		<h2>1,234</h2></Card
	>
	<Card
		><Title>Ventas</Title>
		<h2>$45K</h2></Card
	>
	<Card
		><Title>Conversión</Title>
		<h2>3.4%</h2></Card
	>
	<Card
		><Title>Rating</Title>
		<h2>4.8/5</h2></Card
	>
</div>
```

### Layout Dashboard

```css
.lumi-dashboard-layout {
	display: grid;
	height: 100vh;
	grid-template-areas: "sidebar navbar" "sidebar content";
	grid-template-columns: 260px 1fr;
}

.lumi-dashboard__content {
	padding: var(--lumi-space-lg);
	overflow-y: auto;
}
```

### Centrado (Login/Hero)

```css
.lumi-centered-layout       /* min-height: 100vh + centrado */
.lumi-centered-card         /* max-width: 420px */
```

**Ejemplo:**

```svelte
<div class="lumi-centered-layout">
	<div class="lumi-centered-card">
		<Card>
			<Title>Login</Title>
			<Input label="Email" />
			<Button class="lumi-width--full">Entrar</Button>
		</Card>
	</div>
</div>
```

---

## Componentes

### Button

**Props:** `type`, `color`, `size`, `loading`, `disabled`, `icon`

```svelte
<Button color="primary">Guardar</Button>
<Button type="border" color="secondary">Cancelar</Button>
<Button type="flat">Flat</Button>
<Button type="gradient">Premium</Button>
<Button loading={true}>Procesando...</Button>
<Button icon="plus" size="sm">Nuevo</Button>
```

**Tipos:** `filled` (default), `border`, `flat`, `gradient`  
**Colores:** `primary`, `secondary`, `success`, `warning`, `danger`, `info`  
**Tamaños:** `sm`, `md`, `lg`, `xl`

### Input

**Props:** `value`, `label`, `type`, `icon`, `success`, `danger`, `disabled`

```svelte
<script>
	let email = $state("");
</script>

<Input bind:value={email} label="Email" placeholder="tu@email.com" />
<Input bind:value={email} icon="mail" />
<Input bind:value={email} success={isValid} successText="Email válido" />
<Input type="password" danger={invalid} dangerText="Error" />
```

### Select

**Props:** `value`, `options`, `label`, `autocomplete`, `clearable`, `loading`

```svelte
<script>
	let country = $state(null);
	const options = [
		{ value: "mx", label: "México" },
		{ value: "us", label: "USA" }
	];
</script>

<Select bind:value={country} {options} label="País" />
<Select {options} autocomplete clearable />
<Select {options} loading={isLoading} />
```

### Card

**Props:** `title`, `subtitle`, `image`, `clickable`, `spaced`

```svelte
<Card title="Dashboard" subtitle="Vista general">
	<p>Contenido</p>
</Card>

<Card image="/img.jpg" title="Producto">
	{#snippet footer()}
		<Button>Comprar</Button>
	{/snippet}
</Card>

<Card clickable onclick={() => navigate("/")}>Click me</Card>
```

### Dialog

**Props:** `open`, `title`, `size`, `persistent`, `scrollable`

```svelte
<script>
	let open = $state(false);
</script>

<Button onclick={() => (open = true)}>Abrir</Button>

<Dialog bind:open title="Confirmar">
	<p>¿Estás seguro?</p>
	{#snippet footer()}
		<Button type="border" onclick={() => (open = false)}>Cancelar</Button>
		<Button color="danger">Eliminar</Button>
	{/snippet}
</Dialog>
```

**Tamaños:** `sm` (400px), `md` (500px), `lg` (700px), `xl` (900px)

### Table

**Props:** `data`, `search`, `pagination`, `selectable`, `sortable`, `compact`, `stripe`, `hover`

```svelte
<script>
	const data = [
		{ id: 1, name: "Juan", email: "juan@mail.com", role: "Admin" },
		{ id: 2, name: "María", email: "maria@mail.com", role: "User" }
	];

	let selected = $state([]);
</script>

<Table {data} bind:selected search pagination selectable hover itemsPerPage={10}>
	{#snippet thead()}
		<th>Nombre</th>
		<th>Email</th>
		<th>Rol</th>
	{/snippet}

	{#snippet row({ row })}
		<td>{row.name}</td>
		<td>{row.email}</td>
		<td><Chip color="primary">{row.role}</Chip></td>
	{/snippet}
</Table>
```

### Tabs

**Props:** `value`, `tabs`, `color`, `position`

```svelte
<script>
	let activeTab = $state("overview");

	const tabs = [
		{ value: "overview", label: "Vista General", icon: "home" },
		{ value: "analytics", label: "Analíticas", icon: "chart" },
		{ value: "settings", label: "Configuración", icon: "settings" }
	];
</script>

<Tabs bind:value={activeTab} {tabs} color="primary">
	{#if activeTab === "overview"}
		<p>Contenido Overview</p>
	{:else if activeTab === "analytics"}
		<p>Contenido Analytics</p>
	{:else}
		<p>Contenido Settings</p>
	{/if}
</Tabs>
```

### Dropdown

**Props:** `open`, `position`, `trigger`, `size`

```svelte
<script>
	let open = $state(false);
</script>

<Dropdown bind:open position="bottom-start">
	{#snippet children()}
		<Button>Acciones</Button>
	{/snippet}

	{#snippet content()}
		<DropdownItem>Editar</DropdownItem>
		<DropdownItem>Duplicar</DropdownItem>
		<DropdownItem color="danger">Eliminar</DropdownItem>
	{/snippet}
</Dropdown>
```

### Navbar

```svelte
<script>
	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}
</script>

<Navbar ontoggle-sidebar={toggleSidebar}>
	{#snippet title()}
		<h1>Mi App</h1>
	{/snippet}

	{#snippet actions()}
		<Button type="flat" icon="bell" />
		<Avatar text="JD" />
	{/snippet}
</Navbar>
```

### Sidebar

```svelte
<Sidebar collapsed={false}>
	{#snippet header()}
		<img src="/logo.svg" alt="Logo" />
	{/snippet}

	<SidebarItem active={route === "/"} href="/">Dashboard</SidebarItem>
	<SidebarItem href="/users">Usuarios</SidebarItem>
	<SidebarItem href="/settings">Configuración</SidebarItem>
</Sidebar>
```

### Progress

**Props:** `value`, `color`, `size`, `striped`, `animated`, `indeterminate`, `showLabel`

```svelte
<Progress value={75} showLabel />
<Progress value={50} color="success" striped animated />
<Progress indeterminate color="primary" />
```

### Loading

```svelte
<Loading color="primary" text="Cargando datos..." />
<Loading color="success">Procesando información...</Loading>
```

### Alert

**Props:** `type`, `title`, `icon`, `closable`

```svelte
<Alert type="success" title="Éxito" closable>Operación completada correctamente</Alert>

<Alert type="danger" title="Error">Ocurrió un error al procesar</Alert>

<Alert type="warning" icon={false}>Advertencia sin icono</Alert>
```

### Notification

```svelte
<Notification type="success" title="Guardado" message="Los cambios se guardaron correctamente" />
```

### EmptyState

```svelte
<EmptyState title="No hay datos" description="No se encontraron resultados" icon="inbox">
	{#snippet actions()}
		<Button color="primary">Crear Nuevo</Button>
	{/snippet}
</EmptyState>
```

### Avatar

```svelte
<Avatar text="Juan Pérez" size="md" color="primary" />
<Avatar src="/user.jpg" alt="Usuario" />
<Avatar icon="user" color="secondary" />
```

### Chip

```svelte
<Chip color="primary">Activo</Chip>
<Chip color="success" icon="check">Completado</Chip>
<Chip color="danger" closable onclose={() => {}}>Eliminar</Chip>
```

### Checkbox, Radio, Switch

```svelte
<Checkbox bind:checked={accepted} label="Acepto" />
<Radio bind:group={plan} value="basic" label="Básico" />
<Switch bind:checked={enabled} label="Activar" />
```

### Textarea

```svelte
<Textarea bind:value={description} label="Descripción" rows={5} maxlength={500} showCount />
```

### Slider

```svelte
<Slider bind:value={volume} min={0} max={100} label="Volumen" showValue />
```

---

## Patrones de Layout

### 1. Dashboard Completo

```svelte
<script>
	import {
		Navbar,
		Sidebar,
		SidebarItem,
		Card,
		Title,
		Button,
		Table,
		Progress,
		Chip
	} from "$lib/components";

	let sidebarOpen = $state(true);
	let currentRoute = $state("/dashboard");
</script>

<div class="lumi-dashboard-layout">
	<!-- Sidebar -->
	<Sidebar collapsed={!sidebarOpen}>
		{#snippet header()}
			<img src="/logo.svg" alt="Logo" />
		{/snippet}

		<SidebarItem active={currentRoute === "/dashboard"} href="/dashboard">Dashboard</SidebarItem>
		<SidebarItem href="/users">Usuarios</SidebarItem>
		<SidebarItem href="/analytics">Analíticas</SidebarItem>
	</Sidebar>

	<!-- Navbar -->
	<Navbar ontoggle-sidebar={() => (sidebarOpen = !sidebarOpen)}>
		{#snippet title()}
			<h1>Dashboard</h1>
		{/snippet}

		{#snippet actions()}
			<Button type="flat" icon="bell" />
			<Avatar text="Admin" />
		{/snippet}
	</Navbar>

	<!-- Content -->
	<main class="lumi-dashboard__content">
		<!-- Métricas -->
		<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-lg">
			<Card>
				<Title size="sm" color="primary">Usuarios</Title>
				<h2>1,234</h2>
				<Progress value={75} color="primary" size="xs" />
			</Card>
			<Card>
				<Title size="sm" color="success">Ventas</Title>
				<h2>$45,678</h2>
				<Progress value={85} color="success" size="xs" />
			</Card>
			<Card>
				<Title size="sm" color="warning">Pendientes</Title>
				<h2>23</h2>
				<Progress value={45} color="warning" size="xs" />
			</Card>
			<Card>
				<Title size="sm" color="info">Satisfacción</Title>
				<h2>4.8/5</h2>
				<Progress value={96} color="info" size="xs" />
			</Card>
		</div>

		<!-- Tabla -->
		<Card title="Usuarios Recientes" class="lumi-margin--lg">
			<Table data={users} search pagination hover>
				{#snippet thead()}
					<th>Nombre</th>
					<th>Email</th>
					<th>Estado</th>
				{/snippet}

				{#snippet row({ row })}
					<td>{row.name}</td>
					<td>{row.email}</td>
					<td>
						<Chip color={row.active ? "success" : "danger"}>
							{row.active ? "Activo" : "Inactivo"}
						</Chip>
					</td>
				{/snippet}
			</Table>
		</Card>
	</main>
</div>
```

### 2. Login Page

```svelte
<script>
	import { Card, Title, Input, Button, Checkbox } from "$lib/components";

	let email = $state("");
	let password = $state("");
	let remember = $state(false);
	let loading = $state(false);

	async function handleLogin() {
		loading = true;
		// Login logic
		loading = false;
	}
</script>

<div class="lumi-centered-layout">
	<div class="lumi-centered-card">
		<Card>
			<div class="lumi-stack lumi-space--md">
				<Title size="lg" color="primary">Iniciar Sesión</Title>

				<Input
					bind:value={email}
					label="Email"
					type="email"
					icon="mail"
					placeholder="tu@email.com"
				/>

				<Input bind:value={password} label="Contraseña" type="password" icon="lock" />

				<Checkbox bind:checked={remember} label="Recordarme" />

				<Button color="primary" class="lumi-width--full" {loading} onclick={handleLogin}>
					Entrar
				</Button>

				<div class="lumi-text--center">
					<a href="/forgot-password" class="lumi-text--primary"> ¿Olvidaste tu contraseña? </a>
				</div>
			</div>
		</Card>
	</div>
</div>
```

### 3. Grid Responsive de Cards

```svelte
<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-lg">
	{#each products as product}
		<Card
			image={product.image}
			title={product.name}
			subtitle={product.price}
			clickable
			onclick={() => viewProduct(product.id)}
		>
			<p>{product.description}</p>

			{#snippet footer()}
				<div class="lumi-flex lumi-flex--between">
					<Chip color="success">{product.stock} en stock</Chip>
					<Button size="sm">Ver más</Button>
				</div>
			{/snippet}
		</Card>
	{/each}
</div>
```

### 4. Form Completo

```svelte
<Card title="Nuevo Usuario">
	<form class="lumi-stack lumi-space--md">
		<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
			<Input label="Nombre" required />
			<Input label="Apellido" required />
		</div>

		<Input label="Email" type="email" icon="mail" required />

		<Input label="Teléfono" type="tel" icon="phone" />

		<Select label="País" options={countries} placeholder="Selecciona un país" />

		<Textarea label="Biografía" rows={4} maxlength={500} showCount />

		<Checkbox label="Acepto términos y condiciones" />

		<div class="lumi-flex lumi-flex--end lumi-flex--gap-sm">
			<Button type="border">Cancelar</Button>
			<Button color="primary" type="submit">Guardar</Button>
		</div>
	</form>
</Card>
```

### 5. Two-Column Layout

```svelte
<div class="lumi-layout--two-columns">
	<!-- Sidebar izquierdo -->
	<div>
		<Card title="Filtros">
			<div class="lumi-stack lumi-space--sm">
				<Select label="Categoría" options={categories} />
				<Select label="Estado" options={statuses} />
				<Slider label="Precio" min={0} max={1000} />
				<Button class="lumi-width--full">Aplicar</Button>
			</div>
		</Card>
	</div>

	<!-- Contenido principal -->
	<div>
		<Card title="Resultados">
			<Table data={results} search pagination />
		</Card>
	</div>
</div>
```

---

## Performance y Optimización

### 1. Lazy Loading de Componentes

```svelte
<script>
	import { onMount } from "svelte";

	let HeavyComponent;

	onMount(async () => {
		HeavyComponent = (await import("./HeavyComponent.svelte")).default;
	});
</script>

{#if HeavyComponent}
	<svelte:component this={HeavyComponent} />
{:else}
	<Loading />
{/if}
```

### 2. Virtual Scrolling para Listas Grandes

```svelte
<!-- Usar Table con pagination para listas grandes -->
<Table data={largeDataset} pagination itemsPerPage={50} />
```

### 3. Debounce en Búsquedas

```svelte
<script>
	import { debounce } from "$lib/utils";

	let searchQuery = $state("");

	const handleSearch = debounce((query) => {
		// Búsqueda
	}, 300);

	$effect(() => {
		handleSearch(searchQuery);
	});
</script>

<Input bind:value={searchQuery} placeholder="Buscar..." icon="search" />
```

### 4. Memoización con $derived

```svelte
<script>
  let items = $state([...]);
  let filter = $state("");
  
  // Memoizado - solo se recalcula si items o filter cambian
  const filteredItems = $derived(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase())
    );
  });
</script>
```

---

## Mejores Prácticas

### 1. Estructura de Proyecto

```
src/
├── lib/
│   ├── components/      # Lumi UI components
│   ├── utils/          # Utilidades
│   └── stores/         # Stores globales
├── routes/
│   ├── dashboard/
│   │   ├── +page.svelte
│   │   └── +layout.svelte
│   ├── login/
│   │   └── +page.svelte
│   └── +layout.svelte
└── app.html
```

### 2. Uso de Stores para Estado Global

```typescript
// stores/auth.svelte.ts
export const authStore = $state({
	user: null,
	isAuthenticated: false
});

export function login(user) {
	authStore.user = user;
	authStore.isAuthenticated = true;
}
```

### 3. Composición de Componentes

```svelte
<!-- Reutilizable -->
<script>
	import { Card, Title, Button } from "$lib/components";

	interface Props {
		title: string;
		value: number;
		color?: string;
	}

	let { title, value, color = "primary" }: Props = $props();
</script>

<Card>
	<Title size="sm" {color}>{title}</Title>
	<h2>{value}</h2>
	<Button size="sm">Ver detalles</Button>
</Card>
```

### 4. Responsive Design

```svelte
<!-- Mobile first -->
<div class="lumi-grid lumi-grid--columns-1 lumi-grid--columns-2-lg lumi-grid--columns-4-lg">
  <!-- Se adapta automáticamente -->
</div>

<!-- Breakpoints en CSS -->
@media (max-width: 768px) {
  .lumi-grid--columns-4 {
    grid-template-columns: 1fr;
  }
}
```

### 5. Accesibilidad

```svelte
<!-- ARIA labels -->
<Button aria-label="Cerrar diálogo">
	<Icon icon="x" />
</Button>

<!-- Navegación por teclado -->
<div role="button" tabindex="0" onkeydown={handleKeyDown}>Clickeable</div>

<!-- Focus visible -->
<Input autofocus />
```

### 6. Manejo de Errores

```svelte
<script>
	let error = $state(null);
	let loading = $state(false);

	async function loadData() {
		try {
			loading = true;
			error = null;
			const data = await fetchData();
		} catch (e) {
			error = e.message;
		} finally {
			loading = false;
		}
	}
</script>

{#if loading}
	<Loading />
{:else if error}
	<Alert type="danger" title="Error">
		{error}
	</Alert>
{:else}
	<!-- Contenido -->
{/if}
```

---

## 🆕 Nuevas Funcionalidades (v1.1.0)

### Gestión de Permisos

**PermissionsModal Component:**

```svelte
<script>
	import PermissionsModal from "$lib/components/PermissionsModal";
	import { PERMISSION_DEFINITIONS } from "$lib/permissions/definitions";

	let showPermissions = $state(false);
	let selectedUser = $state(null);
</script>

<PermissionsModal
	user={selectedUser}
	bind:open={showPermissions}
	onclose={() => (showPermissions = false)}
/>
```

**Permission Definitions:**

```typescript
// src/lib/permissions/definitions.ts
export const PERMISSION_DEFINITIONS = [
	{
		key: 'users:read',
		label: 'Ver usuarios',
		category: 'Usuarios',
		description: 'Ver lista de usuarios'
	},
	// ... más permisos
];
```

### Users CRUD Completo

**Características:**
- ✅ Grid de tarjetas con avatares
- ✅ Crear, editar, eliminar usuarios
- ✅ Cambio de contraseña
- ✅ Gestión de permisos por usuario
- ✅ Selección de avatares
- ✅ Validación de formularios
- ✅ Responsive design

**Ejemplo de uso:**

```svelte
<script>
	import { can } from "$lib/stores/permissions";
	import { getInitials, formatDate } from "$lib/utils";

	const canCreate = $derived(can("users:create"));
	const canUpdate = $derived(can("users:update"));
</script>

<div class="lumi-grid lumi-grid--columns-3">
	{#each users as user}
		<Card>
			<Avatar text={getInitials(user.name, user.last_name)} />
			<h3>{user.name} {user.last_name}</h3>
			<p>{formatDate(user.created_at)}</p>
		</Card>
	{/each}
</div>
```

### Table Component Mejorado

**Cambios importantes:**
- ❌ Removido `box-shadow` y `border` redundantes (ahora transparente)
- ✅ Padding consistente con Aula UI
- ✅ Headers con uppercase y letter-spacing
- ✅ Bordes sutiles entre filas
- ✅ Sin hover transform (más limpio)

**Uso correcto dentro de Card:**

```svelte
<Card>
	<Table data={items} search pagination hover>
		{#snippet thead()}
			<th>Nombre</th>
			<th>Email</th>
		{/snippet}

		{#snippet row({ row })}
			<td>{row.name}</td>
			<td>{row.email}</td>
		{/snippet}
	</Table>
</Card>
```

### Utilidades Agregadas

**Helpers de formato:**

```typescript
// src/lib/utils/index.ts
export { getInitials } from "./initialName";
export { formatDate, formatDateWithYear } from "./formatDate";

// Uso
getInitials("John", "Doe"); // "JD"
formatDate(new Date()); // "15 de enero"
formatDateWithYear(new Date()); // "15 de enero, 2024"
```

---

## Resumen de Componentes Disponibles

### Form Components (8)

- Button, Input, Select, Checkbox, Radio, Switch, Textarea, Slider

### Layout Components (4)

- Card, Navbar, Sidebar, Divider

### Feedback Components (5)

- Alert, Dialog, Notification, Loading, Progress

### Data Display (4)

- Table, Tabs, Title, EmptyState

### Utility Components (8)

- Avatar, Chip, Icon, Image, Tooltip, Dropdown, Badge, StatusIndicator

### Navigation (4)

- Navbar, Sidebar, Tabs, PageHeader

### 🆕 Admin Components (1)

- **PermissionsModal** - Gestión completa de permisos de usuario

**Total: 38 componentes profesionales**

---

## Patrones de Implementación

### 1. CRUD Pattern

```svelte
<script>
	import { invalidate } from "$app/navigation";
	import { enhance } from "$app/forms";
	import { showToast } from "$lib/stores/Toast";
	import { can } from "$lib/stores/permissions";

	let showModal = $state(false);
	let isEditing = $state(false);
	let selectedItem = $state(null);

	const canCreate = $derived(can("entity:create"));
	const canUpdate = $derived(can("entity:update"));
	const canDelete = $derived(can("entity:delete"));
</script>

<Dialog bind:open={showModal}>
	<form
		id="entity-form"
		method="POST"
		action="?/{isEditing ? 'update' : 'create'}"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === "success") {
					showToast("Operación exitosa", "success");
					await invalidate("entity:load");
					showModal = false;
				}
			};
		}}
	>
		<!-- Form fields -->
	</form>

	{#snippet footer()}
		<Button onclick={() => document.getElementById('entity-form')?.requestSubmit()}>
			Guardar
		</Button>
	{/snippet}
</Dialog>
```

### 2. Permission-Based UI

```svelte
<script>
	import { can } from "$lib/stores/permissions";

	const canCreate = $derived(can("users:create"));
	const canDelete = $derived(can("users:delete"));
</script>

<Button disabled={!canCreate}>Crear</Button>

{#if canDelete}
	<Button color="danger">Eliminar</Button>
{/if}
```

### 3. Card Grid Layout

```svelte
<div class="lumi-grid lumi-grid--columns-3 lumi-grid--gap-lg">
	{#each items as item}
		<Card>
			<!-- Content -->
		</Card>
	{/each}
</div>

<style>
	@media (max-width: 1024px) {
		.lumi-grid--columns-3 {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 768px) {
		.lumi-grid--columns-3 {
			grid-template-columns: 1fr;
		}
	}
</style>
```

---

## Conclusión

Lumi UI proporciona:

✅ **38 componentes** production-ready  
✅ **Design system** completo y consistente  
✅ **Utilidades CSS** para layouts modernos  
✅ **100% Svelte 5** con runes modernas  
✅ **TypeScript** completo  
✅ **Accesibilidad** integrada  
✅ **Performance** optimizado  
✅ **Responsive** por defecto  
✅ **🆕 Gestión de permisos** integrada  
✅ **🆕 CRUD patterns** profesionales

**Usa este documento como referencia completa para construir dashboards escalables y modernos con Lumi UI.**

---

_Documento generado: 2025-10-10_  
_Versión: 1.1.0_  
_Lumi UI - Svelte 5 Component Library_
