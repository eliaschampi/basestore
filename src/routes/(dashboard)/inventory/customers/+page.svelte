<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { Alert, Button, Card, Dialog, Input, PageHeader, Table, Textarea } from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import type { PageData } from './$types';

	interface Customer {
		code: string;
		full_name: string;
		phone: string | null;
		note: string | null;
		created_at: Date | string;
		updated_at: Date | string;
	}

	const { data }: { data: PageData } = $props();

	const canRead = $derived(can('inventory:read'));
	const canCreate = $derived(can('inventory:create'));
	const canUpdate = $derived(can('inventory:update'));
	const canDelete = $derived(can('inventory:delete'));

	let showFormDialog = $state(false);
	let showDeleteDialog = $state(false);
	let isEditing = $state(false);
	let formErrorMessage = $state('');
	let selectedCustomer = $state<Customer | null>(null);
	let formName = $state('');
	let formPhone = $state('');
	let formNote = $state('');

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
		isEditing = false;
		formErrorMessage = '';
		formName = '';
		formPhone = '';
		formNote = '';
		selectedCustomer = null;
		showFormDialog = true;
	}

	function openEditDialog(customer: Customer): void {
		if (!canUpdate) return;
		isEditing = true;
		selectedCustomer = customer;
		formName = customer.full_name;
		formPhone = customer.phone || '';
		formNote = customer.note || '';
		formErrorMessage = '';
		showFormDialog = true;
	}

	function closeFormDialog(): void {
		showFormDialog = false;
		formErrorMessage = '';
		selectedCustomer = null;
	}

	function openDeleteDialog(customer: Customer): void {
		if (!canDelete) return;
		selectedCustomer = customer;
		showDeleteDialog = true;
	}

	function closeDeleteDialog(): void {
		showDeleteDialog = false;
		selectedCustomer = null;
	}

	function deleteSuccessMessage(linkedSalesCount: number): string {
		if (linkedSalesCount <= 0) {
			return 'Cliente eliminado exitosamente';
		}

		const noun = linkedSalesCount === 1 ? 'venta' : 'ventas';
		const verb = linkedSalesCount === 1 ? 'conservo' : 'conservaron';
		return `Cliente eliminado. ${linkedSalesCount} ${noun} ${verb} historial con nombre y telefono.`;
	}
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title="Clientes"
		subtitle="Gestion centralizada de clientes para ventas y seguimiento"
		icon="users"
	>
		{#snippet actions()}
			<Button
				type="filled"
				color="primary"
				icon="userPlus"
				onclick={openCreateDialog}
				disabled={!canCreate}
			></Button>
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
					<th>Creación</th>
					<th>Actualización</th>
					<th>Acciones</th>
				{/snippet}

				{#snippet row({ row })}
					{@const customer = row as unknown as Customer}
					<td>
						<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
							<span class="lumi-font--medium">{customer.full_name}</span>
						</div>
					</td>
					<td>
						<span class="lumi-text--sm lumi-text--muted">{customer.phone || 'Sin teléfono'}</span>
					</td>
					<td>
						{#if customer.note}
							<span class="lumi-text--sm lumi-text--muted">{customer.note}</span>
						{:else}
							<span class="lumi-text--sm lumi-text--muted inventory-customers__muted-italic">
								Sin nota
							</span>
						{/if}
					</td>
					<td>{formatDate(customer.created_at)}</td>
					<td>{formatDate(customer.updated_at)}</td>
					<td>
						<div class="lumi-flex lumi-flex--gap-xs">
							<Button
								type="flat"
								size="sm"
								icon="edit"
								disabled={!canUpdate}
								onclick={() => openEditDialog(customer)}
							/>
							<Button
								type="flat"
								size="sm"
								icon="trash"
								color="danger"
								disabled={!canDelete}
								onclick={() => openDeleteDialog(customer)}
							/>
						</div>
					</td>
				{/snippet}
			</Table>
		</Card>
	{/if}
</div>

<Dialog bind:open={showFormDialog} title={isEditing ? 'Editar cliente' : 'Nuevo cliente'} size="md">
	<form
		id="customer-form"
		method="POST"
		action="?/{isEditing ? 'update' : 'create'}"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast(
						isEditing ? 'Cliente actualizado exitosamente' : 'Cliente creado exitosamente',
						'success'
					);
					await invalidate('inventory:customers:load');
					closeFormDialog();
				} else if (result.type === 'failure') {
					const error = result.data?.error;
					formErrorMessage = (typeof error === 'string' ? error : null) || 'Ocurrio un error';
				}
			};
		}}
	>
		{#if isEditing && selectedCustomer}
			<input type="hidden" name="code" value={selectedCustomer.code} />
		{/if}

		{#if formErrorMessage}
			<Alert type="danger" closable onclose={() => (formErrorMessage = '')}>
				{formErrorMessage}
			</Alert>
		{/if}

		<div class="lumi-stack lumi-stack--md">
			<Input
				bind:value={formName}
				name="full_name"
				label="Nombre del cliente"
				placeholder="Ingresa el nombre"
				required
			/>

			<Input
				bind:value={formPhone}
				name="phone"
				label="Teléfono"
				placeholder="Ingresa el teléfono (opcional)"
			/>

			<Textarea
				bind:value={formNote}
				name="note"
				label="Nota"
				placeholder="Agrega una nota opcional"
				rows={3}
			/>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeFormDialog}>Cancelar</Button>
		<Button type="filled" color="primary" onclick={() => submitForm('customer-form')}>
			{isEditing ? 'Actualizar' : 'Guardar'}
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showDeleteDialog} title="Confirmar eliminacion" size="sm">
	<form
		id="delete-customer-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					const linkedSalesCountRaw = result.data?.linkedSalesCount;
					const linkedSalesCount =
						typeof linkedSalesCountRaw === 'number' ? linkedSalesCountRaw : 0;
					showToast(deleteSuccessMessage(linkedSalesCount), 'success');
					await invalidate('inventory:customers:load');
					closeDeleteDialog();
				} else if (result.type === 'failure') {
					const error = result.data?.error;
					showToast((typeof error === 'string' ? error : null) || 'No se pudo eliminar', 'error');
				}
			};
		}}
	>
		{#if selectedCustomer}
			<input type="hidden" name="code" value={selectedCustomer.code} />
			<div class="lumi-stack lumi-stack--sm">
				<p class="lumi-margin--none">
					Se eliminara el cliente <strong>{selectedCustomer.full_name}</strong>. Esta accion no se
					puede deshacer.
				</p>
				<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
					Si tiene ventas registradas, la referencia se limpiara automaticamente y cada venta
					conservara su nombre y telefono historico.
				</p>
			</div>
		{/if}
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteDialog}>Cancelar</Button>
		<Button type="filled" color="danger" onclick={() => submitForm('delete-customer-form')}>
			Eliminar
		</Button>
	{/snippet}
</Dialog>

<style>
	.inventory-customers__muted-italic {
		font-style: italic;
	}
</style>
