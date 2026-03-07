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
		Context,
		ContextItem,
		Dialog,
		InfoItem,
		Input,
		PageHeader,
		PageSidebar,
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
	import type {
		InventoryPagination,
		InventoryPurchaseListItem,
		BranchCatalogItem
	} from '$lib/types/inventory';
	import { createEmptyPagination } from '$lib/types/inventory';
	import {
		buildBranchQuery,
		getItemsMetaLabel,
		getPrimaryProductLabel,
		resolveInventoryBranchCode,
		type InventoryPurchaseEntryType,
		type InventoryPurchaseOrigin,
		type InventoryPurchaseState
	} from '$lib/utils/inventory';
	import type { PageData } from './$types';

	type PurchaseDetailLine = InventoryPurchaseListItem['items'][number];

	const { data }: { data: PageData } = $props();

	const EMPTY_PAGINATION: InventoryPagination = createEmptyPagination(20);

	const PURCHASE_STATE_SEGMENT_OPTIONS = [
		{ label: 'Camino', value: 'in_transit', icon: 'clock' },
		{ label: 'Recibido', value: 'received', icon: 'checkCircle' },
		{ label: 'Reemb.', value: 'refunded', icon: 'undo' }
	] as const;

	const PURCHASE_ORIGIN_OPTIONS: SelectOption[] = [
		{ value: 'all', label: 'Todos los origenes' },
		{ value: 'temu', label: 'Temu' },
		{ value: 'aliexpress', label: 'AliExpress' },
		{ value: 'lima', label: 'Lima' },
		{ value: 'other', label: 'Otros' }
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
	let purchasesContextMenu:
		| {
				open: (event: MouseEvent, data?: unknown) => void;
		  }
		| undefined = $state();
	let contextPurchase = $state<InventoryPurchaseListItem | null>(null);
	let showRefundDialog = $state(false);
	let refundingPurchase = $state(false);
	let refundPurchaseTarget = $state<InventoryPurchaseListItem | null>(null);

	const branchOptions = $derived(
		branches
			.filter((branch) => branch.state)
			.map((branch) => ({ value: branch.code, label: branch.name }) as SelectOption)
	);

	const purchaseRows = $derived(purchases as unknown as TableRow[]);
	const detailPurchaseItemRows = $derived((detailPurchase?.items ?? []) as unknown as TableRow[]);
	const canGoPrev = $derived(pagination.page > 1);
	const canGoNext = $derived(pagination.page < pagination.total_pages);
	const activeBranchLabel = $derived.by(
		() =>
			branches.find((branch) => branch.code === filterBranchCode)?.name ?? 'Sin sede seleccionada'
	);

	function navigateWithBranch(path: '/inventory' | '/inventory/purchases/new'): void {
		const destination = `${path}${buildBranchQuery(filterBranchCode)}` as
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
		if (origin === 'other') return 'Otros';
		return 'Lima';
	}

	function canRefundPurchase(purchase: InventoryPurchaseListItem): boolean {
		if (purchase.state === 'in_transit') return true;
		if (purchase.state === 'received') return purchase.can_refund;
		return false;
	}

	function primaryPurchaseItemLabel(purchase: InventoryPurchaseListItem): string {
		return getPrimaryProductLabel(purchase);
	}

	function purchaseItemsMetaLabel(purchase: InventoryPurchaseListItem): string {
		return getItemsMetaLabel(purchase.item_count);
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

	function openPurchaseContextMenu(event: MouseEvent, row: TableRow): void {
		const purchase = row as unknown as InventoryPurchaseListItem;
		contextPurchase = purchase;
		purchasesContextMenu?.open(event, purchase);
	}

	function openRefundDialog(purchase: InventoryPurchaseListItem): void {
		if (!canUpdate || !canRefundPurchase(purchase)) return;

		refundPurchaseTarget = purchase;
		showRefundDialog = true;
	}

	function closeRefundDialog(): void {
		showRefundDialog = false;
		refundPurchaseTarget = null;
		refundingPurchase = false;
	}

	async function updatePurchaseState(
		purchaseCode: string,
		state: 'received' | 'refunded'
	): Promise<boolean> {
		if (!canUpdate) return false;

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
			return true;
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'Error al actualizar compra';
			showToast(message, 'error');
			return false;
		}
	}

	async function submitRefundPurchase(): Promise<void> {
		if (!refundPurchaseTarget || refundingPurchase) return;

		refundingPurchase = true;
		const updated = await updatePurchaseState(refundPurchaseTarget.code, 'refunded');
		if (updated) {
			closeRefundDialog();
			return;
		}

		refundingPurchase = false;
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
				class="lumi-flex lumi-flex--gap-sm lumi-align-items--center lumi-page-sidebar__header-actions"
			>
				<Button
					type="ghost"
					size="sm"
					icon="slidersHorizontal"
					class="lumi-page-sidebar__mobile-trigger"
					onclick={() => (showMobileSidebar = true)}
					aria-label="Abrir filtros de compras"
				/>
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

	<div class="lumi-layout--two-columns lumi-page-sidebar-layout inventory-purchases__layout">
		<PageSidebar
			bind:mobileOpen={showMobileSidebar}
			variant="inventory-purchases"
			mobileTitle="Panel de compras"
			mobileAriaLabel="Cerrar filtros de compras"
		>
			{#snippet sidebar()}
				{@render purchasesSidebar()}
			{/snippet}
		</PageSidebar>

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
							<p class="lumi-margin--none lumi-text--xs lumi-text--muted">
								Click derecho sobre una fila para ver acciones.
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
							onrow-click={(row) => openPurchaseDetail(row as unknown as InventoryPurchaseListItem)}
							onrow-contextmenu={openPurchaseContextMenu}
						>
							{#snippet thead()}
								<th>Items</th>
								<th>Unidades</th>
								<th>Origen</th>
								<th>Tracking</th>
								<th>Tipo</th>
								<th>Estado</th>
								<th>Total</th>
								<th>Fecha</th>
							{/snippet}

							{#snippet row({ row })}
								{@const purchase = row as unknown as InventoryPurchaseListItem}
								<td>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span class="lumi-font--medium">{primaryPurchaseItemLabel(purchase)}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{purchaseItemsMetaLabel(purchase)}
										</span>
									</div>
								</td>
								<td>{purchase.total_quantity}</td>
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
								<td>{formatProductPrice(purchase.total_amount)}</td>
								<td>{formatDate(purchase.ordered_at)}</td>
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
		<div class="lumi-page-sidebar__section">
			<p class="lumi-page-sidebar__label">Filtros</p>
			<div>
				<p class="lumi-text--xs lumi-text--muted lumi-margin-bottom--xs">Estado de compra</p>
				<SegmentedControl
					value={filterState}
					options={PURCHASE_STATE_SEGMENT_OPTIONS as unknown as {
						label: string;
						value: string;
						icon?: string;
					}[]}
					fullWidth
					onchange={async (value) => {
						filterState = (
							typeof value === 'string' ? value : 'received'
						) as InventoryPurchaseState;
						await loadPurchases(1);
						showMobileSidebar = false;
					}}
				/>
			</div>
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
			<Input
				size="md"
				label="Buscar producto / SKU / tracking"
				placeholder="Ej: polo, SKU-100"
				icon="search"
				value={searchQuery}
				oninput={(event) =>
					handleSearchInput((event.currentTarget as HTMLInputElement | null)?.value ?? '')}
			/>
		</div>

		<div class="lumi-page-sidebar__section">
			<p class="lumi-page-sidebar__label">Tipo</p>
			<div class="lumi-page-sidebar__radio-group">
				{#each ENTRY_TYPE_OPTIONS as option (option.value)}
					<div class="lumi-page-sidebar__radio-option">
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
					</div>
				{/each}
			</div>
		</div>
	</div>
{/snippet}

<Context bind:this={purchasesContextMenu} aria-label="Acciones de compra">
	{#snippet children({ data })}
		{@const purchase = (data as InventoryPurchaseListItem | null) ?? contextPurchase}
		{#if purchase}
			<ContextItem title="Ver detalle" icon="eye" onclick={() => openPurchaseDetail(purchase)} />
			{#if purchase.state === 'in_transit'}
				<ContextItem
					title="Marcar recibida"
					icon="checkCircle"
					disabled={!canUpdate}
					onclick={() => void updatePurchaseState(purchase.code, 'received')}
				/>
				<ContextItem
					title="Reembolsar compra"
					icon="xCircle"
					danger
					disabled={!canUpdate}
					onclick={() => openRefundDialog(purchase)}
				/>
			{:else if purchase.state === 'received'}
				<ContextItem
					title={purchase.can_refund ? 'Reembolsar compra' : 'Reembolso no disponible'}
					icon="undo"
					danger
					disabled={!canUpdate || !canRefundPurchase(purchase)}
					onclick={() => openRefundDialog(purchase)}
				/>
			{/if}
		{/if}
	{/snippet}
</Context>

<Dialog bind:open={showDetailDialog} title="Detalle de compra" size="lg" scrollable>
	{#if detailPurchase}
		<div class="lumi-stack lumi-space--sm">
			<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-sm">
				<InfoItem layout="vertical" label="Sede" value={detailPurchase.branch_name} />
				<InfoItem
					layout="vertical"
					label="Estado / origen"
					value={`${purchaseStateLabel(detailPurchase.state)} · ${purchaseOriginLabel(detailPurchase.origin)}`}
				/>
				<InfoItem
					layout="vertical"
					label="Items / unidades"
					value={`${detailPurchase.item_count} ${detailPurchase.item_count === 1 ? 'item' : 'items'} · ${detailPurchase.total_quantity} unidades`}
				/>
				<InfoItem
					layout="vertical"
					label="Tipo"
					value={detailPurchase.entry_type === 'initial' ? 'Inicial' : 'Reposicion'}
				/>
				<InfoItem
					layout="vertical"
					label="Tracking"
					value={detailPurchase.tracking_number || 'Sin tracking'}
				/>
				<InfoItem
					layout="vertical"
					label="Monto total"
					value={formatProductPrice(detailPurchase.total_amount)}
				/>
				<InfoItem
					layout="vertical"
					label="Fecha pedido"
					value={formatDate(detailPurchase.ordered_at)}
				/>
				<InfoItem
					layout="vertical"
					label="Cierre"
					value={detailPurchase.received_at
						? `Recibido: ${formatDate(detailPurchase.received_at)}`
						: detailPurchase.refunded_at
							? `Reembolsado: ${formatDate(detailPurchase.refunded_at)}`
							: 'Sin cierre'}
				/>
			</div>
		</div>

		<div class="lumi-stack lumi-space--2xs">
			<p class="lumi-margin--none"><strong>Items</strong></p>
			{#if detailPurchase.items.length > 0}
				<Table
					data={detailPurchaseItemRows}
					pagination={false}
					class="inventory-table inventory-table--purchase-detail"
				>
					{#snippet thead()}
						<th>Producto</th>
						<th>SKU</th>
						<th>Cantidad</th>
						<th>Costo unitario</th>
						<th>Subtotal</th>
					{/snippet}
					{#snippet row({ row })}
						{@const line = row as unknown as PurchaseDetailLine}
						<td>{line.product_name}</td>
						<td>{line.product_sku || '-'}</td>
						<td>{line.quantity}</td>
						<td>{formatProductPrice(line.unit_cost || 0)}</td>
						<td>{formatProductPrice(line.total_amount)}</td>
					{/snippet}
				</Table>
			{:else}
				<Alert type="info" closable={false}>No hay items para mostrar en esta compra.</Alert>
			{/if}
		</div>

		{#if detailPurchase.note}
			<InfoItem layout="vertical" label="Nota" value={detailPurchase.note} />
		{/if}
	{/if}

	{#snippet footer()}
		<Button type="border" onclick={() => (showDetailDialog = false)}>Cerrar</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showRefundDialog} title="Confirmar reembolso" size="sm">
	{#if refundPurchaseTarget}
		<p class="lumi-margin--none">
			Se reembolsará la compra de <strong>{primaryPurchaseItemLabel(refundPurchaseTarget)}</strong>.
		</p>
	{/if}

	{#snippet footer()}
		<Button type="border" onclick={closeRefundDialog}>Cancelar</Button>
		<Button
			type="filled"
			color="danger"
			loading={refundingPurchase}
			disabled={!canUpdate || !refundPurchaseTarget}
			onclick={() => void submitRefundPurchase()}
		>
			Confirmar reembolso
		</Button>
	{/snippet}
</Dialog>

<style>
	.inventory-purchases__layout {
		align-items: start;
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

	:global(.inventory-table--purchases .lumi-table__content) {
		min-width: 74rem;
	}

	:global(.inventory-table--purchase-detail .lumi-table__content) {
		min-width: 38rem;
	}
</style>
