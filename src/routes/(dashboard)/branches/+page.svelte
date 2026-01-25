<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import Card from '$lib/components/Card/Card.svelte';
	import Title from '$lib/components/Title/Title.svelte';
	import Table from '$lib/components/Table/Table.svelte';
	import Button from '$lib/components/Button/Button.svelte';
	import Chip from '$lib/components/Chip/Chip.svelte';
	import StatusIndicator from '$lib/components/StatusIndicator/StatusIndicator.svelte';
	import Dialog from '$lib/components/Dialog/Dialog.svelte';
	import Input from '$lib/components/Input/Input.svelte';
	import Switch from '$lib/components/Switch/Switch.svelte';
	import Select from '$lib/components/Select/Select.svelte';
	import Alert from '$lib/components/Alert/Alert.svelte';
	import { showToast } from '$lib/stores/Toast';
	import { can } from '$lib/stores/permissions';
	import type { PageData } from './$types';

	interface Branch {
		code: string;
		name: string;
		state: boolean;
		users: string[];
		created_at: Date | string;
	}

	const { data }: { data: PageData } = $props();

	const canCreate = $derived(can('branches:create'));
	const canUpdate = $derived(can('branches:update'));
	const canDelete = $derived(can('branches:delete'));

	let showModal = $state(false);
	let showDeleteModal = $state(false);
	let isEditing = $state(false);
	let errorMessage = $state('');
	let selectedBranch = $state<Branch | null>(null);

	let formName = $state('');
	let formState = $state(true);
	let selectedUsers = $state<string[]>([]);
	let selectedUserCode = $state('');

	const userOptions = $derived(
		data.users.map((u) => ({
			value: u.code,
			label: `${u.name ?? ''} ${u.last_name ?? ''} (${u.email})`
		}))
	);

	const availableUserOptions = $derived(
		userOptions.filter((opt) => !selectedUsers.includes(opt.value))
	);

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
		formState = true;
		selectedUsers = [];
		selectedUserCode = '';
		errorMessage = '';
		showModal = true;
	}

	function openEditModal(branch: Branch) {
		if (!canUpdate) return;
		isEditing = true;
		selectedBranch = branch;
		formName = branch.name;
		formState = branch.state;
		selectedUsers = [...(branch.users || [])];
		selectedUserCode = '';
		errorMessage = '';
		showModal = true;
	}

	function openDeleteModal(branch: Branch) {
		if (!canDelete) return;
		selectedBranch = branch;
		showDeleteModal = true;
	}

	function addUser() {
		if (selectedUserCode && !selectedUsers.includes(selectedUserCode)) {
			selectedUsers = [...selectedUsers, selectedUserCode];
			selectedUserCode = '';
		}
	}

	function removeUser(userCode: string) {
		selectedUsers = selectedUsers.filter((code) => code !== userCode);
	}

	function getUserName(userCode: string): string {
		const user = data.users.find((u) => u.code === userCode);
		return user ? `${user.name ?? ''} ${user.last_name ?? ''}` : 'Usuario no disponible';
	}

	function closeModal() {
		showModal = false;
		errorMessage = '';
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		selectedBranch = null;
	}
</script>

