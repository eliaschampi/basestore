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
		NumberInput,
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
	import {
		resolveInventoryBranchCode,
		type InventoryPurchaseEntryType,
		type InventoryPurchaseOrigin,
		type InventoryPurchaseState
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

	let filterBranchCode = $state('');
	let filterState = $state<'all' | InventoryPurchaseState>('all');
	let filterOrigin = $state<'all' | InventoryPurchaseOrigin>('all');
	let filterEntryType = $state<'all' | InventoryPurchaseEntryType>('all');

	let showCreateDialog = $state(false);
	let submittingCreate = $state(false);
	let showDetailDialog = $state(false);
	let detailPurchase = $state<InventoryPurchaseListItem | null>(null);
	let createProductCode = $state('');
	let createBranchCode = $state('');
	let createOrigin = $state<InventoryPurchaseOrigin>('aliexpress');
	let createEntryType = $state<InventoryPurchaseEntryType>('restock');
	let createTrackingNumber = $state('');
	let createQuantity = $state(1);
	let createState = $state<InventoryPurchaseState>('in_transit');
	let createOrderedAt = $state(new Date().toISOString().slice(0, 10));
	let createUnitCost = $state(0);
	let createNote = $state('');

	const branchOptions = $derived(
		branches
			.filter((branch) => branch.state)
			.map((branch) => ({ value: branch.code, label: branch.name }) as SelectOption)
	);

	const productOptions = $derived(
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
		const nextPurchases = (data.purchases ?? []) as InventoryPurchaseListItem[];
		const nextPagination = (data.pagination ?? EMPTY_PAGINATION) as InventoryPagination;
		const nextBranches = (data.branches ?? []) as BranchCatalogItem[];
		const nextProducts = (data.products ?? []) as ProductCatalogItem[];

		purchases = nextPurchases;
		pagination = nextPagination;
		branches = nextBranches;
		products = nextProducts;

		const preferredBranch = (data.selectedBranchCode as string | undefined) ?? '';
		if (!filterBranchCode) {
			filterBranchCode = resolveInventoryBranchCode(nextBranches, preferredBranch);
		}
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

	function purchaseOriginLabel(origin: InventoryPurchaseOrigin): string {
		if (origin === 'aliexpress') return 'AliExpress';
		if (origin === 'temu') return 'Temu';
		return 'Lima';
	}

	function handleSearchInput(value: string): void {
		searchQuery = value;
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(() => {
			void loadPurchases(1);
		}, 300);
	}

	async function loadPurchases(page = pagination.page): Promise<void> {
		if (!canRead || !filterBranchCode) return;

		const requestId = ++fetchId;
		loading = true;
		errorMessage = '';

		try {
			const params = new SvelteURLSearchParams({
				branch_code: filterBranchCode,
				page: String(page),
				page_size: String(pagination.page_size || 20)
			});

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

	function openCreateDialog(): void {
		if (!canCreate) return;
		createProductCode = '';
		createBranchCode = filterBranchCode;
		createOrigin = 'aliexpress';
		createEntryType = 'restock';
		createTrackingNumber = '';
		createQuantity = 1;
		createState = 'in_transit';
		createOrderedAt = new Date().toISOString().slice(0, 10);
		createUnitCost = 0;
		createNote = '';
		showCreateDialog = true;
	}

	function openPurchaseDetail(purchase: InventoryPurchaseListItem): void {
		detailPurchase = purchase;
		showDetailDialog = true;
	}

	async function submitCreatePurchase(): Promise<void> {
		if (submittingCreate) return;

		const quantity = Number(createQuantity);
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
			const unitCost =
				Number.isFinite(createUnitCost) && createUnitCost > 0 ? createUnitCost : null;
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
					unit_cost: unitCost,
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
		subtitle="Entradas por sede con tracking y flujo limpio"
		icon="shoppingBag"
	>
		{#snippet actions()}
			<div class="lumi-flex lumi-flex--gap-sm">
				<Button type="border" color="info" icon="boxes" onclick={() => goto(resolve('/inventory'))}>
					Stock
				</Button>
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

	<Card spaced>
		<div class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap inventory-purchases__toolbar">
			<div class="inventory-purchases__toolbar-field">
				<Select
					size="md"
					label="Sede"
					value={filterBranchCode}
					options={branchOptions}
					clearable={false}
					onchange={async (value) => {
						filterBranchCode = typeof value === 'string' ? value : filterBranchCode;
						await loadPurchases(1);
					}}
				/>
			</div>
			<div class="inventory-purchases__toolbar-field">
				<Select
					size="md"
					label="Estado"
					value={filterState}
					options={PURCHASE_STATE_OPTIONS}
					clearable={false}
					onchange={async (value) => {
						filterState = (typeof value === 'string' ? value : 'all') as typeof filterState;
						await loadPurchases(1);
					}}
				/>
			</div>
			<div class="inventory-purchases__toolbar-field">
				<Select
					size="md"
					label="Origen"
					value={filterOrigin}
					options={PURCHASE_ORIGIN_OPTIONS}
					clearable={false}
					onchange={async (value) => {
						filterOrigin = (typeof value === 'string' ? value : 'all') as typeof filterOrigin;
						await loadPurchases(1);
					}}
				/>
			</div>
			<div class="inventory-purchases__toolbar-field">
				<Select
					size="md"
					label="Tipo"
					value={filterEntryType}
					options={ENTRY_TYPE_OPTIONS}
					clearable={false}
					onchange={async (value) => {
						filterEntryType = (typeof value === 'string' ? value : 'all') as typeof filterEntryType;
						await loadPurchases(1);
					}}
				/>
			</div>
			<div class="inventory-purchases__toolbar-search">
				<Input
					size="md"
					label="Buscar producto / SKU / tracking"
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
			<Table
				data={purchaseRows}
				hover
				{loading}
				pagination={false}
				class="inventory-table inventory-table--purchases"
			>
				{#snippet thead()}
					<th>Producto</th>
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
							<span class="lumi-text--xs lumi-text--muted">{purchase.product_sku || 'Sin SKU'}</span
							>
						</div>
					</td>
					<td>{purchase.quantity}</td>
					<td>{purchaseOriginLabel(purchase.origin)}</td>
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
						<div class="lumi-flex lumi-flex--gap-2xs inventory-purchases__actions">
							<Button
								type="border"
								size="sm"
								icon="eye"
								color="info"
								aria-label="Ver detalle de compra"
								onclick={() => openPurchaseDetail(purchase)}
							>
								Detalle
							</Button>
							{#if purchase.state === 'in_transit'}
								<Button
									type="flat"
									size="sm"
									icon="checkCircle"
									color="success"
									aria-label="Marcar compra como recibida"
									disabled={!canUpdate}
									onclick={() => void updatePurchaseState(purchase.code, 'received')}
								>
									Recibir
								</Button>
								<Button
									type="flat"
									size="sm"
									icon="xCircle"
									color="danger"
									aria-label="Marcar compra como reembolsada"
									disabled={!canUpdate}
									onclick={() => void updatePurchaseState(purchase.code, 'refunded')}
								>
									Reembolsar
								</Button>
							{:else if purchase.state === 'received'}
								<Button
									type="flat"
									size="sm"
									icon="undo2"
									color="danger"
									aria-label="Marcar compra como reembolsada"
									disabled={!canUpdate}
									onclick={() => void updatePurchaseState(purchase.code, 'refunded')}
								>
									Reembolsar
								</Button>
							{/if}
						</div>
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

<Dialog bind:open={showCreateDialog} title="Registrar compra" size="lg">
	<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
		<Select
			label="Producto"
			value={createProductCode}
			options={productOptions}
			placeholder="Selecciona producto"
			onchange={(value) => {
				createProductCode = typeof value === 'string' ? value : '';
			}}
		/>
		<Select
			label="Sede destino"
			value={createBranchCode}
			options={branchOptions}
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
			label="Tipo"
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
		<NumberInput
			label="Cantidad"
			value={createQuantity}
			min={1}
			max={100000}
			step={1}
			onchange={(value) => {
				createQuantity = value;
			}}
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
			label="Fecha pedido"
			type="date"
			value={createOrderedAt}
			oninput={(event) => (createOrderedAt = (event.currentTarget as HTMLInputElement).value)}
		/>
		<NumberInput
			label="Costo unitario (opcional)"
			value={createUnitCost}
			min={0}
			max={1000000}
			step={0.5}
			onchange={(value) => {
				createUnitCost = value;
			}}
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

<Dialog bind:open={showDetailDialog} title="Detalle de compra" size="md">
	{#if detailPurchase}
		<div class="inventory-purchases__detail-grid">
			<div class="inventory-purchases__detail-item">
				<p class="inventory-purchases__detail-label">Producto</p>
				<p class="inventory-purchases__detail-value">{detailPurchase.product_name}</p>
				<p class="inventory-purchases__detail-meta">{detailPurchase.product_sku || 'Sin SKU'}</p>
			</div>
			<div class="inventory-purchases__detail-item">
				<p class="inventory-purchases__detail-label">Sede</p>
				<p class="inventory-purchases__detail-value">{detailPurchase.branch_name}</p>
			</div>
			<div class="inventory-purchases__detail-item">
				<p class="inventory-purchases__detail-label">Estado</p>
				<p class="inventory-purchases__detail-value">{purchaseStateLabel(detailPurchase.state)}</p>
				<p class="inventory-purchases__detail-meta">{purchaseOriginLabel(detailPurchase.origin)}</p>
			</div>
			<div class="inventory-purchases__detail-item">
				<p class="inventory-purchases__detail-label">Cantidad / Tipo</p>
				<p class="inventory-purchases__detail-value">{detailPurchase.quantity} unidades</p>
				<p class="inventory-purchases__detail-meta">
					{detailPurchase.entry_type === 'initial' ? 'Inicial' : 'Reposición'}
				</p>
			</div>
			<div class="inventory-purchases__detail-item">
				<p class="inventory-purchases__detail-label">Tracking</p>
				<p class="inventory-purchases__detail-value">
					{detailPurchase.tracking_number || 'Sin tracking'}
				</p>
			</div>
			<div class="inventory-purchases__detail-item">
				<p class="inventory-purchases__detail-label">Fechas</p>
				<p class="inventory-purchases__detail-value">
					Pedido: {formatDate(detailPurchase.ordered_at)}
				</p>
				<p class="inventory-purchases__detail-meta">
					{#if detailPurchase.received_at}
						Recibido: {formatDate(detailPurchase.received_at)}
					{:else if detailPurchase.refunded_at}
						Reembolsado: {formatDate(detailPurchase.refunded_at)}
					{:else}
						Sin cierre
					{/if}
				</p>
			</div>
		</div>

		{#if detailPurchase.unit_cost || detailPurchase.note}
			<div class="inventory-purchases__detail-extra">
				{#if detailPurchase.unit_cost}
					<p class="lumi-margin--none">
						<strong>Costo unitario:</strong>
						{formatProductPrice(detailPurchase.unit_cost)}
					</p>
				{/if}
				{#if detailPurchase.note}
					<p class="lumi-margin--none">
						<strong>Nota:</strong>
						{detailPurchase.note}
					</p>
				{/if}
			</div>
		{/if}
	{/if}

	{#snippet footer()}
		<Button type="border" onclick={() => (showDetailDialog = false)}>Cerrar</Button>
	{/snippet}
</Dialog>

<style>
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

	.inventory-purchases__product-link {
		color: var(--lumi-color-primary);
		text-decoration: none;
		font-weight: var(--lumi-font-weight-semibold);
	}

	.inventory-purchases__product-link:hover {
		text-decoration: underline;
	}

	.inventory-purchases__actions {
		flex-wrap: wrap;
	}

	.inventory-purchases__detail-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--lumi-space-sm);
	}

	.inventory-purchases__detail-item {
		padding: var(--lumi-space-sm);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-md);
		background: var(--lumi-color-surface);
	}

	.inventory-purchases__detail-label,
	.inventory-purchases__detail-value,
	.inventory-purchases__detail-meta {
		margin: 0;
	}

	.inventory-purchases__detail-label {
		font-size: var(--lumi-font-size-2xs);
		font-weight: var(--lumi-font-weight-semibold);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--lumi-color-text-muted);
	}

	.inventory-purchases__detail-value {
		margin-top: var(--lumi-space-2xs);
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
	}

	.inventory-purchases__detail-meta {
		margin-top: var(--lumi-space-2xs);
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
	}

	.inventory-purchases__detail-extra {
		margin-top: var(--lumi-space-sm);
		padding: var(--lumi-space-sm);
		border-radius: var(--lumi-radius-md);
		background: var(--lumi-color-surface);
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	:global(.inventory-table--purchases .lumi-table__content) {
		min-width: 74rem;
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

		.inventory-purchases__detail-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
