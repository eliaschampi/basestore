<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '../Button/Button.svelte';
	import type { NavbarProps } from './types';

	interface Props extends NavbarProps {
		title?: Snippet;
		actions?: Snippet;
		user?: Snippet;
	}

	const {
		class: className = '',
		'ontoggle-sidebar': onToggleSidebar,
		'ontoggle-theme': onToggleTheme,
		title,
		actions,
		user
	}: Props = $props();
</script>

<nav class="lumi-navbar {className}">
	<!-- Left side - Menu toggle and title -->
	<div class="lumi-navbar__left">
		<div class="lumi-navbar__menu-btn">
			<Button
				type="flat"
				size="md"
				icon="menu"
				aria-label="Toggle sidebar"
				onclick={onToggleSidebar}
			/>
		</div>

		<div class="lumi-navbar__title">
			{#if title}
				{@render title()}
			{:else}
				<span class="lumi-text--lg lumi-font--bold">Dashboard</span>
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
		top: var(--lumi-space-md);
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: var(--lumi-navbar-height);
		padding: 0 var(--lumi-space-lg);
		background: var(--lumi-color-surface-overlay);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: var(--lumi-radius-xl);
		box-shadow: var(--lumi-shadow-sm);
		border: 1px solid var(--lumi-color-border-light);
		z-index: var(--lumi-z-fixed);
		margin: var(--lumi-space-md);
		margin-bottom: 0;
		transition: all 0.3s ease;
	}

	.lumi-navbar:hover {
		box-shadow: var(--lumi-shadow-md);
		border-color: var(--lumi-color-border);
	}

	.lumi-navbar__left {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
	}

	.lumi-navbar__title {
		color: var(--lumi-color-text);
		white-space: nowrap;
	}

	.lumi-navbar__right {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
	}

	.lumi-navbar__actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
	}

	/* Responsive adjustments */
	@media (max-width: 1024px) {
		.lumi-navbar {
			margin: 0;
			border-radius: 0;
			border-left: none;
			border-right: none;
			border-top: none;
			top: 0;
			width: 100%;
		}
	}

	@media (max-width: 768px) {
		.lumi-navbar {
			padding: 0 var(--lumi-space-md);
		}

		.lumi-navbar__title {
			display: none;
		}
	}
</style>