<div class="lumi-stack lumi-space--lg">
	<div class="lumi-flex lumi-flex--between lumi-align-items--center lumi-flex--gap-md">
		<Title title="Sedes" subtitle="Gestiona las sedes del sistema" icon="building" size="xl" />
		<Button
			type="filled"
			color="primary"
			icon="plus"
			onclick={openCreateModal}
			disabled={!canCreate}>Nueva Sede</Button
		>
	</div>

	<Card>
		<Table data={data.branches} search pagination hover itemsPerPage={10}>
			{#snippet thead()}
				<th>Nombre</th>
				<th>Estado</th>
				<th>Usuarios asignados</th>
				<th>Fecha creación</th>
				<th>Acciones</th>
			{/snippet}

			{#snippet row({ row })}
				<td>
					<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
						<StatusIndicator active={row.state as boolean} />
						<span class="lumi-font--medium">{row.name as string}</span>
					</div>
				</td>
				<td>
					{#if row.state}
						<Chip color="success" size="sm">Activa</Chip>
					{:else}
						<Chip color="danger" size="sm">Inactiva</Chip>
					{/if}
				</td>
				<td>
					<Chip color="info" size="sm">{(row.users as string[])?.length || 0} usuarios</Chip>
				</td>
				<td>{formatDate(row.created_at as string | Date)}</td>
				<td>
					<div class="lumi-flex lumi-flex--gap-xs">
						<Button
							type="flat"
							size="sm"
							icon="edit"
							onclick={() => openEditModal(row as unknown as Branch)}
							disabled={!canUpdate}
						/>
						<Button
							type="flat"
							size="sm"
							icon="trash"
							color="danger"
							onclick={() => openDeleteModal(row as unknown as Branch)}
							disabled={!canDelete}
						/>
					</div>
				</td>
			{/snippet}
		</Table>
	</Card>
</div>

<!-- Create/Edit Modal -->
<Dialog bind:open={showModal} title={isEditing ? 'Editar Sede' : 'Nueva Sede'} size="md">
	<form
		method="POST"
		action="?/{isEditing ? 'update' : 'create'}"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast(
						isEditing ? 'Sede actualizada exitosamente' : 'Sede creada exitosamente',
						'success'
					);
					await invalidate('branches:load');
					closeModal();
				} else if (result.type === 'failure') {
					const error = result.data?.error;
					errorMessage = (typeof error === 'string' ? error : null) || 'Ocurrió un error';
				}
			};
		}}
	>
		{#if isEditing && selectedBranch}
			<input type="hidden" name="code" value={selectedBranch.code} />
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
				label="Nombre de la sede"
				placeholder="Ingrese el nombre"
				required
			/>

			<Switch bind:checked={formState} name="state" label="Sede activa" />

			<div class="lumi-stack lumi-space--sm">
				<div class="lumi-text--sm lumi-font--medium lumi-block"> Usuarios asignados </div>

				<div class="lumi-flex lumi-flex--gap-sm">
					<div class="lumi-flex-item--grow">
						<Select
							bind:value={selectedUserCode}
							options={availableUserOptions}
							placeholder="Seleccione un usuario"
							clearable
						/>
					</div>
					<Button type="border" icon="plus" onclick={addUser} disabled={!selectedUserCode}>
						Agregar
					</Button>
				</div>

				{#if selectedUsers.length > 0}
					<div class="lumi-stack lumi-space--xs">
						{#each selectedUsers as userCode (userCode)}
							<input type="hidden" name="selectedUsers" value={userCode} />
							<div
								class="lumi-flex lumi-flex--between lumi-align-items--center lumi-padding--sm lumi-bg--surface lumi-rounded--md"
							>
								<span class="lumi-text--sm">
									{getUserName(userCode)}
								</span>
								<Button
									type="flat"
									size="sm"
									icon="x"
									color="danger"
									onclick={() => removeUser(userCode)}
								/>
							</div>
						{/each}
					</div>
				{:else}
					<p class="lumi-text--sm lumi-text--muted">No hay usuarios asignados</p>
				{/if}
			</div>
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
		id="delete-branch-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Sede eliminada exitosamente', 'success');
					await invalidate('branches:load');
					closeDeleteModal();
				} else if (result.type === 'failure') {
					const error = result.data?.error;
					showToast((typeof error === 'string' ? error : null) || 'Error al eliminar', 'error');
				}
			};
		}}
	>
		{#if selectedBranch}
			<input type="hidden" name="code" value={selectedBranch.code} />
			<p class="lumi-margin--none">
				¿Estás seguro de que deseas eliminar la sede <strong>{selectedBranch.name}</strong>? Esta
				acción no se puede deshacer.
			</p>
		{/if}
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteModal}>Cancelar</Button>
		<Button
			type="filled"
			color="danger"
			onclick={() => {
				const form = document.getElementById('delete-branch-form');
				if (form instanceof HTMLFormElement) form.requestSubmit();
			}}
		>
			Eliminar
		</Button>
	{/snippet}
</Dialog>
