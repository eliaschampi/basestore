<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SidebarItemProps } from './types';

	interface Props extends SidebarItemProps {
		children?: Snippet;
		icon?: Snippet;
	}

	const {
		active = false,
		collapsed = false,
		href = undefined,
		class: className = '',
		onclick,
		children,
		icon
	}: Props = $props();

	const itemClasses = $derived(() => {
		return ['lumi-sidebar-item', active && 'lumi-sidebar-item--active', className]
			.filter(Boolean)
			.join(' ');
	});
</script>

{#if href}
	<a {href} class={itemClasses()} {onclick}>
		{#if icon}
			<span class="lumi-sidebar-item__icon">
				{@render icon()}
			</span>
		{/if}
		{#if !collapsed}
			<span class="lumi-sidebar-item__text">
				{#if children}
					{@render children()}
				{/if}
			</span>
		{/if}
	</a>
{:else}
	<button type="button" class={itemClasses()} {onclick}>
		{#if icon}
			<span class="lumi-sidebar-item__icon">
				{@render icon()}
			</span>
		{/if}
		{#if !collapsed}
			<span class="lumi-sidebar-item__text">
				{#if children}
					{@render children()}
				{/if}
			</span>
		{/if}
	</button>
{/if}

<style>
	.lumi-sidebar-item {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		min-height: 44px;
		border-radius: var(--lumi-radius-md);
		color: var(--lumi-color-text-muted);
		font-weight: var(--lumi-font-weight-medium);
		font-size: var(--lumi-font-size-base);
		text-decoration: none;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: all 0.2s ease;
		width: 100%;
		outline: none;
	}

	.lumi-sidebar-item:hover {
		background: var(--lumi-color-background-hover);
		color: var(--lumi-color-text);
	}

	.lumi-sidebar-item:focus-visible {
		box-shadow: 0 0 0 2px var(--lumi-color-primary);
	}

	.lumi-sidebar-item--active {
		background: var(--lumi-color-primary-bg);
		color: var(--lumi-color-primary);
	}

	.lumi-sidebar-item--active:hover {
		background: var(--lumi-color-primary-bg);
		color: var(--lumi-color-primary);
	}

	.lumi-sidebar-item__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 20px;
		height: 20px;
	}

	.lumi-sidebar-item__text {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.5;
	}
</style>
