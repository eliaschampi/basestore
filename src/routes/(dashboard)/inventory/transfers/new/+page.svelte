<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		Alert,
		Button,
		Card,
		Input,
		NumberInput,
		PageHeader,
		Select,
		Table,
		Textarea
	} from '$lib/components';
	import type { SelectOption, TableRow } from '$lib/components';
	import { showToast } from '$lib/stores/Toast';
	import type { PageData } from './$types';

	interface BranchCatalogItem {
		code: string;
		name: string;
		state: boolean;
	}

	interface ProductCatalogItem {
		code: string;
		name: string;
		is_active: boolean;
		sku: string | null;
	}

	interface TransferDraftItem {
		product_code: string;
		product_name: string;
		product_sku: string | null;
		quantity: number;
		available_at_source: number;
	}

	interface TransferStockSnapshot {
		product_code: string;
		available: number;
	}

	function todayLocalDate(): string {
		const now = new Date();
		const offsetMilliseconds = now.getTimezoneOffset() * 60_000;
		return new Date(now.getTime() - offsetMilliseconds).toISOString().slice(0, 10);
	}

	const { data }: { data: PageData } = $props();

	let submitting = $state(false);
	let errorMessage = $state('');
	let draftStockLoading = $state(false);

	let createSourceBranchCode = $state('');
	let createDestinationBranchCode = $state('');
	let createTransferredAt = $state(todayLocalDate());
	let createNote = $state('');

	let draftProductCode = $state('');
	let draftQuantity = $state(1);
	let draftItems = $state<TransferDraftItem[]>([]);
	let draftProductStock = $state<TransferStockSnapshot | null>(null);
	let stockRequestId = 0;

	onMount(() => {
		createSourceBranchCode = (data.selectedSourceBranchCode as string | null) || '';
		createDestinationBranchCode = (data.selectedDestinationBranchCode as string | null) || '';
		draftProductCode = (data.selectedProductCode as string | null) || '';

		if (createSourceBranchCode && createDestinationBranchCode === createSourceBranchCode) {
			createDestinationBranchCode = '';
		}

		if (draftProductCode && createSourceBranchCode) {
			void loadDraftProductStock(draftProductCode);
		}
	});

	const branches = $derived((data.branches ?? []) as BranchCatalogItem[]);
	const products = $derived(
		((data.products ?? []) as ProductCatalogItem[]).filter((product) => product.is_active)
	);
	const sourceBranchOptions = $derived(
		branches
			.filter((branch) => branch.state)
			.map((branch) => ({ value: branch.code, label: branch.name }) as SelectOption)
	);
	const destinationBranchOptions = $derived(
		branches
			.filter((branch) => branch.state && branch.code !== createSourceBranchCode)
			.map((branch) => ({ value: branch.code, label: branch.name }) as SelectOption)
	);
	const productOptions = $derived(
		products.map(
			(product) =>
				({
					value: product.code,
					label: product.sku ? `${product.name} · ${product.sku}` : product.name
				}) as SelectOption
		)
	);
	const itemRows = $derived(draftItems as unknown as TableRow[]);
	const itemCount = $derived(draftItems.length);
	const totalQuantity = $derived(draftItems.reduce((total, item) => total + item.quantity, 0));
	const selectedProductLabel = $derived.by(() => {
		const product = products.find((item) => item.code === draftProductCode);
		if (!product) return 'Selecciona un producto';
		return product.sku ? `${product.name} · ${product.sku}` : product.name;
	});

	function selectedDraftProduct(): ProductCatalogItem | null {
		if (!draftProductCode) return null;
		return products.find((product) => product.code === draftProductCode) ?? null;
	}

	function clearDraftForSourceChange(): void {
		draftItems = [];
		draftProductStock = null;
		draftQuantity = 1;
		errorMessage = '';
	}

	async function handleSourceBranchChange(value: string | number | object | null): Promise<void> {
		const nextValue = typeof value === 'string' ? value : '';
		if (createSourceBranchCode === nextValue) return;

		createSourceBranchCode = nextValue;
		if (createDestinationBranchCode === createSourceBranchCode) {
			createDestinationBranchCode = '';
		}

		clearDraftForSourceChange();
		if (draftProductCode) {
			await loadDraftProductStock(draftProductCode);
		}
	}

	async function loadDraftProductStock(productCode = draftProductCode): Promise<void> {
		if (!createSourceBranchCode || !productCode) {
			draftProductStock = null;
			return;
		}

		const requestId = ++stockRequestId;
		draftStockLoading = true;
		try {
			const params = new SvelteURLSearchParams({
				source_branch_code: createSourceBranchCode,
				product_code: productCode
			});

			const response = await fetch(`/api/inventory/transfers/stock?${params.toString()}`);
			const payload = await response.json();

			if (requestId !== stockRequestId) return;
			if (!response.ok) {
				throw new Error(
					(payload?.message as string) || 'No se pudo consultar el stock del producto'
				);
			}

			draftProductStock = payload.stock as TransferStockSnapshot;
		} catch (caught) {
			if (requestId === stockRequestId) {
				draftProductStock = null;
				errorMessage =
					caught instanceof Error ? caught.message : 'Error al consultar stock del producto';
			}
		} finally {
			if (requestId === stockRequestId) {
				draftStockLoading = false;
			}
		}
	}

	function addDraftItem(): void {
		const product = selectedDraftProduct();
		const quantity = Number(draftQuantity);

		if (!createSourceBranchCode) {
			errorMessage = 'Selecciona primero la sede origen.';
			return;
		}

		if (!product) {
			errorMessage = 'Selecciona un producto para agregar a la transferencia.';
			return;
		}

		if (!Number.isInteger(quantity) || quantity <= 0) {
			errorMessage = 'La cantidad del item debe ser un entero mayor a 0.';
			return;
		}

		if (!draftProductStock || draftProductStock.product_code !== product.code) {
			errorMessage = 'Espera a que se cargue el stock del producto seleccionado.';
			return;
		}

		const currentQuantity =
			draftItems.find((item) => item.product_code === product.code)?.quantity ?? 0;
		const remainingAvailable = draftProductStock.available - currentQuantity;
		if (remainingAvailable <= 0) {
			errorMessage = 'No hay stock disponible en la sede origen para este producto.';
			return;
		}

		if (quantity > remainingAvailable) {
			errorMessage = `Solo puedes mover ${remainingAvailable} unidades adicionales de este producto.`;
			return;
		}

		errorMessage = '';

		const existing = draftItems.find((item) => item.product_code === product.code);
		if (existing) {
			draftItems = draftItems.map((item) =>
				item.product_code === product.code
					? {
							...item,
							quantity: item.quantity + quantity
						}
					: item
			);
		} else {
			draftItems = [
				...draftItems,
				{
					product_code: product.code,
					product_name: product.name,
					product_sku: product.sku,
					quantity,
					available_at_source: draftProductStock.available
				}
			];
		}

		draftProductCode = '';
		draftQuantity = 1;
		draftProductStock = null;
	}

	function removeDraftItem(productCode: string): void {
		draftItems = draftItems.filter((item) => item.product_code !== productCode);
	}

	function branchQuery(): string {
		if (!createSourceBranchCode) return '';
		const params = new SvelteURLSearchParams({ source_branch_code: createSourceBranchCode });
		return `?${params.toString()}`;
	}

	async function goToTransfersList(): Promise<void> {
		const destination = `/inventory/transfers${branchQuery()}` as '/inventory/transfers';
		await goto(resolve(destination));
	}

	async function submitCreateTransfer(): Promise<void> {
		if (submitting) return;

		if (!createSourceBranchCode) {
			errorMessage = 'Selecciona la sede origen.';
			return;
		}

		if (!createDestinationBranchCode) {
			errorMessage = 'Selecciona la sede destino.';
			return;
		}

		if (createSourceBranchCode === createDestinationBranchCode) {
			errorMessage = 'La sede origen y la sede destino deben ser distintas.';
			return;
		}

		if (draftItems.length === 0) {
			errorMessage = 'Agrega al menos un item antes de registrar la transferencia.';
			return;
		}

		submitting = true;
		errorMessage = '';
		try {
			const response = await fetch('/api/inventory/transfers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					source_branch_code: createSourceBranchCode,
					destination_branch_code: createDestinationBranchCode,
					transferred_at: createTransferredAt,
					note: createNote.trim(),
					items: draftItems.map((item) => ({
						product_code: item.product_code,
						quantity: item.quantity
					}))
				})
			});
			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo registrar la transferencia');
			}

			showToast('Transferencia registrada', 'success');
			await goToTransfersList();
		} catch (caught) {
			errorMessage =
				caught instanceof Error ? caught.message : 'Error al registrar la transferencia';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="lumi-stack lumi-space--md">
	<PageHeader
		title="Nueva transferencia"
		subtitle="Mueve stock entre sedes con validación inmediata"
		icon="arrowLeftRight"
	>
		{#snippet actions()}
			<div class="lumi-flex lumi-flex--gap-sm">
				<Button type="border" icon="chevronLeft" onclick={goToTransfersList}>Volver</Button>
				<Button
					type="filled"
					color="secondary"
					icon="checkCircle"
					loading={submitting}
					onclick={() => void submitCreateTransfer()}
				>
					Registrar transferencia
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	{#if errorMessage}
		<Alert type="danger" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
	{/if}

	<Card spaced>
		<div class="inventory-create-form">
			<div class="inventory-create-section">
				<div class="lumi-stack lumi-space--2xs">
					<p class="lumi-margin--none lumi-font--semibold">Transferencia</p>
					<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
						Selecciona origen, destino y fecha del movimiento.
					</p>
				</div>
				<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
					<Select
						label="Sede origen"
						value={createSourceBranchCode}
						options={sourceBranchOptions}
						placeholder="Selecciona sede origen"
						onchange={async (value) => await handleSourceBranchChange(value)}
					/>
					<Select
						label="Sede destino"
						value={createDestinationBranchCode}
						options={destinationBranchOptions}
						placeholder="Selecciona sede destino"
						onchange={(value) => {
							createDestinationBranchCode = typeof value === 'string' ? value : '';
						}}
					/>
					<Input
						label="Fecha transferencia"
						type="date"
						value={createTransferredAt}
						oninput={(event) =>
							(createTransferredAt = (event.currentTarget as HTMLInputElement).value)}
					/>
				</div>
				<Alert type="info" closable={false}>
					La transferencia descuenta stock de la sede origen y lo acredita de inmediato en la sede
					destino dentro de una sola transaccion.
				</Alert>
			</div>

			<div class="inventory-create-section">
				<div class="lumi-stack lumi-space--2xs">
					<p class="lumi-margin--none lumi-font--semibold">Items</p>
					<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
						Agrega productos validando disponibilidad en la sede origen.
					</p>
				</div>
				<form
					class="lumi-stack lumi-space--sm"
					onsubmit={(event) => {
						event.preventDefault();
						addDraftItem();
					}}
				>
					<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
						<Select
							label="Producto"
							value={draftProductCode}
							options={productOptions}
							placeholder="Selecciona producto"
							onchange={async (value) => {
								draftProductCode = typeof value === 'string' ? value : '';
								errorMessage = '';
								await loadDraftProductStock(draftProductCode);
							}}
						/>
						<NumberInput
							label="Cantidad"
							value={draftQuantity}
							min={1}
							max={100000}
							step={1}
							onchange={(value) => {
								draftQuantity = value;
							}}
						/>
					</div>
					<div class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--wrap">
						<p class="lumi-margin--none lumi-text--xs lumi-text--muted">
							El stock se valida siempre contra la sede origen seleccionada.
						</p>
						<Button type="flat" color="secondary" icon="plus" button="submit">Agregar item</Button>
					</div>
				</form>
				{#if !createSourceBranchCode}
					<Alert type="warning" closable={false}>
						Selecciona primero la sede origen para consultar stock disponible.
					</Alert>
				{:else if draftProductCode}
					<div class="transfer-create__stock-preview">
						{#if draftStockLoading}
							<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
								Consultando stock de {selectedProductLabel}...
							</p>
						{:else if draftProductStock}
							<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Stock disponible</p>
							<p class="lumi-margin--none lumi-font--semibold">{selectedProductLabel}</p>
							<p class="lumi-margin--none lumi-text--sm">{draftProductStock.available} unidades</p>
						{/if}
					</div>
				{/if}
				<div class="lumi-stack lumi-space--2xs">
					<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
						{itemCount}
						{itemCount === 1 ? 'item' : 'items'} · {totalQuantity} unidades
					</p>
				</div>
				{#if draftItems.length === 0}
					<Alert type="info" closable={false}>Aún no agregaste items.</Alert>
				{:else}
					<Table data={itemRows} pagination={false} class="transfer-create__items-table">
						{#snippet thead()}
							<th>Producto</th>
							<th>Disponible en origen</th>
							<th>Cantidad</th>
							<th>Accion</th>
						{/snippet}
						{#snippet row({ row })}
							{@const item = row as unknown as TransferDraftItem}
							<td>
								<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
									<span>{item.product_name}</span>
									<span class="lumi-text--xs lumi-text--muted">
										{item.product_sku || 'Sin SKU'}
									</span>
								</div>
							</td>
							<td>{item.available_at_source}</td>
							<td>{item.quantity}</td>
							<td>
								<Button
									type="flat"
									size="sm"
									icon="trash"
									color="danger"
									onclick={() => removeDraftItem(item.product_code)}
								>
									Quitar
								</Button>
							</td>
						{/snippet}
					</Table>
				{/if}
			</div>

			<div class="inventory-create-section">
				<div class="lumi-stack lumi-space--2xs">
					<p class="lumi-margin--none lumi-font--semibold">Nota</p>
					<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
						Contexto operativo opcional para el equipo.
					</p>
				</div>
				<Textarea
					label="Nota (opcional)"
					rows={3}
					value={createNote}
					oninput={(event) => (createNote = (event.currentTarget as HTMLTextAreaElement).value)}
				/>
			</div>
		</div>
	</Card>
</div>

<style>
	.transfer-create__stock-preview {
		padding: var(--lumi-space-md);
		border-radius: var(--lumi-radius-lg);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		background: color-mix(in srgb, var(--lumi-color-surface) 92%, transparent);
	}

	:global(.transfer-create__items-table .lumi-table__content) {
		min-width: 44rem;
	}
</style>
