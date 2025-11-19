<script lang="ts">
	import type { Snippet } from "svelte";
	import Title from "../Title/Title.svelte";
	import type { PageHeaderProps } from "./types";

	interface Props extends PageHeaderProps {
		children?: Snippet;
		breadcrumbs?: Snippet;
		actions?: Snippet;
	}

	const {
		bordered = false,
		title,
		subtitle,
		icon,
		iconColor,
		size = "lg",
		color,
		class: className = "",
		children,
		breadcrumbs,
		actions
	}: Props = $props();

	const classes = $derived(() => {
		return ["lumi-page-header", bordered && "lumi-page-header--bordered", className]
			.filter(Boolean)
			.join(" ");
	});
</script>

<header class={classes()}>
	{#if breadcrumbs}
		<div class="lumi-page-header__breadcrumbs">
			{@render breadcrumbs()}
		</div>
	{/if}

	<div class="lumi-page-header__main">
		{#if children}
			{@render children()}
		{:else}
			<Title {title} {subtitle} {icon} {iconColor} {size} {color} />
		{/if}

		{#if actions}
			<div class="lumi-page-header__actions">
				{@render actions()}
			</div>
		{/if}
	</div>
</header>

<style>
	.lumi-page-header {
		padding-bottom: var(--lumi-space-lg);
		transition: var(--lumi-transition-all);
	}

	.lumi-page-header--bordered {
		border-bottom: 2px solid var(--lumi-color-border);
		padding-bottom: var(--lumi-space-xl);
	}

	.lumi-page-header__main {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--lumi-space-md);
		width: 100%;
	}

	.lumi-page-header__breadcrumbs {
		margin-bottom: var(--lumi-space-md);
	}

	.lumi-page-header__actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		flex-shrink: 0;
	}

	@media (max-width: 768px) {
		.lumi-page-header__main {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--lumi-space-sm);
		}

		.lumi-page-header__actions {
			width: 100%;
			justify-content: flex-end;
			flex-wrap: wrap;
			gap: var(--lumi-space-xs);
		}
	}
</style>
