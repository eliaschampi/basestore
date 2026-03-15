<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		Alert,
		Button,
		Chip,
		Dialog,
		EmptyState,
		IconBadge,
		Image,
		Input,
		Table
	} from '$lib/components';
	import type { TableRow } from '$lib/components';
	import { getDriveServeUrl } from '$lib/utils/drive';
	import { formatProductPrice } from '$lib/utils/products';
	import type { ProductSearchDialogProps, ProductSearchResult } from './types';

	let { open = $bindable(false), onselect }: ProductSearchDialogProps = $props();

	let query = $state('');
	let loading = $state(false);
	let results = $state<ProductSearchResult[]>([]);
	let hasSearched = $state(false);
	let searchError = $state('');

	const resultRows = $derived(results as unknown as TableRow[]);

	$effect(() => {
		if (!open) {
			query = '';
			loading = false;
			results = [];
			hasSearched = false;
			searchError = '';
		}
	});

	function handleSubmit(event: SubmitEvent): void {
		event.preventDefault();
		void searchProducts();
	}

	async function searchProducts(): Promise<void> {
		const q = query.trim();
		if (!q) return;

		loading = true;
		hasSearched = true;
		searchError = '';

		try {
			const params = new URLSearchParams({ search: q, limit: '20' });
			const response = await fetch(`/api/products?${params.toString()}`);

			if (!response.ok) {
				const payload = (await response.json()) as { message?: string };
				throw new Error(payload?.message ?? 'Error al buscar productos');
			}

			const payload = (await response.json()) as { products: ProductSearchResult[] };
			results = payload.products ?? [];
		} catch (caught) {
			searchError = caught instanceof Error ? caught.message : 'Error al buscar productos';
			results = [];
		} finally {
			loading = false;
		}
	}

	async function handleRowClick(row: TableRow): Promise<void> {
		const product = row as unknown as ProductSearchResult;
		onselect?.(product);
		open = false;
		await goto(resolve(`/products/${product.code}` as '/'));
	}
</script>

<Dialog bind:open title="Buscar producto" size="md" scrollable>
	<div class="lumi-stack lumi-stack--md">
		<form onsubmit={handleSubmit}>
			<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm lumi-flex--wrap">
				<div class="lumi-flex-item--grow">
					<Input bind:value={query} placeholder="Nombre o SKU del producto..." icon="search" />
				</div>
				<Button type="flat" color="primary" icon="search" button="submit" {loading}>Buscar</Button>
			</div>
		</form>

		{#if searchError}
			<Alert type="danger" closable onclose={() => (searchError = '')}>{searchError}</Alert>
		{/if}

		{#if !hasSearched}
			<EmptyState
				title="Sin resultados todavía"
				description="Escribe el nombre o SKU y pulsa Buscar para encontrar productos."
				icon="search"
			/>
		{:else if loading}
			<div class="lumi-flex lumi-flex--center lumi-padding--xl">
				<span class="lumi-text--sm lumi-text--muted">Buscando productos...</span>
			</div>
		{:else if results.length === 0}
			<EmptyState
				title="Sin coincidencias"
				description="No se encontraron productos con ese nombre o SKU."
				icon="package"
			/>
		{:else}
			<Table
				data={resultRows}
				hover
				pagination={false}
				onrow-click={(row) => void handleRowClick(row)}
			>
				{#snippet thead()}
					<th>Producto</th>
					<th>Precio</th>
					<th>Estado</th>
				{/snippet}

				{#snippet row({ row })}
					{@const product = row as unknown as ProductSearchResult}
					<td>
						<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
							{#if product.primary_image_url}
								<Image
									src={getDriveServeUrl(product.primary_image_url, { variant: 'thumb' })}
									alt={product.name}
									width={32}
									height={32}
									radius="md"
								/>
							{:else}
								<IconBadge icon="package" color="info" size="sm" />
							{/if}
							<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
								<span class="lumi-font--medium lumi-text-ellipsis">{product.name}</span>
								<span class="lumi-text--xs lumi-text--muted">
									{[product.sku, product.brand_name].filter(Boolean).join(' · ') || '—'}
								</span>
							</div>
						</div>
					</td>
					<td>
						<span class="lumi-font--medium">{formatProductPrice(product.price)}</span>
					</td>
					<td>
						<Chip color={product.is_active ? 'success' : 'danger'} size="sm">
							{product.is_active ? 'Activo' : 'Inactivo'}
						</Chip>
					</td>
				{/snippet}
			</Table>
		{/if}
	</div>
</Dialog>
