<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Card from '$lib/components/Card/Card.svelte';
	import Title from '$lib/components/Title/Title.svelte';
	import Button from '$lib/components/Button/Button.svelte';
	import Avatar from '$lib/components/Avatar/Avatar.svelte';
	import Chip from '$lib/components/Chip/Chip.svelte';
	import Dialog from '$lib/components/Dialog/Dialog.svelte';
	import Input from '$lib/components/Input/Input.svelte';
	import Alert from '$lib/components/Alert/Alert.svelte';
	import Dropdown from '$lib/components/Dropdown/Dropdown.svelte';
	import DropdownItem from '$lib/components/Dropdown/DropdownItem.svelte';
	import Icon from '$lib/components/Icon/Icon.svelte';
	import PermissionsModal from '$lib/components/PermissionsModal';
	import { showToast } from '$lib/stores/Toast';
	import { can } from '$lib/stores/permissions';
	import { getInitials, formatDate } from '$lib/utils';
	import type { PageData } from './$types';
	import type { Users } from '$lib/database/types';

	const { data }: { data: PageData } = $props();

	// Permissions
	const canCreate = $derived(can('users:create'));
	const canUpdate = $derived(can('users:update'));
	const canDelete = $derived(can('users:delete'));
	const canManagePermissions = $derived(can('users:manage_permissions'));

	// State
	let showModal = $state(false);
	let showDeleteModal = $state(false);
	let showPasswordModal = $state(false);
	let showPermissionsModal = $state(false);
	let isEditing = $state(false);
	let errorMessage = $state('');
	let passwordMessage = $state('');
	let selectedUser = $state<Users | null>(null);
	let selectedAvatar = $state('avatar.svg');

	// Form fields
	let formName = $state('');
	let formLastName = $state('');
	let formEmail = $state('');
	let formPassword = $state('');

	// Available avatars
	const avatars = [
		{ src: 'avatar.svg', label: 'Default' },
		{ src: 'woman1.svg', label: 'Woman 1' },
		{ src: 'woman2.svg', label: 'Woman 2' },
		{ src: 'man1.svg', label: 'Man 1' },
		{ src: 'man2.svg', label: 'Man 2' }
	];

	const mySelf = (userId: string) => {
		return userId === page.data.user?.code;
	};

	function openCreateModal() {
		if (!canCreate) return;
		isEditing = false;
		formName = '';
		formLastName = '';
		formEmail = '';
		formPassword = '';
		selectedAvatar = 'avatar.svg';
		errorMessage = '';
		showModal = true;
	}

	function openEditModal(user: Users) {
		if (!canUpdate) return;
		isEditing = true;
		selectedUser = user;
		formName = user.name || '';
		formLastName = user.last_name || '';
		formEmail = user.email;
		formPassword = '';
		selectedAvatar = user.photo_url || 'avatar.svg';
		errorMessage = '';
		showModal = true;
	}

	function openDeleteModal(user: Users) {
		if (!canDelete) return;
		selectedUser = user;
		showDeleteModal = true;
	}

	function openPasswordModal(user: Users) {
		selectedUser = user;
		passwordMessage = '';
		showPasswordModal = true;
	}

	function openPermissionsModal(user: Users) {
		if (!canManagePermissions) return;
		selectedUser = user;
		showPermissionsModal = true;
	}

	function closeModal() {
		showModal = false;
		errorMessage = '';
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		selectedUser = null;
	}

	function closePasswordModal() {
		showPasswordModal = false;
		selectedUser = null;
		passwordMessage = '';
	}
</script>

