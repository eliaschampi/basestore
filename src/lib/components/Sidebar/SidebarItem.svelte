<script lang="ts">
	import type { Snippet } from "svelte";
	import type { SidebarItemProps } from "./types";

	interface Props extends SidebarItemProps {
		children?: Snippet;
		icon?: Snippet;
	}

	const {
		active = false,
		collapsed = false,
		href = undefined,
		class: className = "",
		onclick,
		children,
		icon
	}: Props = $props();

	const itemClasses = $derived(() => {
		return ["lumi-sidebar-item", active && "lumi-sidebar-item--active", className]
			.filter(Boolean)
			.join(" ");
	});

	function handleClick(): void {
		if (!href) {
			onclick?.();
		}
	}
</script>

{#if href}
	<a {href} class={itemClasses()}>
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
		text-decoration: none;
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		border-radius: var(--lumi-radius-md);
		color: var(--lumi-color-text-muted);
		font-weight: var(--lumi-font-weight-medium);
		font-size: var(--lumi-font-size-base);
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: all var(--lumi-duration-fast) var(--lumi-easing-default);
		width: 100%;
	}

	.lumi-sidebar-item--active {
		background: var(--lumi-color-primary-bg);
		color: var(--lumi-color-primary);
	}
	

	.lumi-sidebar-item--active::before {
		content: "";
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 4px;
		height: 60%;
		background: var(--lumi-color-primary);
		border-radius: 0 var(--lumi-radius-full) var(--lumi-radius-full) 0;
	}

	.lumi-sidebar-item__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.lumi-sidebar-item__text {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
