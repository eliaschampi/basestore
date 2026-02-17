<script lang="ts">
	import { resolve } from '$app/paths';
	import { onDestroy } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Dialog,
		Icon,
		Input,
		List,
		ListHeader,
		ListItem,
		PageHeader,
		Progress,
		Select,
		Slider,
		StatCard,
		Table
	} from '$lib/components';
	import type { SelectOption, TableRow } from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import { formatDate } from '$lib/utils/formatDate';
	import type {
		InventoryOverviewItem,
		InventoryOverviewSummary,
		InventoryPagination
	} from '$lib/types/inventory';
	import type { InventoryListFilterState } from '$lib/utils/inventory';
	import type { PageData } from './$types';

	interface BranchCatalogItem {
		code: string;
		name: string;
		state: boolean;
	}

	interface CategoryCatalogItem {
		code: string;
		name: string;
	}

	interface StockFilterOption {
		value: 'all' | 'critical' | 'low' | 'healthy';
		label: string;
		icon: string;
	}

	const { data }: { data: PageData } = $props();

	const EMPTY_SUMMARY: InventoryOverviewSummary = {
		total_products: 0,
		healthy_count: 0,
		low_count: 0,
		emergency_count: 0,
		out_of_stock_count: 0,
		in_transit_only_count: 0,
		total_available: 0,
		total_inbound: 0
	};

	const EMPTY_PAGINATION: InventoryPagination = {
		page: 1,
		page_size: 30,
		total: 0,
		total_pages: 1
	};

	const STOCK_FILTER_OPTIONS: StockFilterOption[] = [
		{ value: 'all', label: 'Todo', icon: 'listChecks' },
		{ value: 'critical', label: 'Crítico', icon: 'alertTriangle' },
		{ value: 'low', label: 'Bajo', icon: 'activity' },
		{ value: 'healthy', label: 'Saludable', icon: 'checkCircle' }
	];

	const canRead = $derived(can('inventory:read'));
	const canUpdate = $derived(can('inventory:update'));

	let branches = $state<BranchCatalogItem[]>([]);
	let categories = $state<CategoryCatalogItem[]>([]);
	let items = $state<InventoryOverviewItem[]>([]);
	let summary = $state<InventoryOverviewSummary>(EMPTY_SUMMARY);
	let pagination = $state<InventoryPagination>(EMPTY_PAGINATION);

	let loadingStock = $state(false);
	let errorMessage = $state('');

	let filterBranchCode = $state('all');
	let filterCategoryCode = $state('all');
	let filterStock = $state<InventoryListFilterState>('all');
	let includeInactive = $state(false);
	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;
	let stockRequestId = 0;

	let showThresholdDialog = $state(false);
	let thresholdProductCode = $state('');
	let thresholdBranchCode = $state('');
	let thresholdProductLabel = $state('');
	let thresholdReorderPoint = $state(0);
	let thresholdEmergencyPoint = $state(0);
	let submittingThreshold = $state(false);

	const categoryFilterOptions = $derived(
		[{ value: 'all', label: 'Todas las categorías' } as SelectOption].concat(
			categories.map((category) => ({ value: category.code, label: category.name }))
		)
	);

	const stockTableRows = $derived(items as unknown as TableRow[]);

	const stockFilterCountMap = $derived({
		all: summary.total_products,
		critical: summary.emergency_count + summary.out_of_stock_count,
		low: summary.low_count + summary.in_transit_only_count,
		healthy: summary.healthy_count
	});

	const canGoPrev = $derived(pagination.page > 1);
	const canGoNext = $derived(pagination.page < pagination.total_pages);

	onDestroy(() => {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
	});

	$effect(() => {
		branches = (data.branches ?? []) as BranchCatalogItem[];
		categories = (data.categories ?? []) as CategoryCatalogItem[];
		items = (data.items ?? []) as InventoryOverviewItem[];
		summary = (data.summary ?? EMPTY_SUMMARY) as InventoryOverviewSummary;
		pagination = (data.pagination ?? EMPTY_PAGINATION) as InventoryPagination;
	});

	function stockLabel(state: string): string {
		if (state === 'out_of_stock') return 'Sin stock';
		if (state === 'in_transit_only') return 'Solo en camino';
		if (state === 'emergency') return 'Emergencia';
		if (state === 'low') return 'Bajo';
		return 'Saludable';
	}

	function stockColor(state: string): 'success' | 'warning' | 'danger' | 'info' {
		if (state === 'out_of_stock' || state === 'emergency') return 'danger';
		if (state === 'low') return 'warning';
		if (state === 'in_transit_only') return 'info';
		return 'success';
	}

	function openThresholdDialog(item: InventoryOverviewItem): void {
		if (!canUpdate) return;
		thresholdProductCode = item.product_code;
		thresholdBranchCode = item.branch_code;
		thresholdProductLabel = `${item.product_name} · ${item.branch_name}`;
		thresholdReorderPoint = Number(item.reorder_point);
		thresholdEmergencyPoint = Number(item.emergency_point);
		showThresholdDialog = true;
	}

	function handleSearchInput(value: string): void {
		searchQuery = value;
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(() => {
			void loadStock(1);
		}, 320);
	}

	async function loadStock(page = pagination.page): Promise<void> {
		if (!canRead) return;

		const requestId = ++stockRequestId;
		loadingStock = true;
		errorMessage = '';

		try {
			const params = new SvelteURLSearchParams({
				stock: filterStock,
				include_inactive: includeInactive ? 'true' : 'false',
				page: String(page),
				page_size: String(pagination.page_size || 30)
			});

			if (filterBranchCode !== 'all') {
				params.set('branch_code', filterBranchCode);
			}

			if (filterCategoryCode !== 'all') {
				params.set('category_code', filterCategoryCode);
			}

			if (searchQuery.trim()) {
				params.set('search', searchQuery.trim());
			}

			const response = await fetch(`/api/inventory?${params.toString()}`);
			const payload = await response.json();

			if (requestId !== stockRequestId) {
				return;
			}

			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo cargar inventario');
			}

			items = (payload.items ?? []) as InventoryOverviewItem[];
			summary = (payload.summary ?? EMPTY_SUMMARY) as InventoryOverviewSummary;
			pagination = (payload.pagination ?? EMPTY_PAGINATION) as InventoryPagination;
			branches = (payload.filters?.branches ?? []) as BranchCatalogItem[];
			categories = (payload.filters?.categories ?? []) as CategoryCatalogItem[];
		} catch (caught) {
			if (requestId === stockRequestId) {
				errorMessage = caught instanceof Error ? caught.message : 'Error al cargar inventario';
			}
		} finally {
			if (requestId === stockRequestId) {
				loadingStock = false;
			}
		}
	}

	async function submitThresholds(): Promise<void> {
		if (submittingThreshold) return;

		if (
			!Number.isInteger(thresholdReorderPoint) ||
			!Number.isInteger(thresholdEmergencyPoint) ||
			thresholdReorderPoint < 0 ||
			thresholdEmergencyPoint < 0 ||
			thresholdReorderPoint < thresholdEmergencyPoint
		) {
			showToast('Umbrales inválidos: reposición >= emergencia >= 0', 'error');
			return;
		}

		submittingThreshold = true;
		try {
			const response = await fetch('/api/inventory', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					product_code: thresholdProductCode,
					branch_code: thresholdBranchCode,
					reorder_point: thresholdReorderPoint,
					emergency_point: thresholdEmergencyPoint
				})
			});

			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo actualizar umbrales');
			}

			showThresholdDialog = false;
			showToast('Umbrales actualizados', 'success');
			await loadStock(pagination.page);
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'Error al actualizar umbrales';
			showToast(message, 'error');
		} finally {
			submittingThreshold = false;
		}
	}
