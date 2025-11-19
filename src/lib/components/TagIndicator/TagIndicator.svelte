<script lang="ts">
	import Icon from "../Icon/Icon.svelte";
	import type { TagIndicatorProps } from "./types";

	const {
		tag,
		selected = false,
		size = "sm",
		showIcon = false,
		clickable = true,
		tooltip = "",
		orientation = "horizontal",
		disabled = false,
		class: className = "",
		onclick
	}: TagIndicatorProps = $props();

	const containerClasses = $derived(() => {
		return [
			"lumi-tag-indicator",
			`lumi-tag-indicator--${size}`,
			`lumi-tag-indicator--${orientation}`,
			selected && "lumi-tag-indicator--selected",
			clickable && !disabled && "lumi-tag-indicator--clickable",
			disabled && "lumi-tag-indicator--disabled",
			className
		]
			.filter(Boolean)
			.join(" ");
	});

	function handleClick(): void {
		if (clickable && !disabled) {
			onclick?.(tag);
		}
	}
</script>

<button
	class={containerClasses()}
	title={tooltip}
	{disabled}
	style="--tag-color: {tag.color}"
	onclick={handleClick}
>
	<span class="lumi-tag-indicator__content">
		<span class="lumi-tag-indicator__label">{tag.name}</span>
		{#if showIcon && selected}
			<Icon icon="check" size="12px" class="lumi-tag-indicator__icon" />
		{/if}
	</span>
</button>

<style>
	.lumi-tag-indicator {
		display: inline-flex;
		align-items: center;
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		background: transparent;
		border: 2px solid var(--tag-color, var(--lumi-color-primary));
		border-radius: var(--lumi-radius-full);
		color: var(--tag-color, var(--lumi-color-primary));
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		transition: var(--lumi-transition-all);
		cursor: default;
	}

	.lumi-tag-indicator--clickable {
		cursor: pointer;
	}

	.lumi-tag-indicator--clickable:hover:not(.lumi-tag-indicator--disabled) {
		background: var(--tag-color, var(--lumi-color-primary));
		color: white;
	}

	.lumi-tag-indicator--selected {
		background: var(--tag-color, var(--lumi-color-primary));
		color: white;
	}

	.lumi-tag-indicator--disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.lumi-tag-indicator__content {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
	}

	.lumi-tag-indicator--sm {
		padding: var(--lumi-space-2xs) var(--lumi-space-xs);
		font-size: var(--lumi-font-size-xs);
	}

	.lumi-tag-indicator--md {
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-tag-indicator--lg {
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		font-size: var(--lumi-font-size-base);
	}
</style>
