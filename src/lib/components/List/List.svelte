<script lang="ts">
	import type { Snippet } from "svelte";
	import type { ListProps } from "./types";

	interface Props extends ListProps {
		children?: Snippet;
	}

	const { size = "md", disabled = false, class: className = "", children }: Props = $props();

	const classes = $derived(() => {
		return ["lumi-list", `lumi-list--${size}`, disabled && "lumi-list--disabled", className]
			.filter(Boolean)
			.join(" ");
	});
</script>

<div class={classes()}>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.lumi-list {
		width: 100%;
		position: relative;
		font-family: var(--lumi-font-family-sans);
		background: transparent;
		border: none;
		overflow: hidden;
	}

	/* Size variants */
	.lumi-list--sm :global(.lumi-list-item),
	.lumi-list--sm :global(.lumi-list-header) {
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-list--md :global(.lumi-list-item),
	.lumi-list--md :global(.lumi-list-header) {
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		font-size: var(--lumi-font-size-base);
	}

	/* Disabled state */
	.lumi-list--disabled {
		opacity: 0.5;
		pointer-events: none;
		cursor: not-allowed;
	}
</style>
