<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import Card from '$lib/components/Card/Card.svelte';
	import Title from '$lib/components/Title/Title.svelte';
	import Table from '$lib/components/Table/Table.svelte';
	import Button from '$lib/components/Button/Button.svelte';
	import Dialog from '$lib/components/Dialog/Dialog.svelte';
	import Input from '$lib/components/Input/Input.svelte';
	import Textarea from '$lib/components/Textarea/Textarea.svelte';
	import Alert from '$lib/components/Alert/Alert.svelte';
	import { showToast } from '$lib/stores/Toast';
	import { can } from '$lib/stores/permissions';
	import type { PageData } from './$types';

	interface Category {
		code: string;
		name: string;
		description: string | null;
		created_at: Date | string;
		updated_at: Date | string;
	}

	const { data }: { data: PageData } = $props();

	const canCreate = $derived(can('categories:create'));
	const canUpdate = $derived(can('categories:update'));
	const canDelete = $derived(can('categories:delete'));

	let showModal = $state(false);
	let showDeleteModal = $state(false);
	let isEditing = $state(false);
	let errorMessage = $state('');
	let selectedCategory = $state<Category | null>(null);

	let formName = $state('');
	let formDescription = $state('');

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function openCreateModal() {
		if (!canCreate) return;
		isEditing = false;
		formName = '';
		formDescription = '';
		errorMessage = '';
		showModal = true;
	}

	function openEditModal(category: Category) {
		if (!canUpdate) return;
		isEditing = true;
		selectedCategory = category;
		formName = category.name;
		formDescription = category.description || '';
		errorMessage = '';
		showModal = true;
	}

	function openDeleteModal(category: Category) {
		if (!canDelete) return;
		selectedCategory = category;
		showDeleteModal = true;
	}

	function closeModal() {
		showModal = false;
		errorMessage = '';
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		selectedCategory = null;
	}
</script>

<div class="lumi-stack lumi-space--lg">
	<div class="lumi-flex lumi-flex--between lumi-align-items--center lumi-flex--gap-md">
		<Title title="Categorías" subtitle="Gestiona las categorías del sistema" icon="tag" size="xl" />
		<Button
			type="filled"
			color="primary"
			icon="plus"
			onclick={openCreateModal}
			disabled={!canCreate}>Nueva Categoría</Button
		>
	</div>

	<Card>
		<Table data={data.categories} search pagination hover itemsPerPage={10}>
			{#snippet thead()}
				<th>Nombre</th>
				<th>Descripción</th>
				<th>Fecha creación</th>
				<th>Última actualización</th>
				<th>Acciones</th>
			{/snippet}

			{#snippet row({ row })}
				<td>
					<span class="lumi-font--medium">{row.name}</span>
				</td>
				<td>
					{#if row.description}
						<span class="lumi-text--sm lumi-text--muted">{row.description}</span>
					{:else}
						<span class="lumi-text--sm lumi-text--muted" style="font-style: italic;"
							>Sin descripción</span
						>
					{/if}
				</td>
				<td>{formatDate(row.created_at)}</td>
				<td>{formatDate(row.updated_at)}</td>
				<td>
					<div class="lumi-flex lumi-flex--gap-xs">
						<Button
							type="flat"
							size="sm"
							icon="edit"
							onclick={() => openEditModal(row)}
							disabled={!canUpdate}
						/>
						<Button
							type="flat"
							size="sm"
							icon="trash"
							color="danger"
							onclick={() => openDeleteModal(row)}
							disabled={!canDelete}
						/>
					</div>
				</td>
			{/snippet}
		</Table>
	</Card>
</div>

<!-- Create/Edit Modal -->
<Dialog bind:open={showModal} title={isEditing ? 'Editar Categoría' : 'Nueva Categoría'} size="md">
	<form
		method="POST"
		action="?/{isEditing ? 'update' : 'create'}"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast(
						isEditing ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente',
						'success'
					);
					await invalidate('categories:load');
					closeModal();
				} else if (result.type === 'failure') {
					errorMessage = result.data?.error || 'Ocurrió un error';
				}
			};
		}}
	>
		{#if isEditing && selectedCategory}
			<input type="hidden" name="code" value={selectedCategory.code} />
		{/if}

		{#if errorMessage}
			<Alert type="danger" closable onclose={() => (errorMessage = '')}>
				{errorMessage}
			</Alert>
		{/if}

		<div class="lumi-stack lumi-space--md">
			<Input
				bind:value={formName}
				name="name"
				label="Nombre de la categoría"
				placeholder="Ingrese el nombre"
				required
			/>

			<Textarea
				bind:value={formDescription}
				name="description"
				label="Descripción"
				placeholder="Ingrese una descripción (opcional)"
				rows={4}
			/>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeModal}>Cancelar</Button>
		<Button
			type="filled"
			color="primary"
			onclick={() => document.querySelector('form')?.requestSubmit()}
		>
			{isEditing ? 'Actualizar' : 'Crear'}
		</Button>
	{/snippet}
</Dialog>

<!-- Delete Confirmation Modal -->
<Dialog bind:open={showDeleteModal} title="Confirmar eliminación" size="sm">
	<form
		id="delete-category-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Categoría eliminada exitosamente', 'success');
					await invalidate('categories:load');
					closeDeleteModal();
				} else if (result.type === 'failure') {
					showToast(result.data?.error || 'Error al eliminar', 'error');
				}
			};
		}}
	>
		{#if selectedCategory}
			<input type="hidden" name="code" value={selectedCategory.code} />
			<p class="lumi-margin--none">
				¿Estás seguro de que deseas eliminar la categoría <strong>{selectedCategory.name}</strong>?
				Esta acción no se puede deshacer.
			</p>
		{/if}
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteModal}>Cancelar</Button>
		<Button
			type="filled"
			color="danger"
			onclick={() => document.getElementById('delete-category-form')?.requestSubmit()}
		>
			Eliminar
		</Button>
	{/snippet}
</Dialog>
