<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Context,
		ContextItem,
		Dialog,
		IconBadge,
		Image,
		Input,
		NumberInput,
		PageHeader,
		Select,
		Table,
		Textarea
	} from '$lib/components';
	import type { SelectOption, TableRow } from '$lib/components';
	import type { ProductOverview } from '$lib/types/products';
	import { showToast } from '$lib/stores/Toast';
	import { can } from '$lib/stores/permissions';
	import { getDriveServeUrl } from '$lib/utils/drive';
	import { formatProductPrice } from '$lib/utils/products';
	import type { PageData } from './$types';
	import Checkbox from '$lib/components/Checkbox/Checkbox.svelte';

	const { data }: { data: PageData } = $props();

	const canRead = $derived(can('products:read'));
	const canCreate = $derived(can('products:create'));
	const canUpdate = $derived(can('products:update'));
	const canDelete = $derived(can('products:delete'));

	const brandOptions: SelectOption[] = $derived(
		((data.brands ?? []) as { code: string; name: string }[]).map((brand) => ({
			value: brand.code,
			label: brand.name
		}))
	);

	const categoryOptions: SelectOption[] = $derived(
		((data.categories ?? []) as { code: string; name: string }[]).map((category) => ({
			value: category.code,
			label: category.name
		}))
	);

	let showModal = $state(false);
	let showDeleteModal = $state(false);
	let isEditing = $state(false);
	let errorMessage = $state('');
	let selectedProduct = $state<ProductOverview | null>(null);
	let productContextMenu:
		| {
				open: (event: MouseEvent, data?: unknown) => void;
		  }
		| undefined = $state();
	let contextProduct = $state<ProductOverview | null>(null);

	let formName = $state('');
	let formDescription = $state('');
	let formBrandCode = $state('');
	let formCategoryCode = $state('');
	let formPrice = $state(0);
	let formCostPrice = $state(0);
	let formSku = $state('');
	let formIsActive = $state(true);

	function submitForm(formId: string): void {
		const form = document.getElementById(formId);
		if (form instanceof HTMLFormElement) {
			form.requestSubmit();
		}
	}

	function openCreateModal(): void {
		if (!canCreate) {
			return;
		}

		isEditing = false;
		selectedProduct = null;
		formName = '';
		formDescription = '';
		formBrandCode = '';
		formCategoryCode = '';
		formPrice = 0;
		formCostPrice = 0;
		formSku = '';
		formIsActive = true;
		errorMessage = '';
		showModal = true;
	}

	function openEditModal(product: ProductOverview): void {
		if (!canUpdate) {
			return;
		}

		isEditing = true;
		selectedProduct = product;
		formName = product.name;
		formDescription = product.description || '';
		formBrandCode = product.brand_code || '';
		formCategoryCode = product.category_code || '';
		formPrice = parseFloat(product.price ?? '0') || 0;
		formCostPrice = parseFloat(product.cost_price ?? '0') || 0;
		formSku = product.sku || '';
		formIsActive = product.is_active !== false;
		errorMessage = '';
		showModal = true;
	}

	function openDeleteModal(product: ProductOverview): void {
		if (!canDelete) {
			return;
		}

		selectedProduct = product;
		showDeleteModal = true;
	}

	function closeModal(): void {
		showModal = false;
		errorMessage = '';
	}

	function closeDeleteModal(): void {
		showDeleteModal = false;
		selectedProduct = null;
	}

	function goToProductDetail(productCode: string): void {
		void goto(resolve(`/products/${productCode}` as '/'));
	}

	function openProductContextMenu(event: MouseEvent, row: TableRow): void {
		const product = row as unknown as ProductOverview;
		contextProduct = product;
		productContextMenu?.open(event, product);
	}
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader title="Productos" subtitle="Gestiona el catálogo de productos" icon="package">
		{#snippet actions()}
			<Button
				type="filled"
				color="primary"
				icon="plus"
				onclick={openCreateModal}
				disabled={!canCreate}
			></Button>
		{/snippet}
	</PageHeader>

	<Card>
		{#if !canRead}
			<Alert type="warning" closable>No tienes permisos para consultar productos.</Alert>
		{:else}
			<Table
				data={data.products}
				search
				pagination
				hover
				itemsPerPage={10}
				onrow-click={(row) => goToProductDetail((row as unknown as ProductOverview).code)}
				onrow-contextmenu={openProductContextMenu}
			>
				{#snippet thead()}
					<th></th>
					<th>Producto</th>
					<th>Marca</th>
					<th>Categoría</th>
					<th>Precio</th>
					<th>Estado</th>
				{/snippet}

				{#snippet row({ row })}
					{@const product = row as unknown as ProductOverview}
					<td>
						{#if product.primary_image_url}
							<Image
								src={getDriveServeUrl(product.primary_image_url, { variant: 'thumb' })}
								alt={product.name}
								width={38}
								height={38}
								radius="md"
							/>
						{:else}
							<IconBadge icon="package" color="info" size="md" />
						{/if}
					</td>
					<td>
						<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
							<span class="lumi-font--medium">{product.name}</span>
							{#if product.sku}
								<span class="lumi-text--xs lumi-text--muted">{product.sku}</span>
							{/if}
						</div>
					</td>
					<td>
						<span class="lumi-text--sm">{product.brand_name || '—'}</span>
					</td>
					<td>
						<span class="lumi-text--sm">{product.category_name || '—'}</span>
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
	</Card>
</div>

<Context bind:this={productContextMenu} aria-label="Acciones de producto">
	{#snippet children({ data })}
		{@const product = (data as ProductOverview | null) ?? contextProduct}
		{#if product}
			<ContextItem
				title="Gestionar archivos"
				icon="hardDrive"
				onclick={() => goToProductDetail(product.code)}
			/>
			<ContextItem
				title="Editar producto"
				icon="edit"
				disabled={!canUpdate}
				onclick={() => openEditModal(product)}
			/>
			<ContextItem
				title="Eliminar producto"
				icon="trash"
				danger
				disabled={!canDelete}
				onclick={() => openDeleteModal(product)}
			/>
		{/if}
	{/snippet}
</Context>

<Dialog bind:open={showModal} title={isEditing ? 'Editar producto' : 'Nuevo producto'} size="lg">
	<form
		id="product-form"
		method="POST"
		action="?/{isEditing ? 'update' : 'create'}"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast(
						isEditing ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente',
						'success'
					);
					await invalidate('products:load');
					closeModal();
				} else if (result.type === 'failure') {
					const error = result.data?.error;
					errorMessage = (typeof error === 'string' ? error : null) || 'Ocurrió un error';
				}
			};
		}}
	>
		{#if isEditing && selectedProduct}
			<input type="hidden" name="code" value={selectedProduct.code} />
		{/if}

		{#if errorMessage}
			<Alert type="danger" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
		{/if}

		<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-lg">
			<div class="lumi-stack lumi-stack--md">
				<Input
					bind:value={formName}
					name="name"
					label="Nombre del producto"
					placeholder="Ej: Laptop Dell XPS 15"
					icon="package"
					required
				/>

				<Textarea
					bind:value={formDescription}
					name="description"
					label="Descripción"
					placeholder="Describe las características del producto..."
					rows={3}
				/>

				<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
					<Checkbox bind:checked={formIsActive} label="Producto activo" color="success" />
					<input type="hidden" name="is_active" value={formIsActive ? 'on' : ''} />
				</div>
			</div>

			<div class="lumi-stack lumi-stack--md">
				<Select
					bind:value={formBrandCode}
					options={brandOptions}
					label="Marca"
					name="brand_code"
					placeholder="Seleccionar marca"
					autocomplete
				/>
				<Select
					bind:value={formCategoryCode}
					options={categoryOptions}
					label="Categoría"
					name="category_code"
					placeholder="Seleccionar categoría"
					autocomplete
				/>

				<NumberInput
					bind:value={formPrice}
					label="Precio de venta"
					placeholder="0.00"
					min={0}
					step={0.01}
					color="primary"
				/>
				<NumberInput
					bind:value={formCostPrice}
					label="Costo de compra"
					placeholder="0.00"
					min={0}
					step={0.01}
					color="warning"
				/>
				<Input bind:value={formSku} name="sku" label="SKU" placeholder="Ej: PC00012" icon="tag" />
			</div>

			<input type="hidden" name="price" value={formPrice} />
			<input type="hidden" name="cost_price" value={formCostPrice} />
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeModal}>Cancelar</Button>
		<Button type="filled" color="primary" onclick={() => submitForm('product-form')}>
			{isEditing ? 'Actualizar producto' : 'Crear producto'}
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showDeleteModal} title="Eliminar producto" size="sm">
	<form
		id="delete-product-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Producto eliminado exitosamente', 'success');
					await invalidate('products:load');
					closeDeleteModal();
				} else if (result.type === 'failure') {
					const error = result.data?.error;
					showToast((typeof error === 'string' ? error : null) || 'Error al eliminar', 'error');
				}
			};
		}}
	>
		{#if selectedProduct}
			<input type="hidden" name="code" value={selectedProduct.code} />
			<p class="lumi-margin--none">
				¿Deseas eliminar el producto <strong>{selectedProduct.name}</strong>? Esta acción no se
				puede deshacer.
			</p>
		{/if}
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteModal}>Cancelar</Button>
		<Button type="filled" color="danger" onclick={() => submitForm('delete-product-form')}>
			Eliminar
		</Button>
	{/snippet}
</Dialog>
