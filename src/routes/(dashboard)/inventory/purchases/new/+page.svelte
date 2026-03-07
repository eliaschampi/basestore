<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import {
		Alert,
		Button,
		Card,
		Input,
		NumberInput,
		PageHeader,
		SegmentedControl,
		Select,
		Table,
		Textarea
	} from '$lib/components';
	import type { SegmentedControlOption, SelectOption, TableRow } from '$lib/components';
	import { showToast } from '$lib/stores/Toast';
	import { formatProductPrice } from '$lib/utils/products';
	import type { InventoryPurchaseEntryType, InventoryPurchaseOrigin } from '$lib/utils/inventory';
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
		cost_price: string;
	}

	interface PurchaseOriginOption {
		value: string;
		label: string;
		apiOrigin: InventoryPurchaseOrigin;
		customLabel?: string;
	}

	interface PurchaseDraftItem {
		product_code: string;
		product_name: string;
		quantity: number;
		unit_cost: number;
	}

	function todayLocalDate(): string {
		const now = new Date();
		const offsetMilliseconds = now.getTimezoneOffset() * 60_000;
		return new Date(now.getTime() - offsetMilliseconds).toISOString().slice(0, 10);
	}

	const { data }: { data: PageData } = $props();

	const PURCHASE_ORIGIN_OPTIONS: PurchaseOriginOption[] = [
		{ value: 'aliexpress', label: 'AliExpress', apiOrigin: 'aliexpress' },
		{ value: 'temu', label: 'Temu', apiOrigin: 'temu' },
		{ value: 'lima', label: 'Lima', apiOrigin: 'lima' },
		{ value: 'amazon', label: 'Amazon', apiOrigin: 'other', customLabel: 'Amazon' },
		{ value: 'ebay', label: 'eBay', apiOrigin: 'other', customLabel: 'eBay' },
		{
			value: 'local_supplier',
			label: 'Proveedor local',
			apiOrigin: 'other',
			customLabel: 'Proveedor local'
		},
		{ value: 'other', label: 'Otros', apiOrigin: 'other' }
	];

	const ENTRY_TYPE_SEGMENT_OPTIONS: SegmentedControlOption[] = [
		{ label: 'Inicial', value: 'initial' },
		{ label: 'Reposicion', value: 'restock' }
	];

	const PURCHASE_STATE_SEGMENT_OPTIONS: SegmentedControlOption[] = [
		{ label: 'En camino', value: 'in_transit', icon: 'clock' },
		{ label: 'Recibido', value: 'received', icon: 'checkCircle' }
	];

	let submitting = $state(false);
	let errorMessage = $state('');

	let createBranchCode = $state('');
	let createOrigin = $state<InventoryPurchaseOrigin>('aliexpress');
	let createOriginOption = $state('aliexpress');
	let createOriginCustom = $state('');
	let createEntryType = $state<InventoryPurchaseEntryType>('restock');
	let createTrackingNumber = $state('');
	let createState = $state<'in_transit' | 'received'>('in_transit');
	let createOrderedAt = $state(todayLocalDate());
	let createNote = $state('');

	let draftProductCode = $state('');
	let draftQuantity = $state(1);
	let draftUnitCost = $state(0);
	let draftItems = $state<PurchaseDraftItem[]>([]);

	onMount(() => {
		if (!createBranchCode) {
			createBranchCode = (data.selectedBranchCode as string | null) || '';
		}
	});

	const branchOptions = $derived(
		((data.branches ?? []) as BranchCatalogItem[])
			.filter((branch) => branch.state)
			.map((branch) => ({ value: branch.code, label: branch.name }) as SelectOption)
	);

	const products = $derived(
		((data.products ?? []) as ProductCatalogItem[]).filter((product) => product.is_active)
	);

	const productOptions = $derived(
		products.map((product) => ({ value: product.code, label: product.name }) as SelectOption)
	);
	const originOptions = $derived(
		PURCHASE_ORIGIN_OPTIONS.map(
			(option) => ({ value: option.value, label: option.label }) as SelectOption
		)
	);

	const itemRows = $derived(draftItems as unknown as TableRow[]);
	const itemCount = $derived(draftItems.length);
	const totalQuantity = $derived(draftItems.reduce((total, item) => total + item.quantity, 0));
	const totalCost = $derived(
		draftItems.reduce((total, item) => total + item.quantity * item.unit_cost, 0)
	);

	function branchQuery(branchCode: string): string {
		if (!branchCode) return '';
		const params = new URLSearchParams({ branch_code: branchCode });
		return `?${params.toString()}`;
	}

	function selectedDraftProduct(): ProductCatalogItem | null {
		if (!draftProductCode) return null;
		return products.find((product) => product.code === draftProductCode) ?? null;
	}

	function syncDraftUnitCostFromProduct(productCode: string): void {
		const product = products.find((item) => item.code === productCode);
		if (product) {
			draftUnitCost = Number(product.cost_price ?? '0') || 0;
		}
	}

	function addDraftItem(): void {
		const product = selectedDraftProduct();
		const quantity = Number(draftQuantity);
		const unitCost = Number(draftUnitCost);

		if (!product) {
			errorMessage = 'Selecciona un producto para agregar a la compra.';
			return;
		}

		if (!Number.isInteger(quantity) || quantity <= 0) {
			errorMessage = 'La cantidad del item debe ser un entero mayor a 0.';
			return;
		}

		if (!Number.isFinite(unitCost) || unitCost < 0) {
			errorMessage = 'El costo unitario debe ser válido y mayor o igual a 0.';
			return;
		}

		errorMessage = '';

		const existing = draftItems.find((item) => item.product_code === product.code);
		if (existing) {
			draftItems = draftItems.map((item) =>
				item.product_code === product.code
					? {
							...item,
							quantity: item.quantity + quantity,
							unit_cost: unitCost
						}
					: item
			);
		} else {
			draftItems = [
				...draftItems,
				{
					product_code: product.code,
					product_name: product.name,
					quantity,
					unit_cost: unitCost
				}
			];
		}

		draftProductCode = '';
		draftQuantity = 1;
		draftUnitCost = 0;
	}

	function removeDraftItem(productCode: string): void {
		draftItems = draftItems.filter((item) => item.product_code !== productCode);
	}

	function setDraftItemQuantity(productCode: string, quantity: number): void {
		const normalizedQuantity = Math.max(1, Math.floor(quantity));
		draftItems = draftItems.map((item) =>
			item.product_code === productCode
				? {
						...item,
						quantity: normalizedQuantity
					}
				: item
		);
	}

	function applyOriginOption(value: string): void {
		const option = PURCHASE_ORIGIN_OPTIONS.find((item) => item.value === value);
		if (!option) return;

		createOriginOption = option.value;
		createOrigin = option.apiOrigin;
		if (option.apiOrigin === 'other') {
			createOriginCustom = option.customLabel ?? createOriginCustom;
		} else {
			createOriginCustom = '';
		}
	}

	async function goToPurchasesList(): Promise<void> {
		const destination =
			`/inventory/purchases${branchQuery(createBranchCode)}` as '/inventory/purchases';
		await goto(resolve(destination));
	}

	async function submitCreatePurchase(): Promise<void> {
		if (submitting) return;

		if (!createBranchCode) {
			errorMessage = 'Selecciona la sede destino.';
			return;
		}

		if (draftItems.length === 0) {
			errorMessage = 'Agrega al menos un item antes de registrar la compra.';
			return;
		}

		if (createOrigin === 'other' && createOriginCustom.trim().length < 2) {
			errorMessage = 'Cuando eliges "Otros", indica el origen personalizado.';
			return;
		}

		submitting = true;
		errorMessage = '';
		try {
			const response = await fetch('/api/inventory/purchases', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					branch_code: createBranchCode,
					origin: createOrigin,
					entry_type: createEntryType,
					tracking_number: createTrackingNumber.trim() || null,
					state: createState,
					ordered_at: createOrderedAt,
					origin_custom: createOrigin === 'other' ? createOriginCustom.trim() : null,
					note: createNote.trim(),
					items: draftItems.map((item) => ({
						product_code: item.product_code,
						quantity: item.quantity,
						unit_cost: item.unit_cost
					}))
				})
			});
			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo registrar la compra');
			}

			showToast('Compra registrada', 'success');
			await goToPurchasesList();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al registrar compra';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="lumi-stack lumi-space--md">
	<PageHeader
		title="Nueva compra"
		subtitle="Registra items, costos y estado inicial en un solo flujo"
		icon="shoppingBag"
	>
		{#snippet actions()}
			<div class="lumi-flex lumi-flex--gap-sm">
				<Button type="border" icon="chevronLeft" onclick={goToPurchasesList}>Volver</Button>
				<Button
					type="flat"
					color="success"
					icon="checkCircle"
					loading={submitting}
					onclick={() => void submitCreatePurchase()}
				>
					Registrar
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
					<p class="lumi-margin--none lumi-font--semibold">Compra</p>
					<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
						Define sede, origen, tracking y estado inicial.
					</p>
				</div>
				<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
					<Select
						label="Sede destino"
						value={createBranchCode}
						options={branchOptions}
						placeholder="Selecciona sede"
						onchange={(value) => {
							createBranchCode = typeof value === 'string' ? value : '';
						}}
					/>
					<Input
						label="Fecha pedido"
						type="date"
						value={createOrderedAt}
						oninput={(event) => (createOrderedAt = (event.currentTarget as HTMLInputElement).value)}
					/>
					<Input
						label="Tracking (opcional)"
						placeholder="Ej: LP009123456789"
						value={createTrackingNumber}
						oninput={(event) =>
							(createTrackingNumber = (event.currentTarget as HTMLInputElement).value)}
					/>
				</div>
				<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
					<Select
						label="Origen"
						value={createOriginOption}
						options={originOptions}
						clearable={false}
						onchange={(value) => {
							applyOriginOption(typeof value === 'string' ? value : 'aliexpress');
						}}
					/>
					<div class="lumi-stack lumi-space--xs">
						<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Tipo</p>
						<SegmentedControl
							value={createEntryType}
							options={ENTRY_TYPE_SEGMENT_OPTIONS}
							fullWidth
							onchange={(value) => {
								createEntryType = (
									typeof value === 'string' ? value : 'restock'
								) as InventoryPurchaseEntryType;
							}}
						/>
					</div>
					<div class="lumi-stack lumi-space--xs">
						<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Estado inicial</p>
						<SegmentedControl
							value={createState}
							options={PURCHASE_STATE_SEGMENT_OPTIONS}
							fullWidth
							onchange={(value) => {
								createState = (
									typeof value === 'string' ? value : 'in_transit'
								) as typeof createState;
							}}
						/>
					</div>
				</div>
				{#if createOrigin === 'other'}
					<Input
						label="Origen personalizado"
						placeholder="Ej: proveedor de Instagram, feria local..."
						value={createOriginCustom}
						oninput={(event) =>
							(createOriginCustom = (event.currentTarget as HTMLInputElement).value)}
					/>
				{/if}
			</div>

			<div class="inventory-create-section">
				<div class="lumi-stack lumi-space--2xs">
					<p class="lumi-margin--none lumi-font--semibold">Items</p>
					<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
						Carga producto, cantidad y costo unitario en un solo bloque.
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
							onchange={(value) => {
								draftProductCode = typeof value === 'string' ? value : '';
								syncDraftUnitCostFromProduct(draftProductCode);
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
						<NumberInput
							label="Costo unitario"
							value={draftUnitCost}
							min={0}
							max={1000000}
							step={0.5}
							onchange={(value) => {
								draftUnitCost = value;
							}}
						/>
					</div>
					<div class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--wrap">
						<p class="lumi-margin--none lumi-text--xs lumi-text--muted">
							Presiona Enter para agregar rapidamente.
						</p>
						<Button type="flat" color="primary" icon="plus" button="submit">Agregar item</Button>
					</div>
				</form>
				<div class="lumi-stack lumi-space--2xs">
					<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
						{itemCount}
						{itemCount === 1 ? 'item' : 'items'} · {totalQuantity} unidades ·
						{formatProductPrice(totalCost)} estimado
					</p>
				</div>
				{#if draftItems.length !== 0}
					<Table data={itemRows} pagination={false}>
						{#snippet thead()}
							<th>Producto</th>
							<th>Cantidad</th>
							<th>Costo unitario</th>
							<th>Subtotal</th>
							<th>Acción</th>
						{/snippet}
						{#snippet row({ row })}
							{@const item = row as unknown as PurchaseDraftItem}
							<td>{item.product_name}</td>
							<td>
								<NumberInput
									size="sm"
									value={item.quantity}
									min={1}
									max={100000}
									step={1}
									onchange={(value) => setDraftItemQuantity(item.product_code, value)}
								/>
							</td>
							<td>{formatProductPrice(item.unit_cost)}</td>
							<td>{formatProductPrice(item.quantity * item.unit_cost)}</td>
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
				</div>
				<Textarea
					label="Contexto operativo opcional para el equipo."
					rows={3}
					value={createNote}
					oninput={(event) => (createNote = (event.currentTarget as HTMLTextAreaElement).value)}
				/>
			</div>
		</div>
	</Card>
</div>