<div class="lumi-stack lumi-space--lg">
	<div class="lumi-flex lumi-flex--between lumi-align-items--center lumi-flex--gap-md">
		<Title title="Usuarios" subtitle="Gestiona los usuarios del sistema" icon="users" size="xl" />
		<Button
			type="filled"
			color="primary"
			icon="plus"
			onclick={openCreateModal}
			disabled={!canCreate}
		>
			Nuevo Usuario
		</Button>
	</div>

	<div class="lumi-grid lumi-grid--columns-3 lumi-grid--gap-lg">
		{#each data.users as user (user.code)}
			<Card>
				<div
					class="lumi-position--relative lumi-flex lumi-flex--column lumi-align-items--center lumi-flex--gap-md lumi-padding--xl"
					style="min-height: 280px;"
				>
					<!-- Dropdown Menu -->
					<div
						class="lumi-position--absolute"
						style="top: var(--lumi-space-md); right: var(--lumi-space-md); z-index: 10;"
					>
						<Dropdown position="bottom-end">
							{#snippet children()}
								<Button type="flat" size="sm" icon="moreVertical" />
							{/snippet}

							{#snippet content()}
								{#if canManagePermissions}
									<DropdownItem icon="shield" onclick={() => openPermissionsModal(user)}>
										Gestionar Permisos
									</DropdownItem>
								{/if}
								{#if mySelf(user.code) || canUpdate}
									<DropdownItem icon="edit" onclick={() => openEditModal(user)}>
										Editar Información
									</DropdownItem>
									<DropdownItem icon="key" onclick={() => openPasswordModal(user)}>
										Cambiar Contraseña
									</DropdownItem>
								{/if}
								{#if canDelete && !mySelf(user.code)}
									<DropdownItem icon="trash" color="danger" onclick={() => openDeleteModal(user)}>
										Eliminar
									</DropdownItem>
								{/if}
							{/snippet}
						</Dropdown>
					</div>

					<!-- Avatar and Name -->
					<div
						class="lumi-flex lumi-flex--column lumi-align-items--center lumi-flex--gap-sm lumi-text--center"
						style="width: 100%; margin-top: var(--lumi-space-sm);"
					>
						<Avatar
							text={getInitials(user.name || '', user.last_name || '')}
							src={user.photo_url}
							size="lg"
							color="primary"
						/>
						<h3
							class="lumi-margin--none lumi-text--lg lumi-font--bold"
							style="line-height: var(--lumi-line-height-tight);"
						>
							{user.name || 'Sin nombre'}
							{user.last_name || ''}
						</h3>
						<p
							class="lumi-margin--none lumi-text--sm lumi-text--muted lumi-text-ellipsis"
							style="max-width: 100%;"
						>
							{user.email}
						</p>
					</div>

					<!-- Stats -->
					<div
						class="lumi-flex lumi-flex--column lumi-flex--gap-xs"
						style="width: 100%; padding-top: var(--lumi-space-md); margin-top: auto; border-top: 1px solid var(--lumi-color-border-light);"
					>
						<div
							class="lumi-flex lumi-align-items--center lumi-flex--gap-xs lumi-text--xs lumi-text--muted"
						>
							<Icon icon="calendar" size="16px" />
							<span>Creado {formatDate(user.created_at)}</span>
						</div>
						<div
							class="lumi-flex lumi-align-items--center lumi-flex--gap-xs lumi-text--xs lumi-text--muted"
						>
							<Icon icon="clock" size="16px" />
							<span>Login {user.last_login ? formatDate(user.last_login) : 'Nunca'}</span>
						</div>
					</div>

					<!-- Role Badge -->
					{#if user.is_super_admin}
						<Chip color="danger" size="sm">Super Admin</Chip>
					{:else}
						<Chip color="primary" size="sm">Usuario</Chip>
					{/if}
				</div>
			</Card>
		{/each}
	</div>
</div>

<!-- Create/Edit Modal -->
<Dialog bind:open={showModal} title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'} size="md">
	<form
		id="user-form"
		method="POST"
		action="?/{isEditing ? 'update' : 'create'}"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast(
						isEditing ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente',
						'success'
					);
					await invalidate('users:load');
					closeModal();
				} else if (result.type === 'failure') {
					errorMessage = result.data?.error || 'Ocurrió un error';
				}
			};
		}}
	>
		{#if isEditing && selectedUser}
			<input type="hidden" name="user_id" value={selectedUser.code} />
		{/if}

		<input type="hidden" name="photo_url" value={selectedAvatar} />

		{#if errorMessage}
			<Alert type="danger" closable onclose={() => (errorMessage = '')}>
				{errorMessage}
			</Alert>
		{/if}

		<div class="lumi-stack lumi-space--md">
			<Input
				bind:value={formName}
				name="name"
				label="Nombre"
				placeholder="Ingrese el nombre"
				required
			/>

			<Input
				bind:value={formLastName}
				name="last_name"
				label="Apellidos"
				placeholder="Ingrese los apellidos"
				required
			/>

			<Input
				bind:value={formEmail}
				name="email"
				type="email"
				label="Correo electrónico"
				placeholder="correo@ejemplo.com"
				required
			/>

			{#if !isEditing}
				<Input
					bind:value={formPassword}
					name="password"
					type="password"
					label="Contraseña"
					placeholder="Mínimo 8 caracteres"
					required
				/>
			{/if}

			<!-- Avatar Selection -->
			<div>
				<label class="lumi-text--sm lumi-font--medium lumi-block lumi-margin-bottom--sm">
					Avatar
				</label>
				<div class="lumi-flex lumi-flex--wrap lumi-flex--gap-sm lumi-justify--center">
					{#each avatars as avatar (avatar.src)}
						<label class="lumi-pointer">
							<input
								type="radio"
								name="avatar"
								value={avatar.src}
								checked={selectedAvatar === avatar.src}
								onchange={() => (selectedAvatar = avatar.src)}
								style="display: none;"
							/>
							<div
								class="lumi-rounded--full lumi-overflow-hidden"
								style="width: 64px; height: 64px; border: {selectedAvatar === avatar.src
									? '3px'
									: '2px'} solid {selectedAvatar === avatar.src
									? 'var(--lumi-color-primary)'
									: 'var(--lumi-color-border)'}; transition: var(--lumi-transition-all); transform: {selectedAvatar ===
								avatar.src
									? 'scale(1.1)'
									: 'scale(1)'};"
							>
								<img
									src={avatar.src}
									alt={avatar.label}
									style="width: 100%; height: 100%; object-fit: cover;"
								/>
							</div>
						</label>
					{/each}
				</div>
			</div>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeModal}>Cancelar</Button>
		<Button
			type="filled"
			color="primary"
			onclick={() => document.getElementById('user-form')?.requestSubmit()}
		>
			{isEditing ? 'Actualizar' : 'Crear'}
		</Button>
	{/snippet}
</Dialog>

<!-- Delete Confirmation Modal -->
<Dialog bind:open={showDeleteModal} title="Confirmar eliminación" size="sm">
	<form
		id="delete-user-form"
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Usuario eliminado exitosamente', 'success');
					await invalidate('users:load');
					closeDeleteModal();
				} else if (result.type === 'failure') {
					showToast(result.data?.error || 'Error al eliminar', 'error');
				}
			};
		}}
	>
		{#if selectedUser}
			<input type="hidden" name="user_id" value={selectedUser.code} />
			<p class="lumi-margin--none">
				¿Estás seguro de que deseas eliminar a <strong
					>{selectedUser.name}
					{selectedUser.last_name}</strong
				>? Esta acción no se puede deshacer.
			</p>
		{/if}
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closeDeleteModal}>Cancelar</Button>
		<Button
			type="filled"
			color="danger"
			onclick={() => document.getElementById('delete-user-form')?.requestSubmit()}
		>
			Eliminar
		</Button>
	{/snippet}
</Dialog>

<!-- Change Password Modal -->
<Dialog bind:open={showPasswordModal} title="Cambiar contraseña" size="sm">
	<form
		id="password-form"
		method="POST"
		action="?/updatePassword"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					showToast('Contraseña actualizada exitosamente', 'success');
					closePasswordModal();
				} else if (result.type === 'failure') {
					passwordMessage = result.data?.error || 'Error al actualizar la contraseña';
				}
			};
		}}
	>
		{#if selectedUser}
			<input type="hidden" name="user_id" value={selectedUser.code} />
			<p class="lumi-text--sm lumi-text--muted lumi-margin-bottom--md">
				Establece una nueva contraseña para {selectedUser.name}
				{selectedUser.last_name}
			</p>
		{/if}

		{#if passwordMessage}
			<Alert type="danger" closable onclose={() => (passwordMessage = '')}>
				{passwordMessage}
			</Alert>
		{/if}

		<div class="lumi-stack lumi-space--md">
			<Input
				name="password"
				type="password"
				label="Nueva contraseña"
				placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
				required
			/>

			<Input
				name="confirm_password"
				type="password"
				label="Confirmar contraseña"
				placeholder="Confirmar contraseña"
				required
			/>
		</div>
	</form>

	{#snippet footer()}
		<Button type="border" onclick={closePasswordModal}>Cancelar</Button>
		<Button
			type="filled"
			color="primary"
			onclick={() => document.getElementById('password-form')?.requestSubmit()}
		>
			Actualizar Contraseña
		</Button>
	{/snippet}
</Dialog>

<!-- Permissions Modal -->
{#if selectedUser}
	<PermissionsModal
		user={selectedUser}
		bind:open={showPermissionsModal}
		onclose={() => (showPermissionsModal = false)}
	/>
{/if}
