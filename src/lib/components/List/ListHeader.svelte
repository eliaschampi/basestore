<script lang="ts">
	import type { Snippet } from "svelte";
	import Icon from "../Icon/Icon.svelte";
	import type { ListHeaderProps } from "./types";

	interface Props extends ListHeaderProps {
		children?: Snippet;
		actions?: Snippet;
	}

	const { title, color, icon, class: className = "", children, actions }: Props = $props();

	const classes = $derived(() => {
		return ["lumi-list-header", color && `lumi-list-header--${color}`, className]
			.filter(Boolean)
			.join(" ");
	});
</script>

<div class={classes()}>
	{#if icon}
		<div class="lumi-list-header__icon">
			<Icon {icon} size="20px" />
		</div>
	{/if}

	<div class="lumi-list-header__content">
		{#if title}
			<div class="lumi-list-header__title">
				{title}
			</div>
		{/if}
	</div>

	{#if actions}
		<div class="lumi-list-header__actions">
			{@render actions()}
		</div>
	{:else if children}
		<div class="lumi-list-header__actions">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.lumi-list-header {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-sm) 0;
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
		background: transparent;
		border-bottom: none;
		margin-bottom: var(--lumi-space-xs);
	}

	.lumi-list-header__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		color: var(--lumi-color-text-muted);
		flex-shrink: 0;
	}

	.lumi-list-header__content {
		flex: 1;
		min-width: 0;
	}

	.lumi-list-header__title {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-semibold);
		color: inherit;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.lumi-list-header__actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		margin-left: auto;
	}

	/* Color variants */
	.lumi-list-header--primary {
		color: var(--lumi-color-primary);
	}

	.lumi-list-header--primary .lumi-list-header__icon {
		color: var(--lumi-color-primary);
	}

	.lumi-list-header--secondary {
		color: var(--lumi-color-secondary);
	}

	.lumi-list-header--secondary .lumi-list-header__icon {
		color: var(--lumi-color-secondary);
	}

	.lumi-list-header--success {
		color: var(--lumi-color-success);
	}

	.lumi-list-header--success .lumi-list-header__icon {
		color: var(--lumi-color-success);
	}

	.lumi-list-header--warning {
		color: var(--lumi-color-warning);
	}

	.lumi-list-header--warning .lumi-list-header__icon {
		color: var(--lumi-color-warning);
	}

	.lumi-list-header--danger {
		color: var(--lumi-color-danger);
	}

	.lumi-list-header--danger .lumi-list-header__icon {
		color: var(--lumi-color-danger);
	}

	.lumi-list-header--info {
		color: var(--lumi-color-info);
	}

	.lumi-list-header--info .lumi-list-header__icon {
		color: var(--lumi-color-info);
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.lumi-list-header {
			transition: none;
		}
	}
</style>
