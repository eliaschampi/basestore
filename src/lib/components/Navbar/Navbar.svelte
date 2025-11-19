<script lang="ts">
	import type { Snippet } from "svelte";
	import Button from "../Button/Button.svelte";
	import type { NavbarProps } from "./types";

	interface Props extends NavbarProps {
		title?: Snippet;
		actions?: Snippet;
		user?: Snippet;
	}

	const {
		class: className = "",
		"ontoggle-sidebar": onToggleSidebar,
		"ontoggle-theme": onToggleTheme,
		title,
		actions,
		user
	}: Props = $props();
</script>

<nav class="lumi-navbar {className}" role="navigation">
	<!-- Left side - Menu toggle and title -->
	<div class="lumi-navbar__left">
		<Button
			type="flat"
			size="md"
			icon="menu"
			aria-label="Toggle sidebar"
			onclick={onToggleSidebar}
			class="lumi-navbar__menu-btn"
		/>

		<div class="lumi-navbar__title">
			{#if title}
				{@render title()}
			{:else}
				Dashboard
			{/if}
		</div>
	</div>

	<!-- Right side - Actions -->
	<div class="lumi-navbar__right">
		{#if actions}
			{@render actions()}
		{:else}
			<div class="lumi-navbar__actions">
				<Button
					type="flat"
					size="sm"
					icon="moon"
					aria-label="Toggle theme"
					onclick={onToggleTheme}
				/>

				{#if user}
					{@render user()}
				{/if}
			</div>
		{/if}
	</div>
</nav>

<style>
	.lumi-navbar {
		grid-area: navbar;
		position: sticky;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: var(--lumi-navbar-height);
		padding: 0 var(--lumi-space-md);
		background: var(--lumi-color-surface);
		border-radius: var(--lumi-radius-2xl);
		box-shadow: var(--lumi-shadow-md);
		border: 1px solid var(--lumi-color-border-light);
		z-index: var(--lumi-z-fixed);
		margin-top: var(--lumi-space-md);
		margin-inline: var(--lumi-space-md);
	}

	.lumi-navbar__left {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
	}

	.lumi-navbar__title {
		font-size: var(--lumi-font-size-lg);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
	}

	.lumi-navbar__right {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
	}

	.lumi-navbar__actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
	}


	@media (max-width: 768px) {
		.lumi-navbar {
			padding: 0 var(--lumi-space-md);
		}

		.lumi-navbar__title {
			display: none;
		}

		.lumi-navbar__left {
			gap: var(--lumi-space-sm);
		}
	}

	@media (max-width: 480px) {
		.lumi-navbar {
			padding: 0 var(--lumi-space-sm);
		}
	}
</style>
