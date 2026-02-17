<script lang="ts">
	import { onDestroy } from 'svelte';
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
		Select,
		StatCard,
		Table,
		Textarea
	} from '$lib/components';
	import type { SelectOption, TableRow } from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import { formatDate } from '$lib/utils/formatDate';
	import type {
		InventoryMovementListItem,
		InventoryOverviewItem,
		InventoryOverviewSummary,
		InventoryPurchaseListItem,
		InventorySaleListItem
	} from '$lib/types/inventory';
	import {
		type InventoryListFilterState,
		type InventoryPurchaseOrigin,
		type InventoryPurchaseState
	} from '$lib/utils/inventory';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	interface BranchCatalogItem {
		code: string;
		name: string;
		state: boolean;
	}

	interface CategoryCatalogItem {
		code: string;
		name: string;
	}

	interface ProductCatalogItem {
		code: string;
		name: string;
		category_code: string | null;
		is_active: boolean;
	}

	interface StockFilterOption {
		value: InventoryListFilterState;
		label: string;
		icon: string;
	}

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

	const STOCK_FILTER_OPTIONS: StockFilterOption[] = [
		{ value: 'all', label: 'Todo el inventario', icon: 'listChecks' },
		{ value: 'critical', label: 'Crítico', icon: 'alertCircle' },
		{ value: 'out_of_stock', label: 'Sin stock', icon: 'xCircle' },
		{ value: 'emergency', label: 'Emergencia', icon: 'alertTriangle' },
		{ value: 'low', label: 'Bajo', icon: 'activity' },
		{ value: 'in_transit_only', label: 'Solo en camino', icon: 'clock' },
		{ value: 'healthy', label: 'Saludable', icon: 'checkCircle' }
	];

	const PURCHASE_ORIGIN_OPTIONS: SelectOption[] = [
		{ value: 'temu', label: 'Temu' },
		{ value: 'aliexpress', label: 'AliExpress' },
		{ value: 'lima', label: 'Lima' }
	];

	const PURCHASE_STATE_OPTIONS: SelectOption[] = [
		{ value: 'in_transit', label: 'En camino' },
		{ value: 'received', label: 'Recibido' }
	];

	const canRead = $derived(can('inventory:read'));
	const canCreate = $derived(can('inventory:create'));
	const canUpdate = $derived(can('inventory:update'));

	let branches = $state<BranchCatalogItem[]>([]);
	let categories = $state<CategoryCatalogItem[]>([]);
	let products = $state<ProductCatalogItem[]>([]);

	let items = $state<InventoryOverviewItem[]>([]);
	let summary = $state<InventoryOverviewSummary>(EMPTY_SUMMARY);
	let recentPurchases = $state<InventoryPurchaseListItem[]>([]);
	let recentSales = $state<InventorySaleListItem[]>([]);
	let recentMovements = $state<InventoryMovementListItem[]>([]);

	let loadingInventory = $state(false);
	let loadingActivity = $state(false);
	let errorMessage = $state('');

	let showMobileSidebar = $state(false);
	let showBuyDialog = $state(false);
	let showSaleDialog = $state(false);
	let showThresholdDialog = $state(false);

	let filterBranchCode = $state('all');
	let filterCategoryCode = $state('all');
	let filterStock = $state<InventoryListFilterState>('all');
	let includeInactive = $state(false);
	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;
	let inventoryRequestId = 0;

	let buyProductCode = $state('');
	let buyBranchCode = $state('');
	let buyOrigin = $state<InventoryPurchaseOrigin>('aliexpress');
	let buyQuantity = $state('1');
	let buyState = $state<InventoryPurchaseState>('in_transit');
	let buyOrderedAt = $state(getCurrentDateInputValue());
	let buyUnitCost = $state('');
	let buyNote = $state('');
	let submittingBuy = $state(false);

	let saleProductCode = $state('');
	let saleBranchCode = $state('');
	let saleQuantity = $state('1');
	let saleCustomerName = $state('');
	let saleCustomerPhone = $state('');
	let saleDate = $state(getCurrentDateInputValue());
	let saleNote = $state('');
	let submittingSale = $state(false);

	let thresholdProductCode = $state('');
	let thresholdBranchCode = $state('');
	let thresholdProductLabel = $state('');
	let thresholdReorderPoint = $state('0');
	let thresholdEmergencyPoint = $state('0');
	let submittingThreshold = $state(false);

	const branchFilterOptions = $derived(
		[{ value: 'all', label: 'Todas las sedes' } as SelectOption].concat(
			branches.map((branch) => ({ value: branch.code, label: branch.name }))
		)
	);

	const categoryFilterOptions = $derived(
		[{ value: 'all', label: 'Todas las categorías' } as SelectOption].concat(
			categories.map((category) => ({ value: category.code, label: category.name }))
		)
	);

	const activeProductOptions = $derived(
		products.filter((product) => product.is_active).map((product) => ({
			value: product.code,
			label: product.name
		}))
	);

	const stockFilterCountMap = $derived({
		all: summary.total_products,
		critical: summary.emergency_count + summary.out_of_stock_count,
		out_of_stock: summary.out_of_stock_count,
		emergency: summary.emergency_count,
		low: summary.low_count,
		in_transit_only: summary.in_transit_only_count,
		healthy: summary.healthy_count
	});

	const inventoryTableRows = $derived(items as unknown as TableRow[]);
	const purchaseTableRows = $derived(recentPurchases as unknown as TableRow[]);
	const salesTableRows = $derived(recentSales as unknown as TableRow[]);

	$effect(() => {
		branches = (data.branches ?? []) as BranchCatalogItem[];
		categories = (data.categories ?? []) as CategoryCatalogItem[];
		products = (data.products ?? []) as ProductCatalogItem[];
		items = (data.items ?? []) as InventoryOverviewItem[];
		summary = (data.summary ?? EMPTY_SUMMARY) as InventoryOverviewSummary;
		recentPurchases = (data.recentPurchases ?? []) as InventoryPurchaseListItem[];
		recentSales = (data.recentSales ?? []) as InventorySaleListItem[];
		recentMovements = (data.recentMovements ?? []) as InventoryMovementListItem[];
	});

	onDestroy(() => {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
	});

	function getCurrentDateInputValue(): string {
		return new Date().toISOString().slice(0, 10);
	}

	function stockLabel(state: string): string {
		if (state === 'out_of_stock') return 'Sin stock';
		if (state === 'in_transit_only') return 'Solo en camino';
		if (state === 'emergency') return 'Emergencia';
		if (state === 'low') return 'Bajo';
		return 'Saludable';
	}

	function stockColor(state: string): 'success' | 'warning' | 'danger' | 'info' {
		if (state === 'out_of_stock') return 'danger';
		if (state === 'emergency') return 'danger';
		if (state === 'low') return 'warning';
		if (state === 'in_transit_only') return 'info';
		return 'success';
	}

	function purchaseStateLabel(state: string): string {
		if (state === 'in_transit') return 'En camino';
		if (state === 'received') return 'Recibido';
		if (state === 'refunded') return 'Reembolsado';
		return state;
	}

	function purchaseStateColor(state: string): 'warning' | 'success' | 'danger' {
		if (state === 'in_transit') return 'warning';
		if (state === 'received') return 'success';
		return 'danger';
	}

	function movementReasonLabel(reason: string): string {
		if (reason === 'purchase') return 'Compra';
		if (reason === 'sale') return 'Venta';
		if (reason === 'purchase_refund') return 'Reembolso';
		return 'Ajuste';
	}

	function movementDirectionColor(direction: string): 'success' | 'danger' {
		return direction === 'in' ? 'success' : 'danger';
	}

	function openBuyDialog(): void {
		if (!canCreate) return;
		buyProductCode = '';
		buyBranchCode = filterBranchCode !== 'all' ? filterBranchCode : '';
		buyOrigin = 'aliexpress';
		buyQuantity = '1';
		buyState = 'in_transit';
		buyOrderedAt = getCurrentDateInputValue();
		buyUnitCost = '';
		buyNote = '';
		showBuyDialog = true;
	}

	function openSaleDialog(): void {
		if (!canCreate) return;
		saleProductCode = '';
		saleBranchCode = filterBranchCode !== 'all' ? filterBranchCode : '';
		saleQuantity = '1';
		saleCustomerName = '';
		saleCustomerPhone = '';
		saleDate = getCurrentDateInputValue();
		saleNote = '';
		showSaleDialog = true;
	}

	function openThresholdDialog(item: InventoryOverviewItem): void {
		if (!canUpdate) return;
		thresholdProductCode = item.product_code;
		thresholdBranchCode = item.branch_code;
		thresholdProductLabel = `${item.product_name} · ${item.branch_name}`;
		thresholdReorderPoint = String(item.reorder_point);
		thresholdEmergencyPoint = String(item.emergency_point);
		showThresholdDialog = true;
	}

	function handleSearchInput(value: string): void {
		searchQuery = value;

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(() => {
			void loadInventory();
		}, 300);
	}

	function toQueryString(entries: Array<[string, string | undefined]>): string {
		const serialized = entries
			.filter(([, value]) => value !== undefined && value !== '')
			.map(
				([key, value]) =>
					`${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`
			);
		return serialized.length > 0 ? `?${serialized.join('&')}` : '';
	}

	async function loadInventory(): Promise<void> {
		if (!canRead) {
			return;
		}

		const requestId = ++inventoryRequestId;
		loadingInventory = true;
		errorMessage = '';

		try {
			const queryString = toQueryString([
				['stock', filterStock],
				['include_inactive', includeInactive ? 'true' : 'false'],
				['branch_code', filterBranchCode !== 'all' ? filterBranchCode : undefined],
				['category_code', filterCategoryCode !== 'all' ? filterCategoryCode : undefined],
				['search', searchQuery.trim() || undefined]
			]);
			const response = await fetch(`/api/inventory${queryString}`);
			const payload = await response.json();

			if (requestId !== inventoryRequestId) {
				return;
			}

			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo cargar inventario');
			}

			items = (payload.items ?? []) as InventoryOverviewItem[];
			summary = (payload.summary ?? EMPTY_SUMMARY) as InventoryOverviewSummary;
			branches = (payload.filters?.branches ?? []) as BranchCatalogItem[];
			categories = (payload.filters?.categories ?? []) as CategoryCatalogItem[];
			products = (payload.filters?.products ?? []) as ProductCatalogItem[];
		} catch (caught) {
			if (requestId === inventoryRequestId) {
				errorMessage = caught instanceof Error ? caught.message : 'Error al cargar inventario';
			}
		} finally {
			if (requestId === inventoryRequestId) {
				loadingInventory = false;
			}
		}
	}

	async function loadActivity(): Promise<void> {
		if (!canRead) {
			return;
		}

		loadingActivity = true;
		try {
			const branchCode = filterBranchCode !== 'all' ? filterBranchCode : undefined;
			const [purchasesRes, salesRes, movementsRes] = await Promise.all([
				fetch(`/api/inventory/purchases${toQueryString([['branch_code', branchCode], ['limit', '8']])}`),
				fetch(`/api/inventory/sales${toQueryString([['branch_code', branchCode], ['limit', '8']])}`),
				fetch(`/api/inventory/movements${toQueryString([['branch_code', branchCode], ['limit', '12']])}`)
			]);

			const [purchasesPayload, salesPayload, movementsPayload] = await Promise.all([
				purchasesRes.json(),
				salesRes.json(),
				movementsRes.json()
			]);

			if (purchasesRes.ok) {
				recentPurchases = (purchasesPayload.purchases ?? []) as InventoryPurchaseListItem[];
			}

			if (salesRes.ok) {
				recentSales = (salesPayload.sales ?? []) as InventorySaleListItem[];
			}

			if (movementsRes.ok) {
				recentMovements = (movementsPayload.movements ?? []) as InventoryMovementListItem[];
			}
		} catch {
			// Non-blocking activity stream
		} finally {
			loadingActivity = false;
		}
	}

	async function reloadData(): Promise<void> {
		await Promise.all([loadInventory(), loadActivity()]);
	}

	async function applyFilterStock(nextStock: InventoryListFilterState): Promise<void> {
		if (filterStock === nextStock) {
			return;
		}

		filterStock = nextStock;
		showMobileSidebar = false;
		await loadInventory();
	}

	async function applyFilterBranch(branchCode: string): Promise<void> {
		if (filterBranchCode === branchCode) {
			return;
		}

		filterBranchCode = branchCode;
		showMobileSidebar = false;
		await reloadData();
	}

	async function submitBuy(): Promise<void> {
		if (submittingBuy) {
			return;
		}

		const quantity = Number.parseInt(buyQuantity, 10);
		if (!buyProductCode || !buyBranchCode || !Number.isInteger(quantity) || quantity <= 0) {
			showToast('Completa producto, sede y cantidad válida', 'error');
			return;
		}

		submittingBuy = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/inventory/purchases', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					product_code: buyProductCode,
					branch_code: buyBranchCode,
					origin: buyOrigin,
					quantity,
					state: buyState,
					ordered_at: buyOrderedAt,
					unit_cost: buyUnitCost.trim() ? Number.parseFloat(buyUnitCost) : null,
					note: buyNote.trim()
				})
			});

			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo registrar la compra');
			}

			showBuyDialog = false;
			showToast('Compra registrada', 'success');
			await reloadData();
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'Error al registrar compra';
			showToast(message, 'error');
		} finally {
			submittingBuy = false;
		}
	}

	async function submitSale(): Promise<void> {
		if (submittingSale) {
			return;
		}

		const quantity = Number.parseInt(saleQuantity, 10);
		if (
			!saleProductCode ||
			!saleBranchCode ||
			!saleCustomerName.trim() ||
			!Number.isInteger(quantity) ||
			quantity <= 0
		) {
			showToast('Completa producto, sede, cliente y cantidad válida', 'error');
			return;
		}

		submittingSale = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/inventory/sales', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					product_code: saleProductCode,
					branch_code: saleBranchCode,
					quantity,
					customer_name: saleCustomerName.trim(),
					customer_phone: saleCustomerPhone.trim(),
					sold_at: saleDate,
					note: saleNote.trim()
				})
			});

			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo registrar la venta');
			}

			showSaleDialog = false;
			showToast('Venta registrada', 'success');
			await reloadData();
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'Error al registrar venta';
			showToast(message, 'error');
		} finally {
			submittingSale = false;
		}
	}

	async function submitThresholds(): Promise<void> {
		if (submittingThreshold) {
			return;
		}

		const reorderPoint = Number.parseInt(thresholdReorderPoint, 10);
		const emergencyPoint = Number.parseInt(thresholdEmergencyPoint, 10);

		if (
			!Number.isInteger(reorderPoint) ||
			!Number.isInteger(emergencyPoint) ||
			reorderPoint < 0 ||
			emergencyPoint < 0 ||
			reorderPoint < emergencyPoint
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
					reorder_point: reorderPoint,
					emergency_point: emergencyPoint
				})
			});

			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo actualizar umbrales');
			}

			showThresholdDialog = false;
			showToast('Umbrales actualizados', 'success');
			await loadInventory();
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'Error al actualizar umbrales';
			showToast(message, 'error');
		} finally {
			submittingThreshold = false;
		}
	}

	async function updatePurchaseState(
		purchaseCode: string,
		nextState: InventoryPurchaseState
	): Promise<void> {
		if (!canUpdate) {
			return;
		}

		try {
			const response = await fetch(`/api/inventory/purchases/${purchaseCode}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ state: nextState })
			});

			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo actualizar la compra');
			}

			showToast('Estado de compra actualizado', 'success');
			await reloadData();
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'Error al actualizar compra';
			showToast(message, 'error');
		}
	}
</script>

<div class="lumi-stack lumi-space--lg">
	<PageHeader
		title="Inventario"
		subtitle="Flujo moderno para compras rápidas, stock y ventas sin complejidad"
		icon="listChecks"
	>
		{#snippet actions()}
			<div class="lumi-flex lumi-flex--gap-sm inventory-page__header-actions">
				<button
					type="button"
					class="inventory-page__mobile-toggle"
					onclick={() => (showMobileSidebar = true)}
					aria-label="Abrir filtros"
				>
					<Icon icon="menu" size="sm" />
				</button>

				<Button type="border" color="info" icon="shoppingBag" onclick={openBuyDialog} disabled={!canCreate}>
					Registrar compra
				</Button>
				<Button
					type="filled"
					color="primary"
					icon="creditCard"
					onclick={openSaleDialog}
					disabled={!canCreate}
				>
					Registrar venta
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md">
		<StatCard
			title="Disponibles"
			value={summary.total_available}
			icon="package"
			color="success"
			subtitle="Unidades listas para vender"
		/>
		<StatCard
			title="En Camino"
			value={summary.total_inbound}
			icon="clock"
			color="info"
			subtitle="Unidades próximas a ingresar"
		/>
		<StatCard
			title="Críticos"
			value={summary.emergency_count + summary.out_of_stock_count}
			icon="alertTriangle"
			color="danger"
			subtitle="Emergencia + sin stock"
		/>
		<StatCard
			title="SKUs Activos"
			value={summary.total_products}
			icon="listChecks"
			color="primary"
			subtitle="Productos con balance en sedes"
		/>
	</div>

	<div class="lumi-layout--two-columns inventory-page__layout">
		<aside class="lumi-layout--sidebar-left inventory-page__sidebar">
			<Card spaced>
				<div class="lumi-stack lumi-space--sm">
					<div class="inventory-page__sidebar-section">
						<ListHeader title="Salud de stock" icon="activity" color="primary" />
						<List size="sm" color="primary">
							{#each STOCK_FILTER_OPTIONS as option (option.value)}
								<ListItem
									title={option.label}
									subtitle={`${stockFilterCountMap[option.value]} registros`}
									icon={option.icon}
									clickable
									active={filterStock === option.value}
									onclick={() => void applyFilterStock(option.value)}
								/>
							{/each}
						</List>
					</div>

					<div class="inventory-page__sidebar-section">
						<ListHeader title="Sedes" icon="building" color="info" />
						<List size="sm" color="info">
							<ListItem
								title="Todas las sedes"
								subtitle="Vista global"
								icon="building"
								clickable
								active={filterBranchCode === 'all'}
								onclick={() => void applyFilterBranch('all')}
							/>
							{#each branches as branch (branch.code)}
								<ListItem
									title={branch.name}
									subtitle={branch.state ? 'Activa' : 'Inactiva'}
									icon={branch.state ? 'checkCircle' : 'xCircle'}
									clickable
									active={filterBranchCode === branch.code}
									onclick={() => void applyFilterBranch(branch.code)}
								/>
							{/each}
						</List>
					</div>
				</div>
			</Card>
		</aside>

		{#if showMobileSidebar}
			<button
				type="button"
				class="inventory-page__drawer-backdrop"
				onclick={() => (showMobileSidebar = false)}
				aria-label="Cerrar filtros"
			></button>
			<aside class="inventory-page__drawer">
				<Card spaced>
					<div class="inventory-page__drawer-header">
						<p class="lumi-margin--none lumi-font--bold">Filtros de Inventario</p>
						<Button type="flat" icon="x" size="sm" onclick={() => (showMobileSidebar = false)} />
					</div>
					<div class="lumi-stack lumi-space--sm">
						<ListHeader title="Salud de stock" icon="activity" color="primary" />
						<List size="sm" color="primary">
							{#each STOCK_FILTER_OPTIONS as option (option.value)}
								<ListItem
									title={option.label}
									subtitle={`${stockFilterCountMap[option.value]} registros`}
									icon={option.icon}
									clickable
									active={filterStock === option.value}
									onclick={() => void applyFilterStock(option.value)}
								/>
							{/each}
						</List>
					</div>
				</Card>
			</aside>
		{/if}

		<section class="lumi-layout--content-right">
			<div class="lumi-stack lumi-space--md">
				<Card spaced>
					<div class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap inventory-page__toolbar">
						<div class="inventory-page__toolbar-field">
							<Select
								label="Categoría"
								value={filterCategoryCode}
								options={categoryFilterOptions}
								clearable={false}
								onchange={async (value) => {
									filterCategoryCode = typeof value === 'string' ? value : 'all';
									await loadInventory();
								}}
							/>
						</div>
						<div class="inventory-page__toolbar-field">
							<Select
								label="Sede"
								value={filterBranchCode}
								options={branchFilterOptions}
								clearable={false}
								onchange={async (value) => {
									const branchValue = typeof value === 'string' ? value : 'all';
									await applyFilterBranch(branchValue);
								}}
							/>
						</div>
						<div class="inventory-page__toolbar-search">
							<Input
								label="Buscar producto o SKU"
								placeholder="Ej: camiseta, SKU-100"
								icon="search"
								value={searchQuery}
								oninput={(event) =>
									handleSearchInput((event.currentTarget as HTMLInputElement | null)?.value ?? '')}
							/>
						</div>
						<div class="inventory-page__toolbar-toggle">
							<Button
								type={includeInactive ? 'filled' : 'border'}
								color={includeInactive ? 'warning' : 'primary'}
								icon={includeInactive ? 'eyeOff' : 'eye'}
								onclick={async () => {
									includeInactive = !includeInactive;
									await loadInventory();
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
						<Table data={inventoryTableRows} pagination hover loading={loadingInventory} itemsPerPage={12}>
							{#snippet thead()}
								<th>Producto</th>
								<th>Sede</th>
								<th>Disponible</th>
								<th>En camino</th>
								<th>Umbrales</th>
								<th>Estado</th>
								<th>Último movimiento</th>
								<th>Acciones</th>
							{/snippet}

							{#snippet row({ row })}
								{@const item = row as unknown as InventoryOverviewItem}
								<td>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span class="lumi-font--medium">{item.product_name}</span>
										<span class="lumi-text--xs lumi-text--muted">{item.sku || 'Sin SKU'}</span>
									</div>
								</td>
								<td>{item.branch_name}</td>
								<td>
									<span class="lumi-font--medium">{item.available}</span>
									<span class="lumi-text--xs lumi-text--muted inventory-page__muted-inline">
										(on hand: {item.on_hand})
									</span>
								</td>
								<td>{item.inbound}</td>
								<td>
									<span class="lumi-text--sm">
										Rep: {item.reorder_point} | Emg: {item.emergency_point}
									</span>
								</td>
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
										icon="settings"
										color="info"
										disabled={!canUpdate}
										onclick={() => openThresholdDialog(item)}
									/>
								</td>
							{/snippet}
						</Table>
					</Card>

					<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
						<Card>
							<div class="lumi-stack lumi-space--sm">
								<div class="lumi-flex lumi-justify--between lumi-align-items--center">
									<h3 class="lumi-margin--none lumi-font--bold">Compras recientes</h3>
									{#if loadingActivity}
										<span class="lumi-text--xs lumi-text--muted">Actualizando...</span>
									{/if}
								</div>
								<Table data={purchaseTableRows} pagination itemsPerPage={5} hover>
									{#snippet thead()}
										<th>Producto</th>
										<th>Cantidad</th>
										<th>Origen</th>
										<th>Estado</th>
										<th>Acción</th>
									{/snippet}
									{#snippet row({ row })}
										{@const purchase = row as unknown as InventoryPurchaseListItem}
										<td>{purchase.product_name}</td>
										<td>{purchase.quantity}</td>
										<td>{purchase.origin}</td>
										<td>
											<Chip color={purchaseStateColor(purchase.state)} size="sm">
												{purchaseStateLabel(purchase.state)}
											</Chip>
										</td>
										<td>
											{#if purchase.state === 'in_transit'}
												<div class="lumi-flex lumi-flex--gap-2xs">
													<Button
														type="flat"
														size="sm"
														icon="checkCircle"
														color="success"
														disabled={!canUpdate}
														onclick={() => void updatePurchaseState(purchase.code, 'received')}
													/>
													<Button
														type="flat"
														size="sm"
														icon="xCircle"
														color="danger"
														disabled={!canUpdate}
														onclick={() => void updatePurchaseState(purchase.code, 'refunded')}
													/>
												</div>
											{:else}
												<span class="lumi-text--xs lumi-text--muted">Sin acción</span>
											{/if}
										</td>
									{/snippet}
								</Table>
							</div>
						</Card>

						<Card>
							<div class="lumi-stack lumi-space--sm">
								<div class="lumi-flex lumi-justify--between lumi-align-items--center">
									<h3 class="lumi-margin--none lumi-font--bold">Ventas y actividad</h3>
									{#if loadingActivity}
										<span class="lumi-text--xs lumi-text--muted">Actualizando...</span>
									{/if}
								</div>
								<Table data={salesTableRows} pagination itemsPerPage={5} hover>
									{#snippet thead()}
										<th>Producto</th>
										<th>Cliente</th>
										<th>Cantidad</th>
										<th>Fecha</th>
									{/snippet}
									{#snippet row({ row })}
										{@const sale = row as unknown as InventorySaleListItem}
										<td>{sale.product_name}</td>
										<td>{sale.customer_name}</td>
										<td>{sale.quantity}</td>
										<td>{formatDate(sale.sold_at)}</td>
									{/snippet}
								</Table>
								<div class="inventory-page__movement-list">
									{#each recentMovements.slice(0, 5) as movement (movement.code)}
										<div class="inventory-page__movement-item">
											<Chip color={movementDirectionColor(movement.direction)} size="sm">
												{movement.direction === 'in' ? '+' : '-'}{movement.quantity}
											</Chip>
											<div class="inventory-page__movement-content">
												<p class="lumi-margin--none lumi-font--medium">{movement.product_name}</p>
												<p class="lumi-margin--none lumi-text--xs lumi-text--muted">
													{movementReasonLabel(movement.reason)} · {movement.branch_name}
												</p>
											</div>
											<span class="lumi-text--xs lumi-text--muted">{formatDate(movement.occurred_at)}</span>
										</div>
									{/each}
								</div>
							</div>
						</Card>
					</div>
				{/if}
			</div>
		</section>
	</div>
</div>

<Dialog bind:open={showBuyDialog} title="Registrar compra rápida" size="lg">
	<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
		<Select
			label="Producto"
			value={buyProductCode}
			options={activeProductOptions}
			placeholder="Selecciona producto"
			onchange={(value) => {
				buyProductCode = typeof value === 'string' ? value : '';
			}}
		/>
		<Select
			label="Sede destino"
			value={buyBranchCode}
			options={branchFilterOptions.filter((option) => option.value !== 'all')}
			placeholder="Selecciona sede"
			onchange={(value) => {
				buyBranchCode = typeof value === 'string' ? value : '';
			}}
		/>
		<Select
			label="Origen"
			value={buyOrigin}
			options={PURCHASE_ORIGIN_OPTIONS}
			clearable={false}
			onchange={(value) => {
				buyOrigin = (typeof value === 'string' ? value : 'aliexpress') as InventoryPurchaseOrigin;
			}}
		/>
		<Input
			label="Cantidad"
			type="number"
			value={buyQuantity}
			oninput={(event) => (buyQuantity = (event.currentTarget as HTMLInputElement).value)}
		/>
		<Select
			label="Estado inicial"
			value={buyState}
			options={PURCHASE_STATE_OPTIONS}
			clearable={false}
			onchange={(value) => {
				buyState = (typeof value === 'string' ? value : 'in_transit') as InventoryPurchaseState;
			}}
		/>
		<Input
			label="Fecha de pedido"
			type="date"
			value={buyOrderedAt}
			oninput={(event) => (buyOrderedAt = (event.currentTarget as HTMLInputElement).value)}
		/>
		<Input
			label="Costo unitario (opcional)"
			type="number"
			value={buyUnitCost}
			oninput={(event) => (buyUnitCost = (event.currentTarget as HTMLInputElement).value)}
		/>
		<div></div>
	</div>
	<Textarea
		label="Nota (opcional)"
		rows={3}
		value={buyNote}
		oninput={(event) => (buyNote = (event.currentTarget as HTMLTextAreaElement).value)}
	/>

	{#snippet footer()}
		<Button type="border" onclick={() => (showBuyDialog = false)}>Cancelar</Button>
		<Button type="filled" color="primary" loading={submittingBuy} onclick={() => void submitBuy()}>
			Registrar compra
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showSaleDialog} title="Registrar venta rápida" size="lg">
	<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
		<Select
			label="Producto"
			value={saleProductCode}
			options={activeProductOptions}
			placeholder="Selecciona producto"
			onchange={(value) => {
				saleProductCode = typeof value === 'string' ? value : '';
			}}
		/>
		<Select
			label="Sede"
			value={saleBranchCode}
			options={branchFilterOptions.filter((option) => option.value !== 'all')}
			placeholder="Selecciona sede"
			onchange={(value) => {
				saleBranchCode = typeof value === 'string' ? value : '';
			}}
		/>
		<Input
			label="Cantidad"
			type="number"
			value={saleQuantity}
			oninput={(event) => (saleQuantity = (event.currentTarget as HTMLInputElement).value)}
		/>
		<Input
			label="Fecha de venta"
			type="date"
			value={saleDate}
			oninput={(event) => (saleDate = (event.currentTarget as HTMLInputElement).value)}
		/>
		<Input
			label="Cliente"
			value={saleCustomerName}
			oninput={(event) => (saleCustomerName = (event.currentTarget as HTMLInputElement).value)}
		/>
		<Input
			label="Teléfono (opcional)"
			value={saleCustomerPhone}
			oninput={(event) => (saleCustomerPhone = (event.currentTarget as HTMLInputElement).value)}
		/>
	</div>
	<Textarea
		label="Nota (opcional)"
		rows={3}
		value={saleNote}
		oninput={(event) => (saleNote = (event.currentTarget as HTMLTextAreaElement).value)}
	/>

	{#snippet footer()}
		<Button type="border" onclick={() => (showSaleDialog = false)}>Cancelar</Button>
		<Button type="filled" color="primary" loading={submittingSale} onclick={() => void submitSale()}>
			Registrar venta
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showThresholdDialog} title="Ajustar umbrales de stock" size="sm">
	<div class="lumi-stack lumi-space--sm">
		<p class="lumi-margin--none lumi-text--sm lumi-text--muted">{thresholdProductLabel}</p>
		<Input
			label="Punto de reposición"
			type="number"
			value={thresholdReorderPoint}
			oninput={(event) => (thresholdReorderPoint = (event.currentTarget as HTMLInputElement).value)}
		/>
		<Input
			label="Punto de emergencia"
			type="number"
			value={thresholdEmergencyPoint}
			oninput={(event) => (thresholdEmergencyPoint = (event.currentTarget as HTMLInputElement).value)}
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
	.inventory-page__layout {
		align-items: stretch;
	}

	.inventory-page__sidebar :global(.lumi-card) {
		height: 100%;
		background:
			linear-gradient(
				145deg,
				color-mix(in srgb, var(--lumi-color-primary) 6%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-info) 4%, transparent) 55%,
				transparent 100%
			),
			var(--lumi-color-surface);
		backdrop-filter: blur(var(--lumi-blur-sm));
	}

	.inventory-page__sidebar-section {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
	}

	.inventory-page__toolbar {
		align-items: flex-end;
	}

	.inventory-page__toolbar-field {
		flex: 1 1 220px;
		min-width: 200px;
	}

	.inventory-page__toolbar-search {
		flex: 1 1 300px;
		min-width: 260px;
	}

	.inventory-page__toolbar-toggle {
		flex: 0 0 auto;
	}

	.inventory-page__muted-inline {
		display: inline-flex;
		margin-left: var(--lumi-space-2xs);
	}

	.inventory-page__movement-list {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
	}

	.inventory-page__movement-item {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-lg);
		background: color-mix(in srgb, var(--lumi-color-surface) 94%, transparent);
	}

	.inventory-page__movement-content {
		min-width: 0;
		flex: 1;
	}

	.inventory-page__header-actions {
		flex-wrap: wrap;
	}

	.inventory-page__mobile-toggle {
		display: none;
		align-items: center;
		justify-content: center;
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-md);
		background: var(--lumi-color-surface);
		color: var(--lumi-color-text);
		cursor: pointer;
		transition: var(--lumi-transition-all);
	}

	.inventory-page__mobile-toggle:hover {
		border-color: var(--lumi-color-primary);
		background: var(--lumi-color-background-hover);
	}

	.inventory-page__drawer-backdrop {
		display: none;
	}

	.inventory-page__drawer {
		display: none;
	}

	.inventory-page__drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--lumi-space-sm);
	}

	@media (max-width: 1024px) {
		.inventory-page__sidebar {
			display: none;
		}

		.inventory-page__mobile-toggle {
			display: inline-flex;
		}

		.inventory-page__toolbar {
			align-items: stretch;
		}

		.inventory-page__toolbar-field,
		.inventory-page__toolbar-search,
		.inventory-page__toolbar-toggle {
			flex-basis: 100%;
			min-width: 100%;
		}

		.inventory-page__drawer-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			z-index: var(--lumi-z-modal);
			background: var(--lumi-color-overlay);
			backdrop-filter: blur(var(--lumi-blur-sm));
			border: none;
			padding: 0;
		}

		.inventory-page__drawer {
			display: block;
			position: fixed;
			top: 0;
			left: 0;
			bottom: 0;
			width: min(22rem, 86vw);
			z-index: calc(var(--lumi-z-modal) + 1);
			padding: var(--lumi-space-sm);
			overflow-y: auto;
		}
	}
</style>
