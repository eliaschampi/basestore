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
		Icon,
		Input,
		List,
		ListItem,
		PageHeader,
		PageSidebar,
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
	import { formatProductPrice } from '$lib/utils/products';
	import type {
		InventoryOverviewItem,
		InventoryOverviewSummary,
		InventoryPagination
	} from '$lib/types/inventory';
	import { resolveInventoryBranchCode, type InventoryListFilterState } from '$lib/utils/inventory';
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

	interface CategoryFolderItem {
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
		{ label: 'Critico', value: 'critical', icon: 'alertTriangle' },
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
	let showMobileSidebar = $state(false);

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

	const categoryFolders = $derived<CategoryFolderItem[]>([
		{ code: 'all', name: 'Todas las categorias' },
		...categories.map((category) => ({ code: category.code, name: category.name }))
	]);

	const stockRows = $derived(items as unknown as TableRow[]);
	const canGoPrev = $derived(pagination.page > 1);
	const canGoNext = $derived(pagination.page < pagination.total_pages);
	const activeBranchLabel = $derived.by(
		() =>
			branches.find((branch) => branch.code === filterBranchCode)?.name ?? 'Sin sede seleccionada'
	);
	const activeCategoryLabel = $derived.by(() => {
		if (filterCategoryCode === 'all') return 'Todas las categorias';
		return (
			categories.find((category) => category.code === filterCategoryCode)?.name ?? 'Sin categoria'
		);
	});
	const totalCostStockValue = $derived(
		items.reduce(
			(total, item) => total + item.available * toNumeric(item.cost_price),
			0
		)
	);

	onDestroy(() => {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
	});

	$effect(() => {
		const nextBranches = (data.branches ?? []) as BranchCatalogItem[];
		const nextCategories = (data.categories ?? []) as CategoryCatalogItem[];
		const nextItems = (data.items ?? []) as InventoryOverviewItem[];
		const nextSummary = (data.summary ?? EMPTY_SUMMARY) as InventoryOverviewSummary;
		const nextPagination = (data.pagination ?? EMPTY_PAGINATION) as InventoryPagination;

		branches = nextBranches;
		categories = nextCategories;
		items = nextItems;
		summary = nextSummary;
		pagination = nextPagination;

		const preferredBranch = (data.selectedBranchCode as string | undefined) ?? '';
		if (!filterBranchCode) {
			filterBranchCode = resolveInventoryBranchCode(nextBranches, preferredBranch);
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

	function toNumeric(value: string | number | null | undefined): number {
		if (typeof value === 'number') return value;
		const parsed = Number(value ?? 0);
		return Number.isFinite(parsed) ? parsed : 0;
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

	async function applyBranchFilter(value: unknown): Promise<void> {
		filterBranchCode = typeof value === 'string' ? value : filterBranchCode;
		await loadStock(1);
		showMobileSidebar = false;
	}

	async function applyCategoryFilter(categoryCode: string): Promise<void> {
		if (filterCategoryCode === categoryCode) {
			showMobileSidebar = false;
			return;
		}
		filterCategoryCode = categoryCode;
		await loadStock(1);
		showMobileSidebar = false;
	}

	async function applyStockFilter(value: string | number): Promise<void> {
		filterStock = (typeof value === 'string' ? value : 'all') as typeof filterStock;
		await loadStock(1);
		showMobileSidebar = false;
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
			params.set('include_inactive', 'true');
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
			showToast('Umbrales invalidos: reposicion >= emergencia >= 0', 'error');
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

	function navigateWithBranch(path: '/inventory/purchases' | '/inventory/sales'): void {
		const query = !filterBranchCode
			? ''
			: `?${new URLSearchParams({ branch_code: filterBranchCode }).toString()}`;
		const destination = `${path}${query}` as '/inventory/purchases' | '/inventory/sales';
		void goto(resolve(destination));
	}
</script>

<div class="lumi-stack lumi-space--md">
	<PageHeader
		title="Stock"
		subtitle="Vista operativa con sidebar de filtros estilo Drive"
		icon="boxes"
	>
		{#snippet actions()}
			<div
				class="lumi-flex lumi-flex--gap-sm lumi-align-items--center lumi-page-sidebar__header-actions"
			>
				<Button
					type="ghost"
					size="sm"
					icon="slidersHorizontal"
					class="lumi-page-sidebar__mobile-trigger"
					onclick={() => (showMobileSidebar = true)}
					aria-label="Abrir filtros de stock"
				/>
				<Button
					type="border"
					color="info"
					icon="shoppingBag"
					onclick={() => navigateWithBranch('/inventory/purchases')}
				>
					Compras
				</Button>
				<Button
					type="filled"
					color="primary"
					icon="creditCard"
					onclick={() => navigateWithBranch('/inventory/sales')}
				>
					Ventas
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<Alert type="info" closable>
		Stock inicial: registralo desde <strong>Compras</strong> como tipo <strong>Inicial</strong> y
		estado
		<strong>Recibido</strong>.
	</Alert>

	<div class="lumi-layout--two-columns lumi-page-sidebar-layout inventory-stock__layout">
		<PageSidebar
			bind:mobileOpen={showMobileSidebar}
			variant="inventory-stock"
			mobileTitle="Filtros de stock"
			mobileAriaLabel="Cerrar filtros de stock"
		>
			{#snippet sidebar()}
				{@render stockSidebar()}
			{/snippet}
		</PageSidebar>

		<section class="lumi-layout--content-right">
			<div class="lumi-stack lumi-space--sm">
				<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md inventory-stock__stats-grid">
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
						title="Valor stock"
						value={formatProductPrice(totalCostStockValue)}
						icon="wallet"
						color="warning"
						subtitle="Costo de unidades disponibles"
					/>
					<StatCard
						title="Criticos"
						value={summary.emergency_count + summary.out_of_stock_count}
						icon="alertTriangle"
						color="danger"
						subtitle={`${pagination.total} registros en la sede`}
					/>
				</div>

				{#if !canRead}
					<Alert type="warning" closable>No tienes permisos para consultar inventario.</Alert>
				{:else}
					{#if errorMessage}
						<Alert type="danger" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
					{/if}

					<Card spaced>
						<div class="inventory-stock__active-context">
							<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Contexto activo</p>
							<p class="lumi-margin--none lumi-font--semibold">
								{activeBranchLabel} · {activeCategoryLabel} · {pagination.total} registros
							</p>
						</div>
					</Card>

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
								<th>Costo</th>
								<th>Precio</th>
								<th>Valor costo</th>
								<th>Estado</th>
								<th>Ultimo movimiento</th>
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
								<td>{formatProductPrice(item.cost_price)}</td>
								<td>{formatProductPrice(item.price)}</td>
								<td>{formatProductPrice(item.available * toNumeric(item.cost_price))}</td>
								<td>
									<Chip color={stockColor(item.stock_state)} size="sm">
										{stockLabel(item.stock_state)}
									</Chip>
								</td>
								<td>{item.last_movement_at ? formatDate(item.last_movement_at) : '-'}</td>
								<td>
									<div class="inventory-stock__actions">
										<Button
											type="border"
											size="sm"
											icon="eye"
											color="primary"
											disabled={!canRead}
											onclick={() =>
												void goto(resolve(`/products/${item.product_code}` as '/'))}
										>
											Detalle
										</Button>
										<Button
											type="flat"
											size="sm"
											icon="slidersHorizontal"
											color="info"
											disabled={!canUpdate}
											onclick={() => openThresholdDialog(item)}
										/>
									</div>
								</td>
							{/snippet}
						</Table>
					</Card>

					<Card spaced>
						<div class="inventory-stock__pagination">
							<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
								Pagina {pagination.page} de {pagination.total_pages} · {pagination.total} registros
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

{#snippet stockSidebar()}
	<div class="lumi-stack lumi-space--sm">
		<div class="lumi-page-sidebar__section">
			<p class="lumi-page-sidebar__label">Vista</p>
			<div class="lumi-margin--bottom-sm">
				<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Estado de stock</p>
				<SegmentedControl
					value={filterStock}
					options={STOCK_FILTER_OPTIONS as unknown as {
						label: string;
						value: string;
						icon?: string;
					}[]}
					fullWidth
					onchange={(value) => void applyStockFilter(value)}
				/>
				<p class="lumi-margin--none lumi-text--xs lumi-text--muted">
					Se muestran productos activos e inactivos.
				</p>
			</div>
			<Select
				size="md"
				label="Sede"
				value={filterBranchCode}
				options={branchOptions}
				clearable={false}
				onchange={(value) => void applyBranchFilter(value)}
			/>
			<Input
				size="md"
				label="Buscar producto o SKU"
				placeholder="Ej: polo, SKU-100"
				icon="search"
				value={searchQuery}
				oninput={(event) =>
					handleSearchInput((event.currentTarget as HTMLInputElement | null)?.value ?? '')}
			/>
		</div>

		<div class="lumi-page-sidebar__section">
			<p class="lumi-page-sidebar__label">Categorias</p>
			<List size="sm" color="primary" class="inventory-stock__category-list">
				{#each categoryFolders as folder (folder.code)}
					<ListItem
						title={folder.name}
						subtitle={folder.code === 'all' ? 'Vista completa del catalogo' : undefined}
						icon={folder.code === 'all' ? 'layers' : 'folder'}
						clickable
						active={filterCategoryCode === folder.code}
						onclick={() => void applyCategoryFilter(folder.code)}
					>
						{#if filterCategoryCode === folder.code}
							<Icon icon="checkCircle" size="sm" />
						{/if}
					</ListItem>
				{/each}
			</List>
		</div>
	</div>
{/snippet}

<Dialog bind:open={showThresholdDialog} title="Ajustar umbrales" size="sm">
	<div class="lumi-stack lumi-space--sm">
		<p class="lumi-margin--none lumi-text--sm lumi-text--muted">{thresholdProductLabel}</p>
		<Slider
			label="Punto de reposicion"
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
	.inventory-stock__layout {
		align-items: start;
	}

	.inventory-stock__stats-grid {
		margin-bottom: var(--lumi-space-2xs);
	}

	:global(.inventory-stock__category-list) {
		max-height: var(--lumi-drive-sidebar-nav-max-height);
	}

	:global(.inventory-stock__category-list .lumi-list-item__actions) {
		color: var(--lumi-color-primary);
	}

	.inventory-stock__active-context {
		padding: var(--lumi-space-sm);
		border-radius: var(--lumi-radius-lg);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		background: color-mix(in srgb, var(--lumi-color-surface) 92%, transparent);
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

	.inventory-stock__actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-2xs);
		flex-wrap: wrap;
	}

	:global(.inventory-table--stock .lumi-table__content) {
		min-width: 78rem;
	}

	@media (max-width: 1200px) {
		.inventory-stock__stats-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 768px) {
		.inventory-stock__stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
