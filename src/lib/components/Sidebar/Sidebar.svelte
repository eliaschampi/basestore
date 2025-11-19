<script lang="ts">
	import type { Snippet } from "svelte";
	import type { SidebarProps } from "./types";

	interface Props extends SidebarProps {
		children?: Snippet;
		header?: Snippet;
	}

	const {
		collapsed = false,
		mobileOpen = false,
		class: className = "",
		children,
		header
	}: Props = $props();

	const sidebarClasses = $derived(() => {
		return [
			"lumi-sidebar",
			collapsed && "lumi-sidebar--collapsed",
			mobileOpen && "lumi-sidebar--mobile-open",
			className
		]
			.filter(Boolean)
			.join(" ");
	});
</script>

<aside class={sidebarClasses()} role="navigation" aria-label="Sidebar">
	<!-- Header with cover image -->
	{#if header}
		<header class="lumi-sidebar__header">
			{@render header()}
		</header>
	{/if}

	<!-- Navigation items -->
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
		box-shadow: var(--lumi-shadow-md);
		transition:
			width var(--lumi-duration-base) var(--lumi-easing-default),
			transform var(--lumi-duration-base) var(--lumi-easing-default);
		overflow: hidden;
		z-index: var(--lumi-z-sidebar);
	}

	.lumi-sidebar--collapsed {
		width: var(--lumi-sidebar-width-collapsed);
	}

	.lumi-sidebar__header {
		padding: var(--lumi-space-lg);
		border-bottom: 1px solid var(--lumi-color-border);
		flex-shrink: 0;
	}

	.lumi-sidebar__body {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: var(--lumi-space-md);
	}

	.lumi-sidebar__body::-webkit-scrollbar {
		width: 4px;
	}

	.lumi-sidebar__body::-webkit-scrollbar-track {
		background: transparent;
	}

	.lumi-sidebar__body::-webkit-scrollbar-thumb {
		background: var(--lumi-color-border);
		border-radius: var(--lumi-radius-full);
	}

	.lumi-sidebar__body::-webkit-scrollbar-thumb:hover {
		background: var(--lumi-color-border-strong);
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
			width: var(--lumi-sidebar-width);
			z-index: var(--lumi-z-modal);
		}

		.lumi-sidebar--mobile-open {
			transform: translateX(0);
			box-shadow: var(--lumi-shadow-xl);
		}

		.lumi-sidebar--collapsed {
			width: var(--lumi-sidebar-width);
		}
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.lumi-sidebar {
			transition: none;
		}
	}
</style>
