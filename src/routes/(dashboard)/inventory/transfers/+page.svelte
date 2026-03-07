<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onDestroy } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		Alert,
		Button,
		Card,
		Dialog,
		InfoItem,
		Input,
		PageHeader,
		PageSidebar,
		Select,
		Table
	} from '$lib/components';
	import type { SelectOption, TableRow } from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { formatDate } from '$lib/utils/formatDate';
	import type { InventoryPagination, InventoryProductTransferListItem } from '$lib/types/inventory';
	import type { PageData } from './$types';

	interface BranchCatalogItem {
		code: string;
		name: string;
		state: boolean;
	}

	type TransferDetailLine = InventoryProductTransferListItem['items'][number];

	const { data }: { data: PageData } = $props();

	const EMPTY_PAGINATION: InventoryPagination = {
		page: 1,
		page_size: 20,
		total: 0,
		total_pages: 1
	};

	const canRead = $derived(can('product_transfers:read'));
	const canCreate = $derived(can('product_transfers:create'));

	let transfers = $state<InventoryProductTransferListItem[]>([]);
	let pagination = $state<InventoryPagination>(EMPTY_PAGINATION);
	let branches = $state<BranchCatalogItem[]>([]);

	let loading = $state(false);
	let errorMessage = $state('');
	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;
	let fetchId = 0;

	let filterSourceBranchCode = $state<'all' | string>('all');
	let filterDestinationBranchCode = $state<'all' | string>('all');
	let showMobileSidebar = $state(false);

	let showDetailDialog = $state(false);
	let detailTransfer = $state<InventoryProductTransferListItem | null>(null);

	const branchOptions = $derived([
		{ value: 'all', label: 'Todas las sedes' } as SelectOption,
		...branches.map((branch) => ({ value: branch.code, label: branch.name }) as SelectOption)
	]);

	const transferRows = $derived(transfers as unknown as TableRow[]);
	const detailTransferItemRows = $derived((detailTransfer?.items ?? []) as unknown as TableRow[]);
	const canGoPrev = $derived(pagination.page > 1);
	const canGoNext = $derived(pagination.page < pagination.total_pages);
	const activeSourceBranchLabel = $derived.by(() => {
		if (filterSourceBranchCode === 'all') return 'Todas';
		return branches.find((branch) => branch.code === filterSourceBranchCode)?.name ?? 'Todas';
	});
	const activeDestinationBranchLabel = $derived.by(() => {
		if (filterDestinationBranchCode === 'all') return 'Todas';
		return branches.find((branch) => branch.code === filterDestinationBranchCode)?.name ?? 'Todas';
	});

	onDestroy(() => {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
	});

	$effect(() => {
		transfers = (data.transfers ?? []) as InventoryProductTransferListItem[];
		pagination = (data.pagination ?? EMPTY_PAGINATION) as InventoryPagination;
		branches = (data.branches ?? []) as BranchCatalogItem[];
		filterSourceBranchCode =
			((data.selectedSourceBranchCode as string | null) ?? filterSourceBranchCode) || 'all';
		filterDestinationBranchCode =
			((data.selectedDestinationBranchCode as string | null) ?? filterDestinationBranchCode) ||
			'all';
	});

	function navigateToCreateTransfer(): void {
		const params = new SvelteURLSearchParams();
		if (filterSourceBranchCode !== 'all') {
			params.set('source_branch_code', filterSourceBranchCode);
		}
		if (filterDestinationBranchCode !== 'all') {
			params.set('destination_branch_code', filterDestinationBranchCode);
		}

		const query = params.size > 0 ? `?${params.toString()}` : '';
		void goto(resolve(`/inventory/transfers/new${query}` as '/'));
	}

	function primaryTransferItemLabel(transfer: InventoryProductTransferListItem): string {
		const primaryName = transfer.primary_product_name?.trim();
		if (primaryName) return primaryName;

		const firstLineName = transfer.items
			.find((item) => item.product_name.trim())
			?.product_name?.trim();
		if (firstLineName) return firstLineName;

		return 'Sin items';
	}

	function transferItemsMetaLabel(transfer: InventoryProductTransferListItem): string {
		if (transfer.item_count <= 0) return 'Sin items';

		const extraItems = Math.max(transfer.item_count - 1, 0);
		if (extraItems > 0) {
			return `+${extraItems} ${extraItems === 1 ? 'item' : 'items'}`;
		}

		return '1 item';
	}

	function openTransferDetail(transfer: InventoryProductTransferListItem): void {
		detailTransfer = transfer;
		showDetailDialog = true;
	}

	function handleSearchInput(value: string): void {
		searchQuery = value;
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(() => {
			void loadTransfers(1);
		}, 300);
	}

	async function loadTransfers(page = pagination.page): Promise<void> {
		if (!canRead) return;

		const requestId = ++fetchId;
		loading = true;
		errorMessage = '';

		try {
			const params = new SvelteURLSearchParams({
				page: String(page),
				page_size: String(pagination.page_size || 20)
			});

			if (filterSourceBranchCode !== 'all') {
				params.set('source_branch_code', filterSourceBranchCode);
			}
			if (filterDestinationBranchCode !== 'all') {
				params.set('destination_branch_code', filterDestinationBranchCode);
			}
			if (searchQuery.trim()) {
				params.set('search', searchQuery.trim());
			}

			const response = await fetch(`/api/inventory/transfers?${params.toString()}`);
			const payload = await response.json();

			if (requestId !== fetchId) return;
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudieron cargar las transferencias');
			}

			transfers = (payload.transfers ?? []) as InventoryProductTransferListItem[];
			pagination = (payload.pagination ?? EMPTY_PAGINATION) as InventoryPagination;
		} catch (caught) {
			if (requestId === fetchId) {
				errorMessage = caught instanceof Error ? caught.message : 'Error al cargar transferencias';
			}
		} finally {
			if (requestId === fetchId) {
				loading = false;
			}
		}
	}

	async function applyBranchFilter(
		key: 'source' | 'destination',
		value: string | number | object | null
	): Promise<void> {
		const nextValue = (typeof value === 'string' ? value : 'all') as 'all' | string;
		if (key === 'source') {
			filterSourceBranchCode = nextValue;
		} else {
			filterDestinationBranchCode = nextValue;
		}

		await loadTransfers(1);
		showMobileSidebar = false;
	}
