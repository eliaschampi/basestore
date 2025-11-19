<script lang="ts">
	import { enhance } from "$app/forms";
	import Card from "$lib/components/Card/Card.svelte";
	import Input from "$lib/components/Input/Input.svelte";
	import Button from "$lib/components/Button/Button.svelte";
	import Alert from "$lib/components/Alert/Alert.svelte";
	import { Icon } from "$lib/components";
	import type { ActionData } from "./$types";

	const { form }: { form: ActionData } = $props();

	let email = $state("");
	let password = $state("");
	let showPassword = $state(false);
	let isLoading = $state(false);

	const isFormValid = $derived(email.includes("@") && password.length >= 6);
</script>

<svelte:head>
	<title>Iniciar Sesión | Faztore</title>
</svelte:head>

<div class="lumi-centered-layout" style="background: linear-gradient(135deg, var(--lumi-color-primary-50) 0%, var(--lumi-color-background) 100%);">
	<div class="lumi-centered-card">
		<div class="lumi-flex lumi-flex--column lumi-align-items--center lumi-flex--gap-sm lumi-margin-bottom--lg">
			<Icon name="package" size={48} color="var(--lumi-color-primary)" />
			<h1 class="lumi-text--3xl lumi-font--bold lumi-margin--none">Faztore</h1>
		</div>

		<Card>
			<div class="lumi-padding--xl">
				<div class="lumi-text--center lumi-margin-bottom--lg">
					<h2 class="lumi-text--2xl lumi-font--bold lumi-margin--none lumi-margin-bottom--xs">Iniciar Sesión</h2>
					<p class="lumi-text--sm lumi-text--muted lumi-margin--none">Ingresa tus credenciales para continuar</p>
				</div>

				{#if form?.error}
					<div class="lumi-margin-bottom--lg">
						<Alert type="danger" title="Error" closable>
							{form.error}
						</Alert>
					</div>
				{/if}

				<form
					method="POST"
					action="?/login"
					use:enhance={() => {
						isLoading = true;
						return async ({ update }) => {
							await update();
							isLoading = false;
						};
					}}
					class="lumi-stack lumi-space--lg"
				>
					<Input
						bind:value={email}
						name="email"
						type="email"
						label="Correo electrónico"
						placeholder="tu@correo.com"
						icon="mail"
						required
					/>

					<div class="lumi-relative">
						<Input
							bind:value={password}
							name="password"
							type={showPassword ? "text" : "password"}
							label="Contraseña"
							placeholder="••••••••"
							icon="lock"
							required
						/>
						<button
							type="button"
							class="lumi-password-toggle"
							onclick={() => (showPassword = !showPassword)}
							aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
						>
							<Icon name={showPassword ? "eye-off" : "eye"} size={18} />
						</button>
					</div>

					<Button
						button="submit"
						type="filled"
						color="primary"
						size="lg"
						class="lumi-width--full"
						disabled={isLoading || !isFormValid}
						loading={isLoading}
					>
						{isLoading ? "Procesando..." : "Iniciar sesión"}
					</Button>
				</form>
			</div>
		</Card>

		<p class="lumi-margin-top--lg lumi-text--sm lumi-text--muted lumi-text--center">
			Faztore © {new Date().getFullYear()} - Sistema de gestión
		</p>
	</div>
</div>

<style>
	.lumi-password-toggle {
		position: absolute;
		top: 38px;
		right: var(--lumi-space-md);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--lumi-space-xs);
		border: none;
		background: transparent;
		color: var(--lumi-color-text-muted);
		cursor: pointer;
		transition: color var(--lumi-duration-base) var(--lumi-easing-default);
	}

	.lumi-password-toggle:hover {
		color: var(--lumi-color-primary);
	}
</style>
