<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SidebarProps } from './types';

	interface Props extends SidebarProps {
		children?: Snippet;
		header?: Snippet;
	}

	const {
		collapsed = false,
		mobileOpen = false,
		class: className = '',
		children,
		header
	}: Props = $props();

	const sidebarClasses = $derived(() => {
		return [
			'lumi-sidebar',
			collapsed && 'lumi-sidebar--collapsed',
			mobileOpen && 'lumi-sidebar--mobile-open',
			className
		]
			.filter(Boolean)
			.join(' ');
	});
</script>

<aside class={sidebarClasses()} role="navigation" aria-label="Sidebar">
	{#if header}
		<header class="lumi-sidebar__header">
			{@render header()}
		</header>
	{/if}

	<nav class="lumi-sidebar__body">
		<div class="lumi-sidebar__items">
			{#if children}
				{@render children()}
			{/if}
		</div>
	</nav>
</aside>

<style>
	.lumi-sidebar {
		grid-area: sidebar;
		position: relative;
		display: flex;
		flex-direction: column;
		width: var(--lumi-sidebar-width);
		height: 100vh;
		background: var(--lumi-color-surface);
		border-right: 1px solid var(--lumi-color-border-light);
		box-shadow: var(--lumi-shadow-md);
		transition: all var(--lumi-duration-base) var(--lumi-easing-default);
		overflow: hidden;
		z-index: var(--lumi-z-sidebar);
	}

	.lumi-sidebar--collapsed {
		width: var(--lumi-sidebar-width-collapsed);
	}

	.lumi-sidebar__header {
		padding: var(--lumi-space-lg);
		border-bottom: 1px solid var(--lumi-color-border-light);
		flex-shrink: 0;
		min-height: var(--lumi-navbar-height);
		display: flex;
		align-items: center;
	}

	.lumi-sidebar__body {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: var(--lumi-space-md);
	}

	/* Custom scrollbar */
	.lumi-sidebar__body::-webkit-scrollbar {
		width: 4px;
	}

	.lumi-sidebar__body::-webkit-scrollbar-track {
		background: transparent;
	}

	.lumi-sidebar__body::-webkit-scrollbar-thumb {
		background: transparent;
		border-radius: var(--lumi-radius-full);
	}

	.lumi-sidebar:hover .lumi-sidebar__body::-webkit-scrollbar-thumb {
		background: var(--lumi-color-border);
	}

	.lumi-sidebar__items {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
	}

	/* Mobile responsive behavior */
	@media (max-width: 1024px) {
		.lumi-sidebar {
			position: fixed;
			top: 0;
			left: 0;
			transform: translateX(-100%);
			width: var(--lumi-sidebar-width-mobile);
			box-shadow: var(--lumi-shadow-xl);
			border-right: none;
		}

		.lumi-sidebar--mobile-open {
			transform: translateX(0);
		}

		.lumi-sidebar--collapsed {
			width: var(--lumi-sidebar-width-mobile); /* No collapsed state on mobile */
		}
	}
</style>
