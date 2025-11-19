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
			<Icon {icon} size="20px" />
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
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		border-radius: var(--lumi-radius-lg);
		transition: var(--lumi-transition-all);
		cursor: default;
		background: transparent;
		position: relative;
	}

	/* Avatar */
	.lumi-list-item__avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		flex-shrink: 0;
	}

	/* Icon */
	.lumi-list-item__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		color: var(--lumi-color-primary);
		flex-shrink: 0;
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
		font-size: var(--lumi-font-size-base);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-tight);
		margin: 0;
	}

	.lumi-list-item__subtitle {
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text-muted);
		line-height: var(--lumi-line-height-normal);
	}

	/* Actions */
	.lumi-list-item__actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
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
		background: var(--lumi-color-surface-hover);
		transform: translateX(2px);
	}

	.lumi-list-item--clickable:active {
		background: var(--lumi-color-surface-hover);
		transform: translateX(0);
	}

	/* Active state */
	.lumi-list-item--active {
		background: var(--lumi-color-primary-bg);
	}

	.lumi-list-item--active::before {
		content: "";
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 3px;
		height: 60%;
		background: var(--lumi-color-primary);
		border-radius: 0 var(--lumi-radius-full) var(--lumi-radius-full) 0;
	}

	.lumi-list-item--active .lumi-list-item__title {
		color: var(--lumi-color-primary);
		font-weight: var(--lumi-font-weight-semibold);
	}

	.lumi-list-item--active .lumi-list-item__icon {
		color: var(--lumi-color-primary);
	}

	/* Hover for non-active items */
	.lumi-list-item:hover:not(.lumi-list-item--disabled):not(.lumi-list-item--active) {
		background: var(--lumi-color-surface-hover);
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.lumi-list-item {
			transition: none;
		}
	}
</style>
