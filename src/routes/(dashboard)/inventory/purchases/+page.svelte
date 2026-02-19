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
		Radio,
		SegmentedControl,
		Select,
		Table
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

	const { data }: { data: PageData } = $props();

	const EMPTY_PAGINATION: InventoryPagination = {
		page: 1,
		page_size: 20,
		total: 0,
		total_pages: 1
	};

	const PURCHASE_STATE_SEGMENT_OPTIONS = [
		{ label: 'Camino', value: 'in_transit', icon: 'clock' },
		{ label: 'Recibido', value: 'received', icon: 'checkCircle' },
		{ label: 'Reemb.', value: 'refunded', icon: 'undo2' }
	] as const;

	const PURCHASE_ORIGIN_OPTIONS: SelectOption[] = [
		{ value: 'all', label: 'Todos los origenes' },
		{ value: 'temu', label: 'Temu' },
		{ value: 'aliexpress', label: 'AliExpress' },
		{ value: 'lima', label: 'Lima' }
	];

	const ENTRY_TYPE_OPTIONS: SelectOption[] = [
		{ value: 'all', label: 'Todos los tipos' },
		{ value: 'initial', label: 'Inicial' },
		{ value: 'restock', label: 'Reposicion' }
	];

	const canRead = $derived(can('inventory:read'));
	const canCreate = $derived(can('inventory:create'));
	const canUpdate = $derived(can('inventory:update'));

	let purchases = $state<InventoryPurchaseListItem[]>([]);
	let pagination = $state<InventoryPagination>(EMPTY_PAGINATION);
	let branches = $state<BranchCatalogItem[]>([]);

	let loading = $state(false);
	let errorMessage = $state('');
	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;
	let fetchId = 0;

	let filterBranchCode = $state('');
	let filterState = $state<InventoryPurchaseState>('received');
	let filterOrigin = $state<'all' | InventoryPurchaseOrigin>('all');
	let filterEntryType = $state<'all' | InventoryPurchaseEntryType>('all');
	let showMobileSidebar = $state(false);

	let showDetailDialog = $state(false);
	let detailPurchase = $state<InventoryPurchaseListItem | null>(null);

	const branchOptions = $derived(
		branches
			.filter((branch) => branch.state)
			.map((branch) => ({ value: branch.code, label: branch.name }) as SelectOption)
	);

	const purchaseRows = $derived(purchases as unknown as TableRow[]);
	const canGoPrev = $derived(pagination.page > 1);
	const canGoNext = $derived(pagination.page < pagination.total_pages);
	const activeBranchLabel = $derived.by(
		() =>
			branches.find((branch) => branch.code === filterBranchCode)?.name ?? 'Sin sede seleccionada'
	);

	function branchQuery(branchCode: string): string {
		if (!branchCode) return '';
		const params = new URLSearchParams({ branch_code: branchCode });
		return `?${params.toString()}`;
	}

	function navigateWithBranch(path: '/inventory' | '/inventory/purchases/new'): void {
		const destination = `${path}${branchQuery(filterBranchCode)}` as
			| '/inventory'
			| '/inventory/purchases/new';
		void goto(resolve(destination));
	}

	onDestroy(() => {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
	});

	$effect(() => {
		const nextPurchases = (data.purchases ?? []) as InventoryPurchaseListItem[];
		const nextPagination = (data.pagination ?? EMPTY_PAGINATION) as InventoryPagination;
		const nextBranches = (data.branches ?? []) as BranchCatalogItem[];

		purchases = nextPurchases;
		pagination = nextPagination;
		branches = nextBranches;

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

	function canRefundPurchase(purchase: InventoryPurchaseListItem): boolean {
		if (purchase.state === 'in_transit') return true;
		if (purchase.state === 'received') return purchase.can_refund;
		return false;
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
				state: filterState,
				page: String(page),
				page_size: String(pagination.page_size || 20)
			});

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

	function openPurchaseDetail(purchase: InventoryPurchaseListItem): void {
		detailPurchase = purchase;
		showDetailDialog = true;
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
		subtitle="Flujo de entradas con filtros laterales y control claro de reembolsos"
		icon="shoppingBag"
	>
		{#snippet actions()}
			<div
				class="lumi-flex lumi-flex--gap-sm lumi-align-items--center inventory-purchases__header-actions"
			>
				<button
					type="button"
					class="inventory-purchases__mobile-toggle"
					onclick={() => (showMobileSidebar = true)}
				>
					Filtros
				</button>
				<Button
					type="border"
					color="info"
					icon="boxes"
					onclick={() => navigateWithBranch('/inventory')}
				>
					Stock
				</Button>
				<Button
					type="filled"
					color="primary"
					icon="plus"
					onclick={() => navigateWithBranch('/inventory/purchases/new')}
					disabled={!canCreate}
				>
					Nueva compra
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<div class="lumi-layout--two-columns inventory-purchases__layout">
		<aside class="lumi-layout--sidebar-left inventory-purchases__sidebar">
			<Card spaced>
				{@render purchasesSidebar()}
			</Card>
		</aside>

		{#if showMobileSidebar}
			<button
				type="button"
				class="inventory-purchases__drawer-backdrop"
				onclick={() => (showMobileSidebar = false)}
				aria-label="Cerrar filtros de compras"
			></button>
			<aside class="inventory-purchases__drawer">
				<Card spaced>
					<div class="inventory-purchases__drawer-header">
						<p class="lumi-margin--none lumi-font--semibold">Panel de compras</p>
						<Button type="flat" size="sm" icon="x" onclick={() => (showMobileSidebar = false)} />
					</div>
					{@render purchasesSidebar()}
				</Card>
			</aside>
		{/if}

		<section class="lumi-layout--content-right">
			<div class="lumi-stack lumi-space--sm">
				{#if !canRead}
					<Alert type="warning" closable>No tienes permisos para consultar compras.</Alert>
				{:else}
					{#if errorMessage}
						<Alert type="danger" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
					{/if}

					<Card spaced>
						<div class="inventory-purchases__active-context">
							<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Sede activa</p>
							<p class="lumi-margin--none lumi-font--semibold">
								{activeBranchLabel} · {pagination.total} registros
							</p>
						</div>
					</Card>

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
										<span class="lumi-text--xs lumi-text--muted"
											>{purchase.product_sku || 'Sin SKU'}</span
										>
									</div>
								</td>
								<td>{purchase.quantity}</td>
								<td>{purchaseOriginLabel(purchase.origin)}</td>
								<td>{purchase.tracking_number || '-'}</td>
								<td>
									<Chip size="sm" color={purchase.entry_type === 'initial' ? 'info' : 'primary'}>
										{purchase.entry_type === 'initial' ? 'Inicial' : 'Reposicion'}
									</Chip>
								</td>
								<td>
									<Chip color={purchaseStateColor(purchase.state)} size="sm">
										{purchaseStateLabel(purchase.state)}
									</Chip>
								</td>
								<td>{purchase.unit_cost ? formatProductPrice(purchase.unit_cost) : '-'}</td>
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
												disabled={!canUpdate || !canRefundPurchase(purchase)}
												onclick={() => void updatePurchaseState(purchase.code, 'refunded')}
											>
												{purchase.can_refund ? 'Reembolsar' : 'Sin stock'}
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
								Pagina {pagination.page} de {pagination.total_pages} · {pagination.total} registros
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

{#snippet purchasesSidebar()}
	<div class="lumi-stack lumi-space--sm">
		<div class="inventory-purchases__sidebar-section">
			<p class="inventory-purchases__sidebar-label">Filtros</p>
			<Select
				size="md"
				label="Sede"
				value={filterBranchCode}
				options={branchOptions}
				clearable={false}
				onchange={async (value) => {
					filterBranchCode = typeof value === 'string' ? value : filterBranchCode;
					await loadPurchases(1);
					showMobileSidebar = false;
				}}
			/>
			<Input
				size="md"
				label="Buscar producto / SKU / tracking"
				icon="search"
				value={searchQuery}
				oninput={(event) =>
					handleSearchInput((event.currentTarget as HTMLInputElement | null)?.value ?? '')}
			/>
			<Select
				size="md"
				label="Origen"
				value={filterOrigin}
				options={PURCHASE_ORIGIN_OPTIONS}
				clearable={false}
				onchange={async (value) => {
					filterOrigin = (typeof value === 'string' ? value : 'all') as typeof filterOrigin;
					await loadPurchases(1);
					showMobileSidebar = false;
				}}
			/>
		</div>

		<div class="inventory-purchases__sidebar-section">
			<p class="inventory-purchases__sidebar-label">Estado</p>
			<SegmentedControl
				value={filterState}
				options={PURCHASE_STATE_SEGMENT_OPTIONS as unknown as {
					label: string;
					value: string;
					icon?: string;
				}[]}
				fullWidth
				onchange={async (value) => {
					filterState = (typeof value === 'string' ? value : 'received') as InventoryPurchaseState;
					await loadPurchases(1);
					showMobileSidebar = false;
				}}
			/>
		</div>

		<div class="inventory-purchases__sidebar-section">
			<p class="inventory-purchases__sidebar-label">Tipo</p>
			<div class="inventory-purchases__type-options">
				{#each ENTRY_TYPE_OPTIONS as option (option.value)}
					<div class="inventory-purchases__type-option">
						<Radio
							name="purchase-type-filter"
							group={filterEntryType}
							value={option.value}
							label={option.label}
							onchange={async (value) => {
								filterEntryType = (
									typeof value === 'string' ? value : 'all'
								) as typeof filterEntryType;
								await loadPurchases(1);
								showMobileSidebar = false;
							}}
						/>
						<span class="inventory-purchases__type-option-description">
							{option.value === 'initial'
								? 'Ingreso de arranque'
								: option.value === 'restock'
									? 'Reposicion operativa'
									: 'Todos los tipos'}
						</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/snippet}

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
					{detailPurchase.entry_type === 'initial' ? 'Inicial' : 'Reposicion'}
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
	.inventory-purchases__layout {
		align-items: start;
	}

	.inventory-purchases__header-actions {
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.inventory-purchases__sidebar {
		min-width: 0;
	}

	.inventory-purchases__sidebar :global(.lumi-card) {
		height: 100%;
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		background:
			linear-gradient(
				155deg,
				color-mix(in srgb, var(--lumi-color-warning) 8%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-info) 4%, transparent) 55%,
				transparent 100%
			),
			color-mix(in srgb, var(--lumi-color-surface) 94%, transparent);
		backdrop-filter: blur(var(--lumi-blur-md));
	}

	.inventory-purchases__sidebar-section {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
	}

	.inventory-purchases__sidebar-label {
		margin: 0;
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-semibold);
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--lumi-color-text-muted);
	}

	.inventory-purchases__type-options {
		display: grid;
		gap: var(--lumi-space-sm);
	}

	.inventory-purchases__type-options :global(.lumi-radio) {
		width: 100%;
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-lg);
		background: var(--lumi-color-surface);
		transition: var(--lumi-transition-all);
	}

	.inventory-purchases__type-options :global(.lumi-radio:not(.lumi-radio--disabled):hover) {
		border-color: var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 4%, var(--lumi-color-surface));
	}

	.inventory-purchases__type-options :global(.lumi-radio--checked) {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 32%, var(--lumi-color-border));
		background: color-mix(in srgb, var(--lumi-color-primary) 8%, var(--lumi-color-surface));
	}

	.inventory-purchases__type-option {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	.inventory-purchases__type-option-description {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
		padding-left: calc(var(--lumi-icon-md) + var(--lumi-space-sm));
	}

	.inventory-purchases__active-context {
		padding: var(--lumi-space-sm);
		border-radius: var(--lumi-radius-lg);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		background: color-mix(in srgb, var(--lumi-color-surface) 92%, transparent);
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
		background: color-mix(in srgb, var(--lumi-color-surface) 94%, transparent);
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
		background: color-mix(in srgb, var(--lumi-color-surface) 94%, transparent);
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	:global(.inventory-table--purchases .lumi-table__content) {
		min-width: 74rem;
	}

	.inventory-purchases__mobile-toggle {
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

	.inventory-purchases__mobile-toggle:hover {
		background: var(--lumi-color-background-hover);
		border-color: var(--lumi-color-primary);
	}

	.inventory-purchases__drawer-backdrop {
		display: none;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
	}

	.inventory-purchases__drawer {
		display: none;
	}

	.inventory-purchases__drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	@media (max-width: 1024px) {
		.inventory-purchases__layout {
			grid-template-columns: 1fr;
		}

		.inventory-purchases__sidebar {
			display: none;
		}

		.inventory-purchases__header-actions {
			justify-content: flex-start;
		}

		.inventory-purchases__mobile-toggle {
			display: flex;
			padding: var(--lumi-space-xs) var(--lumi-space-sm);
		}

		.inventory-purchases__drawer-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			z-index: var(--lumi-z-modal);
			background: var(--lumi-color-overlay);
			backdrop-filter: blur(var(--lumi-blur-sm));
			animation: lumi-fade-in 0.2s ease;
		}

		.inventory-purchases__drawer {
			display: block;
			position: fixed;
			top: 0;
			left: 0;
			bottom: 0;
			width: min(var(--lumi-drive-drawer-width), 85vw);
			z-index: calc(var(--lumi-z-modal) + 1);
			padding: var(--lumi-space-sm);
			overflow-y: auto;
			animation: inventory-purchases-drawer-slide 0.25s cubic-bezier(0.2, 0, 0.13, 1.5);
		}

		.inventory-purchases__drawer :global(.lumi-card) {
			height: 100%;
		}

		.inventory-purchases__detail-grid {
			grid-template-columns: 1fr;
		}
	}

	@keyframes inventory-purchases-drawer-slide {
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
