<script lang="ts">
	import { invalidate } from '$app/navigation';
	import Dialog from '../Dialog/Dialog.svelte';
	import Button from '../Button/Button.svelte';
	import Select from '../Select/Select.svelte';
	import Alert from '../Alert/Alert.svelte';
	import { showToast } from '$lib/stores/Toast';
	import { PERMISSION_DEFINITIONS, getPermissionByKey } from '$lib/permissions/definitions';

	interface ApiPermission {
		code: string;
		user_code: string;
		entity: string;
		action: string;
	}

	interface User {
		code: string;
		name: string;
		last_name: string;
		email: string;
	}

	interface Props {
		user: User;
		open?: boolean;
		onclose?: () => void;
	}

	let { user, open = $bindable(false), onclose }: Props = $props();

	// State management
	let userPermissions = $state<string[]>([]); // Array of permission keys like 'users:read'
	let loading = $state(false);
	let error = $state('');
	let saving = $state(false);
	let selectedPermission = $state('');

	// Computed
	const availablePermissions = $derived(
		PERMISSION_DEFINITIONS.filter((p) => !userPermissions.includes(p.key))
	);

	const availablePermissionOptions = $derived(
		availablePermissions.map((p) => ({
			value: p.key,
			label: `${p.category} - ${p.label}`
		}))
	);

	// Load permissions from API
	async function loadPermissions() {
		if (!user.code) return;

		loading = true;
		error = '';

		try {
			const response = await fetch(`/api/users/${user.code}/permissions`);
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Error fetching permissions');
			}

			const { permissions: permissionsData } = (await response.json()) as {
				permissions: ApiPermission[];
			};

			// Convert to permission keys format (entity:action)
			userPermissions = permissionsData.map((p) => `${p.entity}:${p.action}`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Error loading permissions';
			console.error('Permission loading error:', err);
		} finally {
			loading = false;
		}
	}

	// Add permission
	function addPermission() {
		if (selectedPermission && !userPermissions.includes(selectedPermission)) {
			userPermissions = [...userPermissions, selectedPermission];
			selectedPermission = '';
		}
	}

	// Remove permission
	function removePermission(permissionKey: string) {
		userPermissions = userPermissions.filter((p) => p !== permissionKey);
	}

	// Save permissions
	async function savePermissions() {
		saving = true;
		error = '';

		try {
			// Convert permission keys to API format
			const permissionsToSave = userPermissions.map((key) => {
				const [entity, action] = key.split(':');
				return { entity, user_action: action };
			});

			const response = await fetch(`/api/users/${user.code}/permissions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ permissions: permissionsToSave })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Error guardando permisos');
			}

			const result = await response.json();
			showToast(`Permisos actualizados correctamente (${result.count} permisos)`, 'success');
			await invalidate('users:permissions');
			closeModal();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Error guardando permisos';
			console.error('Permission saving error:', err);
		} finally {
			saving = false;
		}
	}

	// Close modal
	function closeModal() {
		open = false;
		onclose?.();
	}

	// Load permissions when modal opens
	$effect(() => {
		if (open && user.code) {
			loadPermissions();
		}
	});
</script>

<Dialog bind:open title="Permisos de Usuario: {user.name} {user.last_name}" size="lg">
	{#if loading}
		<div class="lumi-flex lumi-flex--center lumi-padding--xl">
			<div class="lumi-loading-spinner"></div>
		</div>
	{:else if error}
		<div class="lumi-margin-bottom--md">
			<Alert type="danger" closable onclose={() => (error = '')}>
				{error}
			</Alert>
			<div class="lumi-flex lumi-flex--center lumi-margin-top--md">
				<Button type="filled" color="primary" size="sm" onclick={loadPermissions}>
					Reintentar
				</Button>
			</div>
		</div>
	{:else}
		<!-- Add Permission Section -->
		<div class="lumi-margin-bottom--lg lumi-padding--md lumi-bg--surface lumi-rounded--lg">
			<h4 class="lumi-font--semibold lumi-margin-bottom--md">Agregar Permiso</h4>
			<div class="lumi-flex lumi-flex--gap-sm">
				<div class="lumi-flex-item--grow">
					<Select
						bind:value={selectedPermission}
						options={availablePermissionOptions}
						placeholder="Seleccionar permiso..."
						clearable={false}
					/>
				</div>
				<Button
					type="filled"
					color="primary"
					icon="plus"
					onclick={addPermission}
					disabled={!selectedPermission}
				>
					Agregar
				</Button>
			</div>
		</div>

		<!-- Current Permissions -->
		<div class="lumi-margin-bottom--md">
			<h4 class="lumi-font--semibold lumi-margin-bottom--md">
				Permisos Actuales ({userPermissions.length})
			</h4>
			{#if userPermissions.length === 0}
				<div class="lumi-text--center lumi-padding--xl lumi-text--muted">
					No hay permisos asignados
				</div>
			{:else}
				<div class="lumi-stack lumi-space--sm lumi-max-h--md lumi-overflow--auto">
					{#each userPermissions as permissionKey (permissionKey)}
						{@const permission = getPermissionByKey(permissionKey)}
						{#if permission}
							<div
								class="lumi-flex lumi-flex--between lumi-align-items--center lumi-padding--md lumi-bg--background lumi-rounded--md lumi-border lumi-border--light"
							>
								<div class="lumi-flex-item--grow">
									<div class="lumi-font--medium">{permission.label}</div>
									<div class="lumi-text--sm lumi-text--muted">
										{permission.category} • {permission.description}
									</div>
								</div>
								<Button
									type="flat"
									color="danger"
									size="sm"
									icon="x"
									onclick={() => removePermission(permissionKey)}
								/>
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		<Button type="border" onclick={closeModal} disabled={saving}>Cancelar</Button>
		<Button
			type="filled"
			color="primary"
			onclick={savePermissions}
			disabled={loading || saving || !!error}
		>
			{#if saving}
				<div class="lumi-loading-spinner lumi-loading-spinner--sm"></div>
			{/if}
			Guardar Permisos
		</Button>
	{/snippet}
</Dialog>

<style>
	.lumi-loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--lumi-color-border);
		border-top: 3px solid var(--lumi-color-primary);
		border-radius: 50%;
		animation: lumi-spin 1s linear infinite;
	}

	.lumi-loading-spinner--sm {
		width: 16px;
		height: 16px;
		border-width: 2px;
	}

	.lumi-max-h--md {
		max-height: 400px;
	}

	.lumi-overflow--auto {
		overflow-y: auto;
	}

	.lumi-overflow--auto::-webkit-scrollbar {
		width: 6px;
	}

	.lumi-overflow--auto::-webkit-scrollbar-track {
		background: var(--lumi-color-background);
		border-radius: var(--lumi-radius-base);
	}

	.lumi-overflow--auto::-webkit-scrollbar-thumb {
		background: var(--lumi-color-border-strong);
		border-radius: var(--lumi-radius-base);
	}

	.lumi-overflow--auto::-webkit-scrollbar-thumb:hover {
		background: var(--lumi-color-text-muted);
	}

	@keyframes lumi-spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
