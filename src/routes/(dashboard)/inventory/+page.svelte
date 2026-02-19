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
		InventoryMovementListItem,
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
	let includeInactive = $state(false);
	let showMobileSidebar = $state(false);

	let showThresholdDialog = $state(false);
	let thresholdProductCode = $state('');
	let thresholdBranchCode = $state('');
	let thresholdProductLabel = $state('');
	let thresholdReorderPoint = $state(0);
	let thresholdEmergencyPoint = $state(0);
	let submittingThreshold = $state(false);

	let showMovementsDialog = $state(false);
	let movementsLoading = $state(false);
	let movementsError = $state('');
	let movementsProductCode = $state('');
	let movementsBranchCode = $state('');
	let movementsProductLabel = $state('');
	let movementsBranchLabel = $state('');
	let movements = $state<InventoryMovementListItem[]>([]);

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
	const movementRows = $derived(movements as unknown as TableRow[]);
	const canGoPrev = $derived(pagination.page > 1);
	const canGoNext = $derived(pagination.page < pagination.total_pages);
	const activeBranchLabel = $derived.by(
		() => branches.find((branch) => branch.code === filterBranchCode)?.name ?? 'Sin sede seleccionada'
	);
	const activeCategoryLabel = $derived.by(() => {
		if (filterCategoryCode === 'all') return 'Todas las categorias';
		return categories.find((category) => category.code === filterCategoryCode)?.name ?? 'Sin categoria';
	});

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

	function openThresholdDialog(item: InventoryOverviewItem): void {
		if (!canUpdate) return;
		thresholdProductCode = item.product_code;
		thresholdBranchCode = item.branch_code;
		thresholdProductLabel = item.product_name;
		thresholdReorderPoint = Number(item.reorder_point);
		thresholdEmergencyPoint = Number(item.emergency_point);
		showThresholdDialog = true;
	}

	function movementReasonLabel(reason: InventoryMovementListItem['reason']): string {
		if (reason === 'purchase') return 'Compra';
		if (reason === 'sale') return 'Venta';
		if (reason === 'purchase_refund') return 'Reembolso compra';
		return 'Ajuste manual';
	}

	function movementDirectionLabel(direction: InventoryMovementListItem['direction']): string {
		return direction === 'in' ? 'Entrada' : 'Salida';
	}

	function movementDirectionColor(
		direction: InventoryMovementListItem['direction']
	): 'success' | 'danger' {
		return direction === 'in' ? 'success' : 'danger';
	}

	async function loadMovements(
		productCode = movementsProductCode,
		branchCode = movementsBranchCode
	): Promise<void> {
		if (!canRead || !productCode || !branchCode) return;

		movementsLoading = true;
		movementsError = '';
		try {
			const params = new SvelteURLSearchParams({
				product_code: productCode,
				branch_code: branchCode,
				limit: '120'
			});

			const response = await fetch(`/api/inventory/movements?${params.toString()}`);
			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo cargar el histórico');
			}

			movements = (payload.movements ?? []) as InventoryMovementListItem[];
		} catch (caught) {
			movementsError = caught instanceof Error ? caught.message : 'Error al cargar movimientos';
		} finally {
			movementsLoading = false;
		}
	}

	async function openMovementsDialog(item: InventoryOverviewItem): Promise<void> {
		if (!canRead) return;
		movementsProductCode = item.product_code;
		movementsBranchCode = item.branch_code;
		movementsProductLabel = item.product_name;
		movementsBranchLabel = item.branch_name;
		showMovementsDialog = true;
		await loadMovements(item.product_code, item.branch_code);
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

	async function toggleInactive(): Promise<void> {
		includeInactive = !includeInactive;
		await loadStock(1);
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
		const target = resolve(path);
		if (!filterBranchCode) {
			window.location.assign(target);
			return;
		}

		const params = new URLSearchParams({ branch_code: filterBranchCode });
		window.location.assign(`${target}?${params.toString()}`);
	}
</script>

<div class="lumi-stack lumi-space--md">
	<PageHeader
		title="Stock"
		subtitle="Vista operativa con sidebar de filtros estilo Drive"
		icon="boxes"
	>
		{#snippet actions()}
			<div class="lumi-flex lumi-flex--gap-sm lumi-align-items--center inventory-stock__header-actions">
				<button
					type="button"
					class="inventory-stock__mobile-toggle"
					onclick={() => (showMobileSidebar = true)}
				>
					Filtros
				</button>
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
		Stock inicial: registralo desde <strong>Compras</strong> como tipo <strong>Inicial</strong> y estado
		<strong>Recibido</strong>.
	</Alert>

	<div class="lumi-layout--two-columns inventory-stock__layout">
		<aside class="lumi-layout--sidebar-left inventory-stock__sidebar">
			<Card spaced>
				{@render stockSidebar()}
			</Card>
		</aside>

		{#if showMobileSidebar}
			<button
				type="button"
				class="inventory-stock__drawer-backdrop"
				onclick={() => (showMobileSidebar = false)}
				aria-label="Cerrar filtros de stock"
			></button>
			<aside class="inventory-stock__drawer">
				<Card spaced>
					<div class="inventory-stock__drawer-header">
						<p class="lumi-margin--none lumi-font--semibold">Filtros de stock</p>
						<Button type="flat" size="sm" icon="x" onclick={() => (showMobileSidebar = false)} />
					</div>
					{@render stockSidebar()}
				</Card>
			</aside>
		{/if}

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
						title="Criticos"
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
												icon="list"
												color="primary"
												disabled={!canRead}
												onclick={() => void openMovementsDialog(item)}
											>
												Historico
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
		<div class="inventory-stock__sidebar-section">
			<p class="inventory-stock__sidebar-label">Vista</p>
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
			<div>
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
			</div>
			<Button
				type={includeInactive ? 'filled' : 'border'}
				color={includeInactive ? 'warning' : 'primary'}
				size="md"
				icon={includeInactive ? 'eyeOff' : 'eye'}
				onclick={() => void toggleInactive()}
			>
				{includeInactive ? 'Incluye inactivos' : 'Solo activos'}
			</Button>
		</div>

		<div class="inventory-stock__sidebar-section">
			<p class="inventory-stock__sidebar-label">Categorias</p>
			<div class="inventory-stock__folders">
				{#each categoryFolders as folder (folder.code)}
					<button
						type="button"
						class="inventory-stock__folder {filterCategoryCode === folder.code
							? 'inventory-stock__folder--active'
							: ''}"
						onclick={() => void applyCategoryFilter(folder.code)}
					>
						<span class="inventory-stock__folder-main">
							<Icon icon="folder" size="sm" />
							<span>{folder.name}</span>
						</span>
						{#if filterCategoryCode === folder.code}
							<Icon icon="checkCircle" size="sm" />
						{/if}
					</button>
				{/each}
			</div>
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

<Dialog bind:open={showMovementsDialog} title="Historico de entradas y salidas" size="lg">
	<div class="lumi-stack lumi-space--sm">
		<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
			{movementsProductLabel || 'Producto'} · {movementsBranchLabel || 'Sede'}
		</p>
		{#if movementsError}
			<Alert type="danger" closable onclose={() => (movementsError = '')}>{movementsError}</Alert>
		{/if}
		<Table
			data={movementRows}
			hover
			loading={movementsLoading}
			pagination={false}
			class="inventory-table inventory-table--movements"
		>
			{#snippet thead()}
				<th>Fecha</th>
				<th>Tipo</th>
				<th>Motivo</th>
				<th>Cantidad</th>
				<th>Nota</th>
			{/snippet}

			{#snippet row({ row })}
				{@const movement = row as unknown as InventoryMovementListItem}
				<td>{formatDate(movement.occurred_at)}</td>
				<td>
					<Chip size="sm" color={movementDirectionColor(movement.direction)}>
						{movementDirectionLabel(movement.direction)}
					</Chip>
				</td>
				<td>{movementReasonLabel(movement.reason)}</td>
				<td>
					{movement.direction === 'in' ? '+' : '-'}{movement.quantity}
				</td>
				<td>{movement.note || '-'}</td>
			{/snippet}
		</Table>
	</div>
	{#snippet footer()}
		<Button type="border" onclick={() => (showMovementsDialog = false)}>Cerrar</Button>
	{/snippet}
</Dialog>

<style>
	.inventory-stock__layout {
		align-items: start;
	}

	.inventory-stock__header-actions {
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.inventory-stock__stats-grid {
		margin-bottom: var(--lumi-space-2xs);
	}

	.inventory-stock__sidebar {
		min-width: 0;
	}

	.inventory-stock__sidebar :global(.lumi-card) {
		height: 100%;
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		background:
			linear-gradient(
				160deg,
				color-mix(in srgb, var(--lumi-color-primary) 6%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-info) 5%, transparent) 52%,
				transparent 100%
			),
			color-mix(in srgb, var(--lumi-color-surface) 94%, transparent);
		backdrop-filter: blur(var(--lumi-blur-md));
	}

	.inventory-stock__sidebar-section {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
	}

	.inventory-stock__sidebar-label {
		margin: 0;
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-semibold);
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--lumi-color-text-muted);
	}

	.inventory-stock__folders {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	.inventory-stock__folder {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-sm);
		width: 100%;
		padding: var(--lumi-space-sm);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-md);
		background: color-mix(in srgb, var(--lumi-color-surface) 94%, transparent);
		color: var(--lumi-color-text);
		font: inherit;
		cursor: pointer;
		transition: var(--lumi-transition-all);
	}

	.inventory-stock__folder:hover {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 32%, var(--lumi-color-border-light));
		background: color-mix(in srgb, var(--lumi-color-primary) 6%, var(--lumi-color-surface));
	}

	.inventory-stock__folder--active {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 36%, var(--lumi-color-border-light));
		background: color-mix(in srgb, var(--lumi-color-primary) 10%, var(--lumi-color-surface));
		color: var(--lumi-color-primary);
	}

	.inventory-stock__folder-main {
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		min-width: 0;
	}

	.inventory-stock__folder-main span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
		min-width: 64rem;
	}

	:global(.inventory-table--movements .lumi-table__content) {
		min-width: 48rem;
	}

	.inventory-stock__mobile-toggle {
		display: none;
		align-items: center;
		justify-content: center;
		padding: var(--lumi-space-sm);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-md);
		background: var(--lumi-color-surface);
		color: var(--lumi-color-text);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		flex-shrink: 0;
	}

	.inventory-stock__mobile-toggle:hover {
		background: var(--lumi-color-background-hover);
		border-color: var(--lumi-color-primary);
	}

	.inventory-stock__drawer-backdrop {
		display: none;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
	}

	.inventory-stock__drawer {
		display: none;
	}

	.inventory-stock__drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	@media (max-width: 1200px) {
		.inventory-stock__stats-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 1024px) {
		.inventory-stock__layout {
			grid-template-columns: 1fr;
		}

		.inventory-stock__sidebar {
			display: none;
		}

		.inventory-stock__header-actions {
			justify-content: flex-start;
		}

		.inventory-stock__mobile-toggle {
			display: flex;
			padding: var(--lumi-space-xs) var(--lumi-space-sm);
		}

		.inventory-stock__drawer-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			z-index: var(--lumi-z-modal);
			background: var(--lumi-color-overlay);
			backdrop-filter: blur(var(--lumi-blur-sm));
			animation: lumi-fade-in 0.2s ease;
		}

		.inventory-stock__drawer {
			display: block;
			position: fixed;
			top: 0;
			left: 0;
			bottom: 0;
			width: min(var(--lumi-drive-drawer-width), 85vw);
			z-index: calc(var(--lumi-z-modal) + 1);
			padding: var(--lumi-space-sm);
			overflow-y: auto;
			animation: inventory-stock-drawer-slide 0.25s cubic-bezier(0.2, 0, 0.13, 1.5);
		}

		.inventory-stock__drawer :global(.lumi-card) {
			height: 100%;
		}
	}

	@media (max-width: 768px) {
		.inventory-stock__stats-grid {
			grid-template-columns: 1fr;
		}
	}

	@keyframes inventory-stock-drawer-slide {
		from {
			transform: translateX(-100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
</style>
