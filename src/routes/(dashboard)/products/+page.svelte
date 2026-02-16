<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Dialog,
		DriveFilePreview,
		Icon,
		Input,
		PageHeader,
		Select,
		Switch,
		Table,
		Textarea
	} from '$lib/components';
	import type { DriveFileItem, SelectOption } from '$lib/components';
	import { showToast } from '$lib/stores/Toast';
	import { can } from '$lib/stores/permissions';
	import { formatFileSize, getFileColor, getFileIcon, type DriveFileType } from '$lib/utils/drive';
	import type { PageData } from './$types';

	/* ─── Types ─── */
	interface Product {
		code: string;
		name: string;
		description: string | null;
		brand_code: string | null;
		brand_name: string | null;
		category_code: string | null;
		category_name: string | null;
		price: string | null;
		sku: string | null;
		is_active: boolean | null;
		has_images: boolean | null;
		images_count: number | null;
		primary_image_url: string | null;
		created_at: Date | string | null;
		updated_at: Date | string | null;
	}

	interface DriveLink {
		link_code: string;
		file_code: string;
		file_name: string;
		file_type: DriveFileType;
		file_size: string | number;
		mime_type: string | null;
		storage_path: string | null;
		position: number;
		is_primary: boolean;
		linked_at: string;
	}

	interface DriveFolderFile {
		code: string;
		scope: 'product_shared' | 'user_private';
		name: string;
		type: DriveFileType;
		size: number;
		tag: string | null;
		mime_type: string | null;
		storage_path: string | null;
		parent_code: string | null;
		is_trashed: boolean;
		created_at: string;
		updated_at: string;
		user_code: string;
	}

	// Using SelectOption from $lib/components

	/* ─── Props & derived ─── */
	const { data }: { data: PageData } = $props();

	const canCreate = $derived(can('products:create'));
	const canUpdate = $derived(can('products:update'));
	const canDelete = $derived(can('products:delete'));

	const brandOptions: SelectOption[] = $derived(
		((data.brands ?? []) as { code: string; name: string }[]).map((b) => ({
			value: b.code,
			label: b.name
		}))
	);

	const categoryOptions: SelectOption[] = $derived(
		((data.categories ?? []) as { code: string; name: string }[]).map((c) => ({
			value: c.code,
			label: c.name
		}))
	);

	/* ─── UI state ─── */
	let showModal = $state(false);
	let showDeleteModal = $state(false);
	let showMediaModal = $state(false);
	let showDrivePreview = $state(false);
	let isEditing = $state(false);
	let errorMessage = $state('');
	let selectedProduct = $state<Product | null>(null);
	let previewFile = $state<DriveFileItem | null>(null);

	/* ─── Form state ─── */
	let formName = $state('');
	let formDescription = $state('');
	let formBrandCode = $state('');
	let formCategoryCode = $state('');
	let formPrice = $state('');
	let formSku = $state('');
	let formIsActive = $state(true);

	/* ─── Media picker state ─── */
	let mediaLinks = $state<DriveLink[]>([]);
	let mediaLoading = $state(false);
	let browseFiles = $state<DriveFolderFile[]>([]);
	let browseLoading = $state(false);
	let browseParent = $state<string | null>(null);
	let browseBreadcrumbs = $state<{ label: string; code: string | null }[]>([
		{ label: 'Drive', code: null }
	]);

	/* ─── Helpers ─── */
	function formatPrice(price: string | null): string {
		const num = parseFloat(price ?? '0');
		return new Intl.NumberFormat('es-ES', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2
		}).format(num);
	}

	function submitForm(formId: string): void {
		const form = document.getElementById(formId);
		if (form instanceof HTMLFormElement) form.requestSubmit();
	}

	/* ─── Product CRUD modals ─── */
	function openCreateModal() {
		if (!canCreate) return;
		isEditing = false;
		formName = '';
		formDescription = '';
		formBrandCode = '';
		formCategoryCode = '';
		formPrice = '';
		formSku = '';
		formIsActive = true;
		errorMessage = '';
		showModal = true;
	}

	function openEditModal(product: Product) {
		if (!canUpdate) return;
		isEditing = true;
		selectedProduct = product;
		formName = product.name;
		formDescription = product.description || '';
		formBrandCode = product.brand_code || '';
		formCategoryCode = product.category_code || '';
		formPrice = product.price ?? '';
		formSku = product.sku || '';
		formIsActive = product.is_active !== false;
		errorMessage = '';
		showModal = true;
	}

	function openDeleteModal(product: Product) {
		if (!canDelete) return;
		selectedProduct = product;
		showDeleteModal = true;
	}

	function closeModal() {
		showModal = false;
		errorMessage = '';
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		selectedProduct = null;
	}

	/* ─── Media management ─── */
	async function openMediaModal(product: Product) {
		selectedProduct = product;
		mediaLinks = [];
		mediaLoading = true;
		browseLoading = true;
		showMediaModal = true;

		browseFiles = [];
		browseParent = null;
		browseBreadcrumbs = [{ label: 'Drive', code: null }];

		await Promise.all([fetchMediaLinks(product.code), browseFolder(null)]);
	}

	async function fetchMediaLinks(productCode: string) {
		mediaLoading = true;
		try {
			const res = await fetch(
				`/api/drive/links?entity_type=product&entity_code=${productCode}&scope=product_shared`
			);
			if (res.ok) {
				const payload = await res.json();
				mediaLinks = payload.links ?? [];
			}
		} catch {
			// Non-critical
		} finally {
			mediaLoading = false;
		}
	}

	async function browseFolder(parentCode: string | null) {
		browseLoading = true;

		try {
			const params = new SvelteURLSearchParams({ scope: 'product_shared' });
			if (parentCode) params.set('parent', parentCode);
			const res = await fetch(`/api/drive?${params.toString()}`);
			if (res.ok) {
				const payload = await res.json();
				browseFiles = payload.files ?? [];
			}
		} catch {
			browseFiles = [];
		} finally {
			browseLoading = false;
		}
	}

	function navigateDriveFolder(folder: DriveFolderFile) {
		browseParent = folder.code;
		browseBreadcrumbs = [...browseBreadcrumbs, { label: folder.name, code: folder.code }];
		void browseFolder(folder.code);
	}

	function navigateDriveBreadcrumb(index: number) {
		const target = browseBreadcrumbs[index];
		browseParent = target?.code ?? null;
		browseBreadcrumbs = browseBreadcrumbs.slice(0, index + 1);
		void browseFolder(browseParent);
	}

	async function linkFile(file: DriveFolderFile, makePrimary = false) {
		if (!selectedProduct) return;

		const canBePrimary = file.type === 'img';
		const shouldBePrimary = canBePrimary && (makePrimary || mediaLinks.length === 0);

		try {
			const res = await fetch('/api/drive/links', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					file_code: file.code,
					entity_type: 'product',
					entity_code: selectedProduct.code,
					is_primary: shouldBePrimary
				})
			});

			if (res.ok) {
				showToast('Archivo vinculado al producto', 'success');
				await fetchMediaLinks(selectedProduct.code);
			} else {
				const payload = await res.json();
				showToast(payload.message || 'Error al vincular archivo', 'error');
			}
		} catch {
			showToast('Error al vincular archivo', 'error');
		}
	}

	async function unlinkFile(fileCode: string) {
		if (!selectedProduct) return;

		try {
			const res = await fetch('/api/drive/links', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					file_code: fileCode,
					entity_type: 'product',
					entity_code: selectedProduct.code
				})
			});

			if (res.ok) {
				showToast('Archivo desvinculado', 'success');
				await fetchMediaLinks(selectedProduct.code);
			} else {
				showToast('Error al desvincular', 'error');
			}
		} catch {
			showToast('Error al desvincular', 'error');
		}
	}

	async function setPrimaryImage(fileCode: string) {
		if (!selectedProduct) return;

		try {
			const res = await fetch('/api/drive/links', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					file_code: fileCode,
					entity_type: 'product',
					entity_code: selectedProduct.code,
					is_primary: true
				})
			});

			if (res.ok) {
				showToast('Imagen principal actualizada', 'success');
				await fetchMediaLinks(selectedProduct.code);
			}
		} catch {
			showToast('Error al actualizar imagen', 'error');
		}
	}

	function isImageLinked(fileCode: string): boolean {
		return mediaLinks.some((l) => l.file_code === fileCode);
	}

	function getDriveTypeLabel(type: DriveFileType): string {
		switch (type) {
			case 'dir':
				return 'Carpeta';
			case 'img':
				return 'Imagen';
			case 'vid':
				return 'Video';
			case 'aud':
				return 'Audio';
			case 'doc':
				return 'Documento';
			case 'zip':
				return 'Comprimido';
			default:
				return 'Archivo';
		}
	}

	function normalizeSize(value: string | number): number {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	function toDriveFileFromLink(link: DriveLink): DriveFileItem {
		return {
			code: link.file_code,
			scope: 'product_shared',
			name: link.file_name,
			type: link.file_type,
			size: normalizeSize(link.file_size),
			tag: null,
			mime_type: link.mime_type,
			storage_path: link.storage_path,
			parent_code: null,
			user_code: '',
			is_trashed: false,
			created_at: link.linked_at,
			updated_at: link.linked_at
		};
	}

	function openBrowsePreview(file: DriveFolderFile) {
		if (file.type === 'dir') {
			return;
		}
		previewFile = file;
		showDrivePreview = true;
	}

	function openLinkedPreview(link: DriveLink) {
		if (link.file_type === 'dir') {
			return;
		}

		previewFile = toDriveFileFromLink(link);
		showDrivePreview = true;
	}

	function handleDownload(file: DriveFileItem) {
		window.open(`/api/drive/${file.code}/serve?download=true`, '_blank', 'noopener,noreferrer');
	}
</script>

<div class="lumi-stack lumi-space--lg">
	<!-- Header -->
	<PageHeader title="Productos" subtitle="Gestiona el catálogo de productos" icon="package">
		{#snippet actions()}
			<Button
				type="filled"
				color="primary"
				icon="plus"
				onclick={openCreateModal}
				disabled={!canCreate}>Nuevo Producto</Button
			>
		{/snippet}
	</PageHeader>

	<!-- Products Table -->
	<Card>
		<Table data={data.products} search pagination hover itemsPerPage={10}>
			{#snippet thead()}
				<th class="product-table__th-thumb"></th>
				<th>Producto</th>
				<th>Marca</th>
				<th>Categoría</th>
				<th>Precio</th>
				<th>Estado</th>
				<th>Acciones</th>
			{/snippet}

			{#snippet row({ row })}
				{@const product = row as unknown as Product}
				<td class="product-table__td-thumb">
					{#if product.primary_image_url}
						<img
							src="/api/drive/{product.primary_image_url}/serve"
							alt={product.name}
							class="product-table__thumbnail"
						/>
					{:else}
						<div class="product-table__thumbnail-placeholder">
							<Icon icon="package" size="20px" color="var(--lumi-color-text-muted)" />
						</div>
					{/if}
				</td>
				<td>
					<div class="product-table__name-cell">
						<span class="lumi-font--medium">{product.name}</span>
						{#if product.sku}
							<span class="lumi-text--xs lumi-text--muted">{product.sku}</span>
						{/if}
					</div>
				</td>
				<td>
					{#if product.brand_name}
						<span class="lumi-text--sm">{product.brand_name}</span>
					{:else}
						<span class="lumi-text--sm lumi-text--muted">—</span>
					{/if}
				</td>
				<td>
					{#if product.category_name}
						<span class="lumi-text--sm">{product.category_name}</span>
					{:else}
						<span class="lumi-text--sm lumi-text--muted">—</span>
					{/if}
				</td>
				<td>
					<span class="lumi-font--medium">{formatPrice(product.price)}</span>
				</td>
				<td>
					<Chip color={product.is_active ? 'success' : 'danger'} size="sm">
						{product.is_active ? 'Activo' : 'Inactivo'}
					</Chip>
				</td>
				<td>
					<div class="lumi-flex lumi-flex--gap-xs">
						<Button
							type="flat"
							size="sm"
							icon="image"
							onclick={() => openMediaModal(product)}
							disabled={!canUpdate}
						/>
						<Button
							type="flat"
							size="sm"
							icon="edit"
							onclick={() => openEditModal(product)}
							disabled={!canUpdate}
						/>
						<Button
							type="flat"
							size="sm"
							icon="trash"
							color="danger"
							onclick={() => openDeleteModal(product)}
							disabled={!canDelete}
						/>
					</div>
				</td>
			{/snippet}
		</Table>
	</Card>
</div>

<!-- ─── Create / Edit Dialog ─── -->
<Dialog bind:open={showModal} title={isEditing ? 'Editar Producto' : 'Nuevo Producto'} size="lg">
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
			<Alert type="danger" closable onclose={() => (errorMessage = '')}>
				{errorMessage}
			</Alert>
		{/if}

		<div class="lumi-stack lumi-space--md">
			<!-- Row 1: Name -->
			<Input
				bind:value={formName}
				name="name"
				label="Nombre del producto"
				placeholder="Ej: Laptop Dell XPS 15"
				icon="package"
				required
			/>

			<!-- Row 2: Brand + Category -->
			<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md product-form__row">
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
			</div>

			<!-- Row 3: Price + SKU -->
			<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md product-form__row">
				<Input
					bind:value={formPrice}
					name="price"
					type="number"
					label="Precio"
					placeholder="0.00"
					icon="creditCard"
					required
				/>
				<Input bind:value={formSku} name="sku" label="SKU" placeholder="Ej: PC00012" icon="tag" />
			</div>

			<!-- Row 4: Description -->
			<Textarea
				bind:value={formDescription}
				name="description"
				label="Descripción"
				placeholder="Describe las características del producto..."
				rows={3}
			/>

			<!-- Row 5: Active toggle -->
			<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
				<Switch bind:checked={formIsActive} label="Producto activo" color="success" />
				<input type="hidden" name="is_active" value={formIsActive ? 'on' : ''} />
			</div>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeModal}>Cancelar</Button>
		<Button type="filled" color="primary" onclick={() => submitForm('product-form')}>
			{isEditing ? 'Actualizar' : 'Crear Producto'}
		</Button>
	{/snippet}
</Dialog>

<!-- ─── Delete Confirmation Dialog ─── -->
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
				¿Estás seguro de que deseas eliminar el producto <strong>{selectedProduct.name}</strong>? Se
				desvincularán las imágenes asociadas. Esta acción no se puede deshacer.
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

<!-- ─── Media Management Dialog ─── -->
<Dialog bind:open={showMediaModal} title="Media del producto" size="lg" scrollable>
	{#if selectedProduct}
		<div class="product-media">
			<section class="product-media__panel">
				<div class="product-media__panel-header">
					<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
						<Icon icon="link" size="18px" />
						<span class="lumi-font--medium">Vinculados</span>
						<Chip color="info" size="sm">{mediaLinks.length}</Chip>
					</div>
				</div>

				{#if mediaLoading}
					<div class="product-media__loading">
						<span class="lumi-text--sm lumi-text--muted">Cargando vínculos...</span>
					</div>
				{:else if mediaLinks.length === 0}
					<div class="product-media__empty">
						<Icon icon="link" size="28px" color="var(--lumi-color-text-muted)" />
						<span class="lumi-text--sm lumi-text--muted"
							>Sin archivos vinculados. Puedes vincular imágenes, audio, PDF o carpetas.</span
						>
					</div>
				{:else}
					<div class="product-media__linked-list">
						{#each mediaLinks as link (link.link_code)}
							<article class="product-media__linked-item">
								<button
									type="button"
									class="product-media__linked-preview"
									onclick={() => openLinkedPreview(link)}
								>
									{#if link.file_type === 'img'}
										<img src="/api/drive/{link.file_code}/serve" alt={link.file_name} />
									{:else}
										<Icon
											icon={getFileIcon(link.file_type)}
											size="24px"
											color={`var(--lumi-color-${getFileColor(link.file_type)})`}
										/>
									{/if}
								</button>
								<div class="product-media__linked-content">
									<div class="product-media__linked-name">{link.file_name}</div>
									<div class="product-media__linked-meta">
										<span>{getDriveTypeLabel(link.file_type)}</span>
										{#if link.file_type !== 'dir'}
											<span>•</span>
											<span>{formatFileSize(normalizeSize(link.file_size))}</span>
										{/if}
									</div>
								</div>
								<div class="product-media__linked-actions">
									<Button
										type="flat"
										size="sm"
										icon="eye"
										onclick={() => openLinkedPreview(link)}
									/>
									{#if link.file_type === 'img'}
										{#if link.is_primary}
											<Chip color="primary" size="sm">Principal</Chip>
										{:else}
											<Button
												type="flat"
												size="sm"
												icon="star"
												onclick={() => setPrimaryImage(link.file_code)}
											/>
										{/if}
									{/if}
									<Button
										type="flat"
										size="sm"
										icon="x"
										color="danger"
										onclick={() => unlinkFile(link.file_code)}
									/>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>

			<section class="product-media__panel">
				<div class="product-media__panel-header">
					<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
						<Icon icon="hardDrive" size="18px" />
						<span class="lumi-font--medium">Explorar Drive compartido</span>
					</div>
					<Button type="flat" size="sm" icon="refresh" onclick={() => browseFolder(browseParent)} />
				</div>

				<nav class="lumi-flex lumi-flex--gap-xs lumi-align-items--center lumi-flex--wrap">
					{#each browseBreadcrumbs as crumb, index (crumb.code ?? `root-${index}`)}
						{#if index > 0}
							<span class="lumi-text--muted">/</span>
						{/if}
						{#if index === browseBreadcrumbs.length - 1}
							<span class="lumi-text--sm lumi-font--medium">{crumb.label}</span>
						{:else}
							<Button type="flat" size="sm" onclick={() => navigateDriveBreadcrumb(index)}>
								{crumb.label}
							</Button>
						{/if}
					{/each}
				</nav>

				{#if browseLoading}
					<div class="product-media__loading">
						<span class="lumi-text--sm lumi-text--muted">Cargando archivos...</span>
					</div>
				{:else if browseFiles.length === 0}
					<div class="product-media__empty">
						<Icon icon="folder" size="28px" color="var(--lumi-color-text-muted)" />
						<span class="lumi-text--sm lumi-text--muted">Carpeta vacía</span>
					</div>
				{:else}
					<div class="product-media__browse-grid">
						{#each browseFiles as file (file.code)}
							<article
								class="product-media__browse-item"
								class:product-media__browse-item--linked={isImageLinked(file.code)}
							>
								<button
									type="button"
									class="product-media__browse-preview"
									onclick={() =>
										file.type === 'dir' ? navigateDriveFolder(file) : openBrowsePreview(file)}
								>
									{#if file.type === 'img'}
										<img
											src="/api/drive/{file.code}/serve"
											alt={file.name}
											class="product-media__browse-thumb"
										/>
									{:else}
										<Icon
											icon={getFileIcon(file.type)}
											size="24px"
											color={`var(--lumi-color-${getFileColor(file.type)})`}
										/>
									{/if}
								</button>
								<div class="product-media__browse-name" title={file.name}>{file.name}</div>
								<div class="product-media__browse-meta">
									<span>{getDriveTypeLabel(file.type)}</span>
								</div>
								<div class="product-media__browse-actions">
									{#if isImageLinked(file.code)}
										<Chip color="success" size="sm">Vinculado</Chip>
									{:else}
										<Button
											type="filled"
											size="sm"
											icon="link"
											color="primary"
											onclick={() => linkFile(file)}
										>
											Vincular
										</Button>
									{/if}
									{#if file.type === 'dir'}
										<Button
											type="flat"
											size="sm"
											icon="folder"
											onclick={() => navigateDriveFolder(file)}
										>
											Abrir
										</Button>
									{:else}
										<Button
											type="flat"
											size="sm"
											icon="eye"
											onclick={() => openBrowsePreview(file)}
										/>
									{/if}
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		</div>
	{/if}

	{#snippet footer()}
		<Button type="border" onclick={() => (showMediaModal = false)}>Cerrar</Button>
	{/snippet}
</Dialog>

<DriveFilePreview bind:open={showDrivePreview} file={previewFile} ondownload={handleDownload} />

<style>
	/* ─── Product Table ─── */
	.product-table__th-thumb {
		width: 56px;
	}

	.product-table__td-thumb {
		width: 56px;
		padding: var(--lumi-space-xs) !important;
	}

	.product-table__thumbnail {
		width: 44px;
		height: 44px;
		object-fit: cover;
		border-radius: var(--lumi-radius-md);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
	}

	.product-table__thumbnail-placeholder {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--lumi-radius-md);
		background: var(--lumi-color-surface-hover);
		border: var(--lumi-border-width-thin) dashed var(--lumi-color-border);
	}

	.product-table__name-cell {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	/* ─── Form ─── */
	.product-form__row {
		width: 100%;
	}

	@media (max-width: 640px) {
		.product-form__row {
			grid-template-columns: 1fr !important;
		}
	}

	/* ─── Media Modal ─── */
	.product-media {
		display: grid;
		grid-template-columns: minmax(300px, 1fr) minmax(360px, 1.3fr);
		gap: var(--lumi-space-md);
	}

	.product-media__panel {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-sm);
		border: 1px solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-xl);
		background:
			linear-gradient(
				140deg,
				color-mix(in srgb, var(--lumi-color-primary) 6%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-info) 4%, transparent) 68%,
				transparent 100%
			),
			var(--lumi-color-surface);
		backdrop-filter: blur(var(--lumi-blur-sm));
		min-height: 420px;
	}

	.product-media__panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-sm);
		flex-wrap: wrap;
	}

	.product-media__loading {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--lumi-space-xl);
	}

	.product-media__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-xl);
		border: var(--lumi-border-width-thin) dashed var(--lumi-color-border);
		border-radius: var(--lumi-radius-lg);
	}

	.product-media__linked-list {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
		max-height: 520px;
		overflow-y: auto;
		padding-right: var(--lumi-space-2xs);
	}

	.product-media__linked-item {
		display: grid;
		grid-template-columns: 72px minmax(0, 1fr) auto;
		gap: var(--lumi-space-sm);
		align-items: center;
		padding: var(--lumi-space-sm);
		border-radius: var(--lumi-radius-lg);
		border: 1px solid var(--lumi-color-border-light);
		background: var(--lumi-color-surface);
		transition: var(--lumi-transition-all);
	}

	.product-media__linked-item:hover {
		border-color: var(--lumi-color-primary);
		box-shadow: var(--lumi-shadow-sm);
	}

	.product-media__linked-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 72px;
		height: 72px;
		border-radius: var(--lumi-radius-md);
		border: 1px solid var(--lumi-color-border-light);
		background: var(--lumi-color-background-secondary);
		cursor: pointer;
		overflow: hidden;
	}

	.product-media__linked-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.product-media__linked-content {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
		min-width: 0;
	}

	.product-media__linked-name {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.product-media__linked-meta {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-2xs);
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
	}

	.product-media__linked-actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-2xs);
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.product-media__browse-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: var(--lumi-space-sm);
		max-height: 520px;
		overflow-y: auto;
		padding: var(--lumi-space-2xs);
	}

	.product-media__browse-item {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: var(--lumi-space-xs);
		padding: var(--lumi-space-sm);
		border-radius: var(--lumi-radius-lg);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		background: var(--lumi-color-surface);
		transition: var(--lumi-transition-all);
	}

	.product-media__browse-item:hover {
		border-color: var(--lumi-color-primary);
		background: var(--lumi-color-surface-hover);
		box-shadow: var(--lumi-shadow-sm);
	}

	.product-media__browse-item--linked {
		border-color: var(--lumi-color-success);
	}

	.product-media__browse-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 92px;
		border: 1px solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-md);
		background: var(--lumi-color-background-secondary);
		cursor: pointer;
		overflow: hidden;
	}

	.product-media__browse-thumb {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.product-media__browse-name {
		text-align: left;
		word-break: break-word;
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.product-media__browse-meta {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
	}

	.product-media__browse-actions {
		display: flex;
		gap: var(--lumi-space-2xs);
		flex-wrap: wrap;
	}

	@media (max-width: 1024px) {
		.product-media {
			grid-template-columns: 1fr;
		}

		.product-media__panel {
			min-height: 0;
		}

		.product-media__linked-list,
		.product-media__browse-grid {
			max-height: 360px;
		}
	}
</style>