</script>

<div class="lumi-stack lumi-space--md">
	<PageHeader
		title="Transferencias"
		subtitle="Historial operativo entre sedes con filtro cruzado por origen y destino"
		icon="arrowLeftRight"
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
					aria-label="Abrir filtros de transferencias"
				/>
				<Button
					type="filled"
					color="secondary"
					icon="plus"
					onclick={navigateToCreateTransfer}
					disabled={!canCreate}
				>
					Nueva transferencia
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<div class="lumi-layout--two-columns lumi-page-sidebar-layout inventory-transfers__layout">
		<PageSidebar
			bind:mobileOpen={showMobileSidebar}
			variant="inventory-transfers"
			mobileTitle="Panel de transferencias"
			mobileAriaLabel="Cerrar filtros de transferencias"
		>
			{#snippet sidebar()}
				{@render transfersSidebar()}
			{/snippet}
		</PageSidebar>

		<section class="lumi-layout--content-right">
			<div class="lumi-stack lumi-space--sm">
				{#if !canRead}
					<Alert type="warning" closable>No tienes permisos para consultar transferencias.</Alert>
				{:else}
					{#if errorMessage}
						<Alert type="danger" closable onclose={() => (errorMessage = '')}>
							{errorMessage}
						</Alert>
					{/if}

					<Card spaced>
						<div class="inventory-transfers__active-context">
							<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Contexto activo</p>
							<p class="lumi-margin--none lumi-font--semibold">
								Origen: {activeSourceBranchLabel} · Destino: {activeDestinationBranchLabel}
							</p>
							<p class="lumi-margin--none lumi-text--xs lumi-text--muted">
								{pagination.total} registros historicos
							</p>
						</div>
					</Card>

					<Card>
						<Table
							data={transferRows}
							hover
							{loading}
							pagination={false}
							class="inventory-table inventory-table--transfers"
							onrow-click={(row) =>
								openTransferDetail(row as unknown as InventoryProductTransferListItem)}
						>
							{#snippet thead()}
								<th>Items</th>
								<th>Ruta</th>
								<th>Unidades</th>
								<th>Nota</th>
								<th>Fecha</th>
							{/snippet}

							{#snippet row({ row })}
								{@const transfer = row as unknown as InventoryProductTransferListItem}
								<td>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span class="lumi-font--medium">{primaryTransferItemLabel(transfer)}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{transferItemsMetaLabel(transfer)}
										</span>
									</div>
								</td>
								<td>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span>{transfer.source_branch_name}</span>
										<span class="lumi-text--xs lumi-text--muted">
											hacia {transfer.destination_branch_name}
										</span>
									</div>
								</td>
								<td>{transfer.total_quantity}</td>
								<td>{transfer.note || 'Sin nota'}</td>
								<td>{formatDate(transfer.transferred_at)}</td>
							{/snippet}
						</Table>
					</Card>

					<Card spaced>
						<div class="inventory-transfers__pagination">
							<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
								Pagina {pagination.page} de {pagination.total_pages} · {pagination.total} registros
							</p>
							<div class="lumi-flex lumi-flex--gap-sm">
								<Button
									type="border"
									size="sm"
									icon="chevronLeft"
									disabled={!canGoPrev || loading}
									onclick={() => void loadTransfers(pagination.page - 1)}
								>
									Anterior
								</Button>
								<Button
									type="border"
									size="sm"
									iconAfter
									icon="chevronRight"
									disabled={!canGoNext || loading}
									onclick={() => void loadTransfers(pagination.page + 1)}
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

{#snippet transfersSidebar()}
	<div class="lumi-stack lumi-space--sm">
		<div class="lumi-page-sidebar__section">
			<p class="lumi-page-sidebar__label">Filtros</p>
			<Select
				size="md"
				label="Sede origen"
				value={filterSourceBranchCode}
				options={branchOptions}
				clearable={false}
				onchange={async (value) => await applyBranchFilter('source', value)}
			/>
			<Select
				size="md"
				label="Sede destino"
				value={filterDestinationBranchCode}
				options={branchOptions}
				clearable={false}
				onchange={async (value) => await applyBranchFilter('destination', value)}
			/>
			<Input
				size="md"
				label="Buscar producto / SKU / nota"
				placeholder="Ej: polo, SKU-100"
				icon="search"
				value={searchQuery}
				oninput={(event) =>
					handleSearchInput((event.currentTarget as HTMLInputElement | null)?.value ?? '')}
			/>
		</div>
	</div>
{/snippet}

<Dialog bind:open={showDetailDialog} title="Detalle de transferencia" size="lg" scrollable>
	{#if detailTransfer}
		<div class="lumi-stack lumi-space--sm">
			<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-sm">
				<InfoItem
					layout="vertical"
					label="Ruta"
					value={`${detailTransfer.source_branch_name} -> ${detailTransfer.destination_branch_name}`}
				/>
				<InfoItem
					layout="vertical"
					label="Fecha"
					value={formatDate(detailTransfer.transferred_at)}
				/>
				<InfoItem
					layout="vertical"
					label="Items / unidades"
					value={`${detailTransfer.item_count} ${detailTransfer.item_count === 1 ? 'item' : 'items'} · ${detailTransfer.total_quantity} unidades`}
				/>
			</div>

			<div class="lumi-stack lumi-space--2xs">
				<p class="lumi-margin--none"><strong>Items</strong></p>
				<Table
					data={detailTransferItemRows}
					pagination={false}
					class="inventory-table inventory-table--transfer-detail"
				>
					{#snippet thead()}
						<th>Producto</th>
						<th>SKU</th>
						<th>Cantidad</th>
					{/snippet}
					{#snippet row({ row })}
						{@const line = row as unknown as TransferDetailLine}
						<td>{line.product_name}</td>
						<td>{line.product_sku || '-'}</td>
						<td>{line.quantity}</td>
					{/snippet}
				</Table>
			</div>

			{#if detailTransfer.note}
				<InfoItem layout="vertical" label="Nota" value={detailTransfer.note} />
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		<Button type="border" onclick={() => (showDetailDialog = false)}>Cerrar</Button>
	{/snippet}
</Dialog>

<style>
	.inventory-transfers__layout {
		align-items: start;
	}

	.inventory-transfers__active-context {
		padding: var(--lumi-space-sm);
		border-radius: var(--lumi-radius-lg);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		background: color-mix(in srgb, var(--lumi-color-surface) 92%, transparent);
	}

	.inventory-transfers__pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-sm);
		flex-wrap: wrap;
	}

	:global(.inventory-table--transfers .lumi-table__content) {
		min-width: 68rem;
	}

	:global(.inventory-table--transfer-detail .lumi-table__content) {
		min-width: 32rem;
	}
</style>
