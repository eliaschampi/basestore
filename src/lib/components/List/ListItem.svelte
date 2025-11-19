<script lang="ts">
	import type { Snippet } from "svelte";
	import Icon from "../Icon/Icon.svelte";

	interface Props {
		title?: string;
		subtitle?: string;
		icon?: string;
		disabled?: boolean;
		clickable?: boolean;
		active?: boolean;
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children?: Snippet;
		avatar?: Snippet;
		titleSlot?: Snippet;
		subtitleSlot?: Snippet;
	}

	const {
		title,
		subtitle,
		icon,
		disabled = false,
		clickable = false,
		active = false,
		class: className = "",
		onclick,
		children,
		avatar,
		titleSlot,
		subtitleSlot
	}: Props = $props();

	const classes = $derived(() => {
		return [
			"lumi-list-item",
			disabled && "lumi-list-item--disabled",
			clickable && "lumi-list-item--clickable",
			active && "lumi-list-item--active",
			className
		]
			.filter(Boolean)
			.join(" ");
	});

	const handleClick = (event: MouseEvent) => {
		if (!disabled && onclick) {
			onclick(event);
		}
	};
</script>

<div
	class={classes()}
	onclick={handleClick}
	role={clickable ? "button" : undefined}
	tabindex={clickable && !disabled ? 0 : undefined}
>
	{#if avatar}
		<div class="lumi-list-item__avatar">
			{@render avatar()}
		</div>
	{/if}

	{#if icon}
		<div class="lumi-list-item__icon">
			<Icon {icon} size="var(--list-icon-size, 20px)" />
		</div>
	{/if}

	<div class="lumi-list-item__content">
		{#if title || titleSlot}
			<div class="lumi-list-item__title">
				{#if titleSlot}
					{@render titleSlot()}
				{:else}
					{title}
				{/if}
			</div>
		{/if}

		{#if subtitle || subtitleSlot}
			<div class="lumi-list-item__subtitle">
				{#if subtitleSlot}
					{@render subtitleSlot()}
				{:else}
					{subtitle}
				{/if}
			</div>
		{/if}
	</div>

	{#if children}
		<div class="lumi-list-item__actions">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.lumi-list-item {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
		padding: var(--list-item-padding, var(--lumi-space-sm) var(--lumi-space-md));
		border-radius: var(--lumi-radius-md);
		transition: all 0.2s ease;
		cursor: default;
		background: transparent;
		position: relative;
		color: var(--lumi-color-text);
		text-decoration: none;
	}

	/* Avatar */
	.lumi-list-item__avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		flex-shrink: 0;
		border-radius: var(--lumi-radius-full);
		overflow: hidden;
	}

	/* Icon */
	.lumi-list-item__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--lumi-color-text-muted);
		flex-shrink: 0;
		transition: color 0.2s;
	}

	/* Content */
	.lumi-list-item__content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.lumi-list-item__title {
		font-size: var(--list-font-size, var(--lumi-font-size-base));
		font-weight: var(--lumi-font-weight-medium);
		color: inherit;
		line-height: var(--lumi-line-height-tight);
	}

	.lumi-list-item__subtitle {
		font-size: 0.85em;
		color: var(--lumi-color-text-muted);
		line-height: var(--lumi-line-height-normal);
		margin-top: 2px;
	}

	/* Actions */
	.lumi-list-item__actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		margin-left: auto;
	}

	/* States */
	.lumi-list-item--disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.lumi-list-item--clickable {
		cursor: pointer;
	}

	.lumi-list-item--clickable:hover:not(.lumi-list-item--active):not(.lumi-list-item--disabled) {
		background: var(--lumi-color-background-hover);
		color: var(--lumi-color-text);
	}
	
	.lumi-list-item--clickable:hover .lumi-list-item__icon {
		color: var(--lumi-color-primary);
	}

	/* Active state */
	.lumi-list-item--active {
		background: var(--lumi-color-primary-bg);
		color: var(--lumi-color-primary);
	}

	.lumi-list-item--active .lumi-list-item__title {
		font-weight: var(--lumi-font-weight-semibold);
	}

	.lumi-list-item--active .lumi-list-item__icon {
		color: var(--lumi-color-primary);
	}
	
	.lumi-list-item--active .lumi-list-item__subtitle {
		color: color-mix(in srgb, var(--lumi-color-primary) 70%, transparent);
	}
</style>
