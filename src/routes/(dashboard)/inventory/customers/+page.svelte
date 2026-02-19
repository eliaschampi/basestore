<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Dialog,
		Input,
		PageHeader,
		Switch,
		Table,
		Textarea
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import type { PageData } from './$types';

	interface Customer {
		code: string;
		full_name: string;
		phone: string | null;
		note: string | null;
		is_favorite: boolean;
		created_at: Date | string;
		updated_at: Date | string;
	}

	const { data }: { data: PageData } = $props();

	const canRead = $derived(can('inventory:read'));
	const canCreate = $derived(can('inventory:create'));
	const canUpdate = $derived(can('inventory:update'));

	let showCreateDialog = $state(false);
	let createErrorMessage = $state('');
	let createName = $state('');
	let createPhone = $state('');
	let createNote = $state('');
	let createFavorite = $state(true);

	let favoriteFormCode = $state('');
	let favoriteFormValue = $state(false);

	function formatDate(value: Date | string): string {
		return new Date(value).toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function submitForm(formId: string): void {
		const form = document.getElementById(formId);
		if (form instanceof HTMLFormElement) {
			form.requestSubmit();
		}
	}

	function openCreateDialog(): void {
		if (!canCreate) return;
		createErrorMessage = '';
		createName = '';
		createPhone = '';
		createNote = '';
		createFavorite = true;
		showCreateDialog = true;
	}

	function closeCreateDialog(): void {
		showCreateDialog = false;
		createErrorMessage = '';
	}

	function toggleFavorite(customer: Customer): void {
		if (!canUpdate) return;
		favoriteFormCode = customer.code;
		favoriteFormValue = !customer.is_favorite;
		submitForm('customer-favorite-form');
	}
</script>

<div class="lumi-stack lumi-space--lg">
	<PageHeader
		title="Clientes"
		subtitle="Gestión centralizada de clientes y favoritos para ventas"
		icon="users"
	>
		{#snippet actions()}
			<Button
				type="filled"
				color="primary"
				icon="userPlus"
				onclick={openCreateDialog}
				disabled={!canCreate}
			>
				Nuevo cliente
			</Button>
		{/snippet}
	</PageHeader>

	{#if !canRead}
		<Alert type="warning" closable>No tienes permisos para consultar clientes.</Alert>
	{:else}
		<Card>
			<Table data={data.customers} search pagination hover itemsPerPage={12}>
				{#snippet thead()}
					<th>Cliente</th>
					<th>Teléfono</th>
					<th>Nota</th>
					<th>Favorito</th>
					<th>Creación</th>
					<th>Actualización</th>
					<th>Acciones</th>
				{/snippet}

				{#snippet row({ row })}
					{@const customer = row as unknown as Customer}
					<td>
						<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
							<span class="lumi-font--medium">{customer.full_name}</span>
							{#if customer.is_favorite}
								<span class="lumi-text--xs lumi-text--muted">Cliente destacado</span>
							{/if}
						</div>
					</td>
					<td>
						<span class="lumi-text--sm lumi-text--muted">{customer.phone || 'Sin teléfono'}</span>
					</td>
					<td>
						{#if customer.note}
							<span class="lumi-text--sm lumi-text--muted">{customer.note}</span>
						{:else}
							<span class="lumi-text--sm lumi-text--muted inventory-customers__muted-italic"
								>Sin nota</span
							>
						{/if}
					</td>
					<td>
						<Chip size="sm" color={customer.is_favorite ? 'warning' : 'primary'}>
							{customer.is_favorite ? 'Favorito' : 'Regular'}
						</Chip>
					</td>
					<td>{formatDate(customer.created_at)}</td>
					<td>{formatDate(customer.updated_at)}</td>
					<td>
						<Button
							type="flat"
							size="sm"
							color={customer.is_favorite ? 'warning' : 'primary'}
							icon={customer.is_favorite ? 'starOff' : 'star'}
							disabled={!canUpdate}
							onclick={() => toggleFavorite(customer)}
						>
							{customer.is_favorite ? 'Quitar' : 'Destacar'}
						</Button>
					</td>
				{/snippet}
			</Table>
		</Card>
	{/if}
</div>

<form
	id="customer-favorite-form"
	method="POST"
	action="?/update"
	use:enhance={() => {
		return async ({ result }) => {
			if (result.type === 'success') {
				showToast(
					favoriteFormValue ? 'Cliente marcado como favorito' : 'Favorito removido',
					'success'
				);
				await invalidate('inventory:customers:load');
			} else if (result.type === 'failure') {
				const error = result.data?.error;
				showToast(
					(typeof error === 'string' ? error : null) || 'No se pudo actualizar favorito',
					'error'
				);
			}
		};
	}}
>
	<input type="hidden" name="code" value={favoriteFormCode} />
	<input type="hidden" name="is_favorite" value={favoriteFormValue ? 'true' : 'false'} />
</form>

<Dialog bind:open={showCreateDialog} title="Nuevo cliente" size="md">
	<form
		id="customer-create-form"
		method="POST"
		action="?/create"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Cliente creado exitosamente', 'success');
					await invalidate('inventory:customers:load');
					closeCreateDialog();
				} else if (result.type === 'failure') {
					const error = result.data?.error;
					createErrorMessage = (typeof error === 'string' ? error : null) || 'Ocurrió un error';
				}
			};
		}}
	>
		<input type="hidden" name="is_favorite" value={createFavorite ? 'true' : 'false'} />

		{#if createErrorMessage}
			<Alert type="danger" closable onclose={() => (createErrorMessage = '')}>
				{createErrorMessage}
			</Alert>
		{/if}

		<div class="lumi-stack lumi-space--md">
			<Input
				bind:value={createName}
				name="full_name"
				label="Nombre del cliente"
				placeholder="Ingresa el nombre"
				required
			/>

			<Input
				bind:value={createPhone}
				name="phone"
				label="Teléfono"
				placeholder="Ingresa el teléfono (opcional)"
			/>

			<Textarea
				bind:value={createNote}
				name="note"
				label="Nota"
				placeholder="Agrega una nota opcional"
				rows={3}
			/>

			<Switch
				checked={createFavorite}
				label="Marcar como cliente favorito"
				onchange={(value) => (createFavorite = value)}
			/>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeCreateDialog}>Cancelar</Button>
		<Button type="filled" color="primary" onclick={() => submitForm('customer-create-form')}>
			Guardar
		</Button>
	{/snippet}
</Dialog>

<style>
	.inventory-customers__muted-italic {
		font-style: italic;
	}
</style>
