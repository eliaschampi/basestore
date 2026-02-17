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
		Select,
		Table,
		Textarea
	} from '$lib/components';
	import type { SelectOption, TableRow } from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import { formatDate } from '$lib/utils/formatDate';
	import { formatProductPrice } from '$lib/utils/products';
	import type { InventoryPagination, InventoryPurchaseListItem } from '$lib/types/inventory';
	import type {
		InventoryPurchaseEntryType,
		InventoryPurchaseOrigin,
		InventoryPurchaseState
	} from '$lib/utils/inventory';
	import type { PageData } from './$types';

	interface BranchCatalogItem {
		code: string;
		name: string;
		state: boolean;
	}

	interface ProductCatalogItem {
		code: string;
		name: string;
		category_code: string | null;
		is_active: boolean;
		price: string;
	}

	const { data }: { data: PageData } = $props();

	const EMPTY_PAGINATION: InventoryPagination = {
		page: 1,
		page_size: 20,
		total: 0,
		total_pages: 1
	};

	const PURCHASE_STATE_OPTIONS: SelectOption[] = [
		{ value: 'all', label: 'Todos los estados' },
		{ value: 'in_transit', label: 'En camino' },
		{ value: 'received', label: 'Recibido' },
		{ value: 'refunded', label: 'Reembolsado' }
	];

	const PURCHASE_ORIGIN_OPTIONS: SelectOption[] = [
		{ value: 'all', label: 'Todos los orígenes' },
		{ value: 'temu', label: 'Temu' },
		{ value: 'aliexpress', label: 'AliExpress' },
		{ value: 'lima', label: 'Lima' }
	];

	const ENTRY_TYPE_OPTIONS: SelectOption[] = [
		{ value: 'all', label: 'Todos los tipos' },
		{ value: 'initial', label: 'Inicial' },
		{ value: 'restock', label: 'Reposición' }
	];

	const canRead = $derived(can('inventory:read'));
	const canCreate = $derived(can('inventory:create'));
	const canUpdate = $derived(can('inventory:update'));

	let purchases = $state<InventoryPurchaseListItem[]>([]);
	let pagination = $state<InventoryPagination>(EMPTY_PAGINATION);
	let branches = $state<BranchCatalogItem[]>([]);
	let products = $state<ProductCatalogItem[]>([]);

	let loading = $state(false);
	let errorMessage = $state('');
	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;
	let fetchId = 0;

	let filterBranchCode = $state('all');
	let filterState = $state<'all' | InventoryPurchaseState>('all');
	let filterOrigin = $state<'all' | InventoryPurchaseOrigin>('all');
	let filterEntryType = $state<'all' | InventoryPurchaseEntryType>('all');

	let showCreateDialog = $state(false);
	let submittingCreate = $state(false);
	let createProductCode = $state('');
	let createBranchCode = $state('');
	let createOrigin = $state<InventoryPurchaseOrigin>('aliexpress');
	let createEntryType = $state<InventoryPurchaseEntryType>('restock');
	let createTrackingNumber = $state('');
	let createQuantity = $state('1');
	let createState = $state<InventoryPurchaseState>('in_transit');
	let createOrderedAt = $state(new Date().toISOString().slice(0, 10));
	let createUnitCost = $state('');
	let createNote = $state('');

	const branchFilterOptions = $derived(
		[{ value: 'all', label: 'Todas las sedes' } as SelectOption].concat(
			branches.map((branch) => ({ value: branch.code, label: branch.name }))
		)
	);

	const branchCreateOptions = $derived(
		branches
			.filter((branch) => branch.state)
			.map((branch) => ({ value: branch.code, label: branch.name }) as SelectOption)
	);

	const productCreateOptions = $derived(
		products
			.filter((product) => product.is_active)
			.map((product) => ({ value: product.code, label: product.name }) as SelectOption)
	);

	const purchaseRows = $derived(purchases as unknown as TableRow[]);
	const canGoPrev = $derived(pagination.page > 1);
	const canGoNext = $derived(pagination.page < pagination.total_pages);

	onDestroy(() => {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
	});

	$effect(() => {
		purchases = (data.purchases ?? []) as InventoryPurchaseListItem[];
		pagination = (data.pagination ?? EMPTY_PAGINATION) as InventoryPagination;
		branches = (data.branches ?? []) as BranchCatalogItem[];
		products = (data.products ?? []) as ProductCatalogItem[];
	});

	function purchaseStateLabel(state: InventoryPurchaseState): string {
		if (state === 'in_transit') return 'En camino';
		if (state === 'received') return 'Recibido';
		return 'Reembolsado';
	}

	function purchaseStateColor(state: InventoryPurchaseState): 'warning' | 'success' | 'danger' {
		if (state === 'in_transit') return 'warning';
		if (state === 'received') return 'success';
		return 'danger';
	}

	async function loadPurchases(page = pagination.page): Promise<void> {
		if (!canRead) return;

		const requestId = ++fetchId;
		loading = true;
		errorMessage = '';

		try {
			const params = new SvelteURLSearchParams({
				page: String(page),
				page_size: String(pagination.page_size || 20)
			});

			if (filterBranchCode !== 'all') {
				params.set('branch_code', filterBranchCode);
			}
			if (filterState !== 'all') {
				params.set('state', filterState);
			}
			if (filterOrigin !== 'all') {
				params.set('origin', filterOrigin);
			}
			if (filterEntryType !== 'all') {
				params.set('entry_type', filterEntryType);
			}
			if (searchQuery.trim()) {
				params.set('search', searchQuery.trim());
			}

			const response = await fetch(`/api/inventory/purchases?${params.toString()}`);
			const payload = await response.json();

			if (requestId !== fetchId) return;
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudieron cargar las compras');
			}

			purchases = (payload.purchases ?? []) as InventoryPurchaseListItem[];
			pagination = (payload.pagination ?? EMPTY_PAGINATION) as InventoryPagination;
		} catch (caught) {
			if (requestId === fetchId) {
				errorMessage = caught instanceof Error ? caught.message : 'Error al cargar compras';
			}
		} finally {
			if (requestId === fetchId) {
				loading = false;
			}
		}
	}

	function handleSearchInput(value: string): void {
		searchQuery = value;
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(() => {
			void loadPurchases(1);
		}, 320);
	}

	function openCreateDialog(): void {
		if (!canCreate) return;
		createProductCode = '';
		createBranchCode = filterBranchCode !== 'all' ? filterBranchCode : '';
		createOrigin = 'aliexpress';
		createEntryType = 'restock';
		createTrackingNumber = '';
		createQuantity = '1';
		createState = 'in_transit';
		createOrderedAt = new Date().toISOString().slice(0, 10);
		createUnitCost = '';
		createNote = '';
		showCreateDialog = true;
	}

	async function submitCreatePurchase(): Promise<void> {
		if (submittingCreate) return;

		const quantity = Number.parseInt(createQuantity, 10);
		if (!createProductCode || !createBranchCode || !Number.isInteger(quantity) || quantity <= 0) {
			showToast('Completa producto, sede y cantidad válida', 'error');
			return;
		}

		if (createOrigin !== 'lima' && createTrackingNumber.trim().length < 5) {
			showToast('El NRO tracking es obligatorio para Temu/AliExpress', 'error');
			return;
		}

		submittingCreate = true;
		try {
			const response = await fetch('/api/inventory/purchases', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					product_code: createProductCode,
					branch_code: createBranchCode,
					origin: createOrigin,
					entry_type: createEntryType,
					tracking_number: createTrackingNumber.trim(),
					quantity,
					state: createState,
					ordered_at: createOrderedAt,
					unit_cost: createUnitCost.trim() ? Number.parseFloat(createUnitCost) : null,
					note: createNote.trim()
				})
			});

			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo registrar la compra');
			}

			showCreateDialog = false;
			showToast('Compra registrada', 'success');
			await loadPurchases(1);
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'Error al registrar compra';
			showToast(message, 'error');
		} finally {
			submittingCreate = false;
		}
	}

	async function updatePurchaseState(
		purchaseCode: string,
		state: 'received' | 'refunded'
	): Promise<void> {
		if (!canUpdate) return;

		try {
			const response = await fetch(`/api/inventory/purchases/${purchaseCode}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ state })
			});

			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo actualizar la compra');
			}

			showToast('Estado de compra actualizado', 'success');
			await loadPurchases(pagination.page);
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'Error al actualizar compra';
			showToast(message, 'error');
		}
	}
</script>

<div class="lumi-stack lumi-space--md">
	<PageHeader
		title="Compras"
		subtitle="Entradas de stock con tracking y flujo inicial/reposición"
		icon="shoppingBag"
	>
		{#snippet actions()}
			<div class="lumi-flex lumi-flex--gap-sm">
				<a href={resolve('/inventario')} class="inventory-purchases__action-link">
					<Icon icon="boxes" size="sm" />
					<span>Ver Stock</span>
				</a>
				<Button
					type="filled"
					color="primary"
					icon="plus"
					onclick={openCreateDialog}
					disabled={!canCreate}
				>
					Nueva compra
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<div class="lumi-layout--two-columns inventory-purchases__layout">
		<aside class="lumi-layout--sidebar-left">
			<Card spaced>
				<div class="lumi-stack lumi-space--sm">
					<ListHeader title="Sedes" icon="building" color="info" />
					<List size="sm" color="info">
						{#each branchFilterOptions as branch (String(branch.value))}
							<ListItem
								title={branch.label}
								clickable
								active={filterBranchCode === String(branch.value)}
								icon="building"
								onclick={async () => {
									filterBranchCode = String(branch.value);
									await loadPurchases(1);
								}}
							/>
						{/each}
					</List>
				</div>
			</Card>
		</aside>

		<section class="lumi-layout--content-right">
			<div class="lumi-stack lumi-space--md">
				<Card spaced>
					<div class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap inventory-purchases__toolbar">
						<div class="inventory-purchases__toolbar-field">
							<Select
								label="Estado"
								value={filterState}
								options={PURCHASE_STATE_OPTIONS}
								clearable={false}
								onchange={async (value) => {
									filterState = (typeof value === 'string' ? value : 'all') as
										| 'all'
										| InventoryPurchaseState;
									await loadPurchases(1);
								}}
							/>
						</div>
						<div class="inventory-purchases__toolbar-field">
							<Select
								label="Origen"
								value={filterOrigin}
								options={PURCHASE_ORIGIN_OPTIONS}
								clearable={false}
								onchange={async (value) => {
									filterOrigin = (typeof value === 'string' ? value : 'all') as
										| 'all'
										| InventoryPurchaseOrigin;
									await loadPurchases(1);
								}}
							/>
						</div>
						<div class="inventory-purchases__toolbar-field">
							<Select
								label="Tipo"
								value={filterEntryType}
								options={ENTRY_TYPE_OPTIONS}
								clearable={false}
								onchange={async (value) => {
									filterEntryType = (typeof value === 'string' ? value : 'all') as
										| 'all'
										| InventoryPurchaseEntryType;
									await loadPurchases(1);
								}}
							/>
						</div>
						<div class="inventory-purchases__toolbar-search">
							<Input
								label="Buscar por producto / SKU / tracking"
								icon="search"
								value={searchQuery}
								oninput={(event) =>
									handleSearchInput((event.currentTarget as HTMLInputElement | null)?.value ?? '')}
							/>
						</div>
					</div>
				</Card>

				{#if !canRead}
					<Alert type="warning" closable>No tienes permisos para consultar compras.</Alert>
				{:else}
					{#if errorMessage}
						<Alert type="danger" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
					{/if}

					<Card>
						<Table data={purchaseRows} hover {loading} pagination={false}>
							{#snippet thead()}
								<th>Producto</th>
								<th>Sede</th>
								<th>Cantidad</th>
								<th>Origen</th>
								<th>Tracking</th>
								<th>Tipo</th>
								<th>Estado</th>
								<th>Costo</th>
								<th>Fecha</th>
								<th>Acciones</th>
							{/snippet}

							{#snippet row({ row })}
								{@const purchase = row as unknown as InventoryPurchaseListItem}
								<td>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<a
											href={resolve(`/products/${purchase.product_code}`)}
											class="inventory-purchases__product-link"
										>
											{purchase.product_name}
										</a>
										<span class="lumi-text--xs lumi-text--muted"
											>{purchase.product_sku || 'Sin SKU'}</span
										>
									</div>
								</td>
								<td>{purchase.branch_name}</td>
								<td>{purchase.quantity}</td>
								<td>{purchase.origin}</td>
								<td>{purchase.tracking_number || '—'}</td>
								<td>
									<Chip size="sm" color={purchase.entry_type === 'initial' ? 'info' : 'primary'}>
										{purchase.entry_type === 'initial' ? 'Inicial' : 'Reposición'}
									</Chip>
								</td>
								<td>
									<Chip color={purchaseStateColor(purchase.state)} size="sm">
										{purchaseStateLabel(purchase.state)}
									</Chip>
								</td>
								<td>{purchase.unit_cost ? formatProductPrice(purchase.unit_cost) : '—'}</td>
								<td>{formatDate(purchase.ordered_at)}</td>
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
									{:else if purchase.state === 'received'}
										<Button
											type="flat"
											size="sm"
											icon="undo2"
											color="danger"
											disabled={!canUpdate}
											onclick={() => void updatePurchaseState(purchase.code, 'refunded')}
										/>
									{:else}
										<span class="lumi-text--xs lumi-text--muted">Sin acción</span>
									{/if}
								</td>
							{/snippet}
						</Table>
					</Card>

					<Card spaced>
						<div class="inventory-purchases__pagination">
							<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
								Página {pagination.page} de {pagination.total_pages} · {pagination.total} registros
							</p>
							<div class="lumi-flex lumi-flex--gap-sm">
								<Button
									type="border"
									size="sm"
									icon="chevronLeft"
									disabled={!canGoPrev || loading}
									onclick={() => void loadPurchases(pagination.page - 1)}
								>
									Anterior
								</Button>
								<Button
									type="border"
									size="sm"
									iconAfter
									icon="chevronRight"
									disabled={!canGoNext || loading}
									onclick={() => void loadPurchases(pagination.page + 1)}
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

<Dialog bind:open={showCreateDialog} title="Registrar compra" size="lg">
	<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
		<Select
			label="Producto"
			value={createProductCode}
			options={productCreateOptions}
			placeholder="Selecciona producto"
			onchange={(value) => {
				createProductCode = typeof value === 'string' ? value : '';
			}}
		/>
		<Select
			label="Sede destino"
			value={createBranchCode}
			options={branchCreateOptions}
			placeholder="Selecciona sede"
			onchange={(value) => {
				createBranchCode = typeof value === 'string' ? value : '';
			}}
		/>
		<Select
			label="Origen"
			value={createOrigin}
			options={PURCHASE_ORIGIN_OPTIONS.filter((option) => option.value !== 'all')}
			clearable={false}
			onchange={(value) => {
				createOrigin = (
					typeof value === 'string' ? value : 'aliexpress'
				) as InventoryPurchaseOrigin;
			}}
		/>
		<Select
			label="Tipo de compra"
			value={createEntryType}
			options={ENTRY_TYPE_OPTIONS.filter((option) => option.value !== 'all')}
			clearable={false}
			onchange={(value) => {
				createEntryType = (
					typeof value === 'string' ? value : 'restock'
				) as InventoryPurchaseEntryType;
			}}
		/>
		<Input
			label="NRO Tracking"
			placeholder="Ej: LP009123456789"
			value={createTrackingNumber}
			oninput={(event) => (createTrackingNumber = (event.currentTarget as HTMLInputElement).value)}
		/>
		<Input
			label="Cantidad"
			type="number"
			value={createQuantity}
			oninput={(event) => (createQuantity = (event.currentTarget as HTMLInputElement).value)}
		/>
		<Select
			label="Estado inicial"
			value={createState}
			options={PURCHASE_STATE_OPTIONS.filter(
				(option) => option.value !== 'all' && option.value !== 'refunded'
			)}
			clearable={false}
			onchange={(value) => {
				createState = (typeof value === 'string' ? value : 'in_transit') as InventoryPurchaseState;
			}}
		/>
		<Input
			label="Fecha de pedido"
			type="date"
			value={createOrderedAt}
			oninput={(event) => (createOrderedAt = (event.currentTarget as HTMLInputElement).value)}
		/>
		<Input
			label="Costo unitario (opcional)"
			type="number"
			value={createUnitCost}
			oninput={(event) => (createUnitCost = (event.currentTarget as HTMLInputElement).value)}
		/>
	</div>

	<Textarea
		label="Nota (opcional)"
		rows={3}
		value={createNote}
		oninput={(event) => (createNote = (event.currentTarget as HTMLTextAreaElement).value)}
	/>

	{#snippet footer()}
		<Button type="border" onclick={() => (showCreateDialog = false)}>Cancelar</Button>
		<Button
			type="filled"
			color="primary"
			loading={submittingCreate}
			onclick={() => void submitCreatePurchase()}
		>
			Registrar compra
		</Button>
	{/snippet}
</Dialog>

<style>
	.inventory-purchases__layout {
		align-items: stretch;
	}

	.inventory-purchases__toolbar {
		align-items: flex-end;
	}

	.inventory-purchases__toolbar-field {
		flex: 1 1 220px;
		min-width: 200px;
	}

	.inventory-purchases__toolbar-search {
		flex: 1 1 320px;
		min-width: 260px;
	}

	.inventory-purchases__pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-sm);
		flex-wrap: wrap;
	}

	.inventory-purchases__action-link {
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

	.inventory-purchases__action-link:hover {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 40%, var(--lumi-color-border-light));
		background: color-mix(in srgb, var(--lumi-color-primary) 8%, var(--lumi-color-surface));
	}

	.inventory-purchases__product-link {
		color: var(--lumi-color-primary);
		text-decoration: none;
		font-weight: var(--lumi-font-weight-semibold);
	}

	.inventory-purchases__product-link:hover {
		text-decoration: underline;
	}

	@media (max-width: 1024px) {
		.inventory-purchases__toolbar {
			align-items: stretch;
		}

		.inventory-purchases__toolbar-field,
		.inventory-purchases__toolbar-search {
			flex-basis: 100%;
			min-width: 100%;
		}
	}
</style>