</script>

<div class="lumi-stack lumi-space--md">
	<PageHeader
		title="Stock"
		subtitle="Inventario vivo por sede, sin ajustes manuales y preparado para escala"
		icon="boxes"
	>
		{#snippet actions()}
			<div class="lumi-flex lumi-flex--gap-sm inventory-stock__header-actions">
				<a href={resolve('/inventario/compras')} class="inventory-stock__action-link">
					<Icon icon="shoppingBag" size="sm" />
					<span>Ir a Compras</span>
				</a>
				<a href={resolve('/inventario/ventas')} class="inventory-stock__action-link">
					<Icon icon="creditCard" size="sm" />
					<span>Ir a Ventas</span>
				</a>
			</div>
		{/snippet}
	</PageHeader>

	<Alert type="info" closable>
		Stock inicial: usa <strong>Compras</strong> con tipo <strong>Inicial</strong> y estado
		<strong>Recibido</strong>. No se permite modificar stock manualmente.
	</Alert>

	<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md">
		<StatCard
			title="Disponibles"
			value={summary.total_available}
			icon="package"
			color="success"
			subtitle="Unidades listas para vender"
		/>
		<StatCard
			title="En camino"
			value={summary.total_inbound}
			icon="clock"
			color="info"
			subtitle="Unidades inbound"
		/>
		<StatCard
			title="Críticos"
			value={summary.emergency_count + summary.out_of_stock_count}
			icon="alertTriangle"
			color="danger"
			subtitle="Emergencia y sin stock"
		/>
		<StatCard
			title="Registros"
			value={pagination.total}
			icon="listChecks"
			color="primary"
			subtitle="Filtrados para esta vista"
		/>
	</div>

	<div class="lumi-layout--two-columns inventory-stock__layout">
		<aside class="lumi-layout--sidebar-left inventory-stock__sidebar">
			<Card spaced>
				<div class="lumi-stack lumi-space--sm">
					<div class="inventory-stock__sidebar-section">
						<ListHeader title="Salud de stock" icon="activity" color="primary" />
						<List size="sm" color="primary">
							{#each STOCK_FILTER_OPTIONS as option (option.value)}
								<ListItem
									title={option.label}
									subtitle={`${stockFilterCountMap[option.value]} registros`}
									icon={option.icon}
									clickable
									active={filterStock === option.value}
									onclick={async () => {
										filterStock = option.value;
										await loadStock(1);
									}}
								/>
							{/each}
						</List>
					</div>

					<div class="inventory-stock__sidebar-section">
						<ListHeader title="Sedes" icon="building" color="info" />
						<List size="sm" color="info">
							<ListItem
								title="Todas las sedes"
								subtitle="Vista global"
								icon="building"
								clickable
								active={filterBranchCode === 'all'}
								onclick={async () => {
									filterBranchCode = 'all';
									await loadStock(1);
								}}
							/>
							{#each branches as branch (branch.code)}
								<ListItem
									title={branch.name}
									subtitle={branch.state ? 'Activa' : 'Inactiva'}
									icon={branch.state ? 'checkCircle' : 'xCircle'}
									clickable
									active={filterBranchCode === branch.code}
									onclick={async () => {
										filterBranchCode = branch.code;
										await loadStock(1);
									}}
								/>
							{/each}
						</List>
					</div>
				</div>
			</Card>
		</aside>

		<section class="lumi-layout--content-right">
			<div class="lumi-stack lumi-space--md">
				<Card spaced>
					<div class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap inventory-stock__toolbar">
						<div class="inventory-stock__toolbar-field">
							<Select
								label="Categoría"
								value={filterCategoryCode}
								options={categoryFilterOptions}
								clearable={false}
								onchange={async (value) => {
									filterCategoryCode = typeof value === 'string' ? value : 'all';
									await loadStock(1);
								}}
							/>
						</div>

						<div class="inventory-stock__toolbar-search">
							<Input
								label="Buscar producto o SKU"
								placeholder="Ej: camiseta, SKU-100"
								icon="search"
								value={searchQuery}
								oninput={(event) =>
									handleSearchInput((event.currentTarget as HTMLInputElement | null)?.value ?? '')}
							/>
						</div>

						<div class="inventory-stock__toolbar-toggle">
							<Button
								type={includeInactive ? 'filled' : 'border'}
								color={includeInactive ? 'warning' : 'primary'}
								icon={includeInactive ? 'eyeOff' : 'eye'}
								onclick={async () => {
									includeInactive = !includeInactive;
									await loadStock(1);
								}}
							>
								{includeInactive ? 'Incluye inactivos' : 'Solo activos'}
							</Button>
						</div>
					</div>
				</Card>

				{#if !canRead}
					<Alert type="warning" closable>No tienes permisos para consultar inventario.</Alert>
				{:else}
					{#if errorMessage}
						<Alert type="danger" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
					{/if}

					<Card>
						<Table data={stockTableRows} hover loading={loadingStock} pagination={false}>
							{#snippet thead()}
								<th>Producto</th>
								<th>Sede</th>
								<th>Disponibilidad</th>
								<th>Salud</th>
								<th>Último movimiento</th>
								<th>Acciones</th>
							{/snippet}

							{#snippet row({ row })}
								{@const item = row as unknown as InventoryOverviewItem}
								<td>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<a
											href={resolve(`/products/${item.product_code}`)}
											class="inventory-stock__product-link"
											title="Ver producto e imágenes"
										>
											{item.product_name}
										</a>
										<span class="lumi-text--xs lumi-text--muted">{item.sku || 'Sin SKU'}</span>
									</div>
								</td>
								<td>{item.branch_name}</td>
								<td>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span class="lumi-font--semibold">{item.available}</span>
										<span class="lumi-text--xs lumi-text--muted">
											On hand {item.on_hand} · En camino {item.inbound}
										</span>
										{#if item.awaiting_first_stock}
											<Chip color="warning" size="sm">Pendiente stock inicial</Chip>
										{/if}
									</div>
								</td>
								<td>
									<div class="inventory-stock__health-cell">
										<Progress
											value={item.stock_health_pct}
											color={stockColor(item.stock_state)}
											size="sm"
											showLabel
										/>
										<Chip color={stockColor(item.stock_state)} size="sm">
											{stockLabel(item.stock_state)}
										</Chip>
									</div>
								</td>
								<td>{item.last_movement_at ? formatDate(item.last_movement_at) : '—'}</td>
								<td>
									<Button
										type="flat"
										size="sm"
										icon="slidersHorizontal"
										color="info"
										disabled={!canUpdate}
										onclick={() => openThresholdDialog(item)}
									/>
								</td>
							{/snippet}
						</Table>
					</Card>

					<Card spaced>
						<div class="inventory-stock__pagination">
							<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
								Página {pagination.page} de {pagination.total_pages} · {pagination.total} registros
							</p>
							<div class="lumi-flex lumi-flex--gap-sm">
								<Button
									type="border"
									size="sm"
									icon="chevronLeft"
									disabled={!canGoPrev || loadingStock}
									onclick={() => void loadStock(pagination.page - 1)}
								>
									Anterior
								</Button>
								<Button
									type="border"
									size="sm"
									iconAfter
									icon="chevronRight"
									disabled={!canGoNext || loadingStock}
									onclick={() => void loadStock(pagination.page + 1)}
								>
									Siguiente
								</Button>
							</div>
						</div>
					</Card>
				{/if}
			</div>
		</section>
	</div>
</div>

<Dialog bind:open={showThresholdDialog} title="Ajustar umbrales de stock" size="sm">
	<div class="lumi-stack lumi-space--sm">
		<p class="lumi-margin--none lumi-text--sm lumi-text--muted">{thresholdProductLabel}</p>

		<Slider
			label="Punto de reposición"
			min={0}
			max={300}
			step={1}
			value={thresholdReorderPoint}
			showValue
			onchange={(value) => {
				thresholdReorderPoint = Number(value);
				if (thresholdEmergencyPoint > thresholdReorderPoint) {
					thresholdEmergencyPoint = thresholdReorderPoint;
				}
			}}
		/>

		<Slider
			label="Punto de emergencia"
			min={0}
			max={300}
			step={1}
			value={thresholdEmergencyPoint}
			showValue
			onchange={(value) => {
				const nextValue = Number(value);
				thresholdEmergencyPoint =
					nextValue > thresholdReorderPoint ? thresholdReorderPoint : nextValue;
			}}
		/>
	</div>

	{#snippet footer()}
		<Button type="border" onclick={() => (showThresholdDialog = false)}>Cancelar</Button>
		<Button
			type="filled"
			color="info"
			loading={submittingThreshold}
			onclick={() => void submitThresholds()}
		>
			Guardar umbrales
		</Button>
	{/snippet}
</Dialog>

<style>
	.inventory-stock__layout {
		align-items: stretch;
	}

	.inventory-stock__sidebar :global(.lumi-card) {
		height: 100%;
		background:
			linear-gradient(
				160deg,
				color-mix(in srgb, var(--lumi-color-primary) 5%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-info) 4%, transparent) 60%,
				transparent 100%
			),
			var(--lumi-color-surface);
	}

	.inventory-stock__sidebar-section {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
	}

	.inventory-stock__header-actions {
		flex-wrap: wrap;
	}

	.inventory-stock__action-link {
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-md);
		color: var(--lumi-color-text);
		text-decoration: none;
		background: var(--lumi-color-surface);
		transition: var(--lumi-transition-all);
	}

	.inventory-stock__action-link:hover {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 40%, var(--lumi-color-border-light));
		background: color-mix(in srgb, var(--lumi-color-primary) 8%, var(--lumi-color-surface));
	}

	.inventory-stock__toolbar {
		align-items: flex-end;
	}

	.inventory-stock__toolbar-field {
		flex: 1 1 260px;
		min-width: 220px;
	}

	.inventory-stock__toolbar-search {
		flex: 1 1 360px;
		min-width: 280px;
	}

	.inventory-stock__toolbar-toggle {
		flex: 0 0 auto;
	}

	.inventory-stock__product-link {
		color: var(--lumi-color-primary);
		font-weight: var(--lumi-font-weight-semibold);
		text-decoration: none;
	}

	.inventory-stock__product-link:hover {
		text-decoration: underline;
	}

	.inventory-stock__health-cell {
		min-width: 150px;
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	.inventory-stock__pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-sm);
		flex-wrap: wrap;
	}

	@media (max-width: 1024px) {
		.inventory-stock__sidebar {
			display: none;
		}

		.inventory-stock__toolbar {
			align-items: stretch;
		}

		.inventory-stock__toolbar-field,
		.inventory-stock__toolbar-search,
		.inventory-stock__toolbar-toggle {
			flex-basis: 100%;
			min-width: 100%;
		}
	}
</style>
