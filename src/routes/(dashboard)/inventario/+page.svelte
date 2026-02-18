<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onDestroy } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Dialog,
		Input,
		PageHeader,
		SegmentedControl,
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

	const STOCK_FILTER_OPTIONS = [
		{ label: 'Todo', value: 'all', icon: 'listChecks' },
		{ label: 'Crítico', value: 'critical', icon: 'alertTriangle' },
		{ label: 'Bajo', value: 'low', icon: 'activity' },
		{ label: 'Saludable', value: 'healthy', icon: 'checkCircle' }
	] as const;

	const canRead = $derived(can('inventory:read'));
	const canUpdate = $derived(can('inventory:update'));

	let branches = $state<BranchCatalogItem[]>([]);
	let categories = $state<CategoryCatalogItem[]>([]);
	let items = $state<InventoryOverviewItem[]>([]);
	let summary = $state<InventoryOverviewSummary>(EMPTY_SUMMARY);
	let pagination = $state<InventoryPagination>(EMPTY_PAGINATION);

	let loadingStock = $state(false);
	let errorMessage = $state('');
	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;
	let fetchId = 0;

	let filterBranchCode = $state('');
	let filterCategoryCode = $state('all');
	let filterStock = $state<'all' | 'critical' | 'low' | 'healthy'>('all');
	let includeInactive = $state(false);

	let showThresholdDialog = $state(false);
	let thresholdProductCode = $state('');
	let thresholdBranchCode = $state('');
	let thresholdProductLabel = $state('');
	let thresholdReorderPoint = $state(0);
	let thresholdEmergencyPoint = $state(0);
	let submittingThreshold = $state(false);

	const branchOptions = $derived(
		branches
			.filter((branch) => branch.state)
			.map((branch) => ({ value: branch.code, label: branch.name }) as SelectOption)
	);

	const categoryOptions = $derived(
		[{ value: 'all', label: 'Todas las categorías' } as SelectOption].concat(
			categories.map((category) => ({ value: category.code, label: category.name }))
		)
	);

	const stockRows = $derived(items as unknown as TableRow[]);
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

		const preferredBranch = (data.selectedBranchCode as string | undefined) ?? '';
		if (!filterBranchCode) {
			filterBranchCode = preferredBranch || branches.find((branch) => branch.state)?.code || '';
		}
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
		thresholdProductLabel = item.product_name;
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
		}, 300);
	}

	async function loadStock(page = pagination.page): Promise<void> {
		if (!canRead || !filterBranchCode) return;

		const requestId = ++fetchId;
		loadingStock = true;
		errorMessage = '';

		try {
			const params = new SvelteURLSearchParams();
			params.set('branch_code', filterBranchCode);
			params.set('stock', filterStock as InventoryListFilterState);
			params.set('include_inactive', includeInactive ? 'true' : 'false');
			params.set('page', String(page));
			params.set('page_size', String(pagination.page_size || 30));

			if (filterCategoryCode !== 'all') {
				params.set('category_code', filterCategoryCode);
			}

			if (searchQuery.trim()) {
				params.set('search', searchQuery.trim());
			}

			const response = await fetch(`/api/inventory?${params.toString()}`);
			const payload = await response.json();

			if (requestId !== fetchId) return;
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo cargar el stock');
			}

			items = (payload.items ?? []) as InventoryOverviewItem[];
			summary = (payload.summary ?? EMPTY_SUMMARY) as InventoryOverviewSummary;
			pagination = (payload.pagination ?? EMPTY_PAGINATION) as InventoryPagination;
		} catch (caught) {
			if (requestId === fetchId) {
				errorMessage = caught instanceof Error ? caught.message : 'Error al cargar inventario';
			}
		} finally {
			if (requestId === fetchId) {
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
				throw new Error((payload?.message as string) || 'No se pudieron actualizar los umbrales');
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
		subtitle="Control claro por sede, optimizado para alto volumen"
		icon="boxes"
	>
		{#snippet actions()}
			<div class="lumi-flex lumi-flex--gap-sm">
				<Button
					type="border"
					color="info"
					icon="shoppingBag"
					onclick={() => goto(resolve('/inventario/compras'))}
				>
					Compras
				</Button>
				<Button
					type="filled"
					color="primary"
					icon="creditCard"
					onclick={() => goto(resolve('/inventario/ventas'))}
				>
					Ventas
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<Alert type="info" closable>
		Stock inicial: regístralo desde <strong>Compras</strong> como tipo <strong>Inicial</strong> y
		estado
		<strong>Recibido</strong>.
	</Alert>

	<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md">
		<StatCard
			title="Disponibles"
			value={summary.total_available}
			icon="package"
			color="success"
			subtitle="Unidades listas para venta"
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
			subtitle="Prioridad alta"
		/>
		<StatCard
			title="Registros"
			value={pagination.total}
			icon="listChecks"
			color="primary"
			subtitle="Resultados en la sede"
		/>
	</div>

	<Card spaced>
		<div class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap inventory-stock__toolbar">
			<div class="inventory-stock__toolbar-field">
				<Select
					label="Sede"
					value={filterBranchCode}
					options={branchOptions}
					clearable={false}
					onchange={async (value) => {
						filterBranchCode = typeof value === 'string' ? value : filterBranchCode;
						await loadStock(1);
					}}
				/>
			</div>
			<div class="inventory-stock__toolbar-field">
				<Select
					label="Categoría"
					value={filterCategoryCode}
					options={categoryOptions}
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
					placeholder="Ej: polo, SKU-100"
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
		<div class="inventory-stock__filter-state">
			<SegmentedControl
				value={filterStock}
				options={STOCK_FILTER_OPTIONS as unknown as {
					label: string;
					value: string;
					icon?: string;
				}[]}
				fullWidth
				onchange={async (value) => {
					filterStock = (typeof value === 'string' ? value : 'all') as typeof filterStock;
					await loadStock(1);
				}}
			/>
		</div>
	</Card>

	{#if !canRead}
		<Alert type="warning" closable>No tienes permisos para consultar inventario.</Alert>
	{:else}
		{#if errorMessage}
			<Alert type="danger" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
		{/if}

		<Card>
			<Table
				data={stockRows}
				hover
				loading={loadingStock}
				pagination={false}
				class="inventory-table inventory-table--stock"
			>
				{#snippet thead()}
					<th>Producto</th>
					<th>Disponible</th>
					<th>En camino</th>
					<th>Estado</th>
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
							>
								{item.product_name}
							</a>
							<span class="lumi-text--xs lumi-text--muted">{item.sku || 'Sin SKU'}</span>
						</div>
					</td>
					<td>{item.available}</td>
					<td>{item.inbound}</td>
					<td>
						<Chip color={stockColor(item.stock_state)} size="sm">
							{stockLabel(item.stock_state)}
						</Chip>
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

<Dialog bind:open={showThresholdDialog} title="Ajustar umbrales" size="sm">
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
			Guardar
		</Button>
	{/snippet}
</Dialog>

<style>
	.inventory-stock__toolbar {
		align-items: flex-end;
	}

	.inventory-stock__toolbar-field {
		flex: 1 1 220px;
		min-width: 220px;
	}

	.inventory-stock__toolbar-search {
		flex: 1 1 340px;
		min-width: 280px;
	}

	.inventory-stock__toolbar-toggle {
		flex: 0 0 auto;
	}

	.inventory-stock__filter-state {
		margin-top: var(--lumi-space-sm);
	}

	.inventory-stock__product-link {
		color: var(--lumi-color-primary);
		text-decoration: none;
		font-weight: var(--lumi-font-weight-semibold);
	}

	.inventory-stock__product-link:hover {
		text-decoration: underline;
	}

	.inventory-stock__pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-sm);
		flex-wrap: wrap;
	}

	:global(.inventory-table--stock .lumi-table__content) {
		min-width: 64rem;
	}

	@media (max-width: 1024px) {
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
