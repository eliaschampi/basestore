<script lang="ts">
	import type { Snippet } from 'svelte';
	import Title from '../Title/Title.svelte';
	import type { PageHeaderProps } from './types';

	interface Props extends PageHeaderProps {
		children?: Snippet;
		breadcrumbs?: Snippet;
		actions?: Snippet;
	}

	const {
		bordered = false,
		title = '',
		subtitle = '',
		icon = '',
		size = 'lg',
		color = 'text',
		class: className = '',
		children,
		breadcrumbs,
		actions
	}: Props = $props();

	const classes = $derived(() => {
		return [
			'lumi-page-header',
			bordered && 'lumi-page-header--bordered',
			actions && 'lumi-page-header--with-actions',
			className
		]
			.filter(Boolean)
			.join(' ');
	});
</script>

<header class={classes()}>
	{#if breadcrumbs}
		<nav class="lumi-page-header__breadcrumbs" aria-label="Breadcrumb">
			{@render breadcrumbs()}
		</nav>
	{/if}

	<div class="lumi-page-header__main">
		<div class="lumi-page-header__title">
			{#if children}
				{@render children()}
			{:else}
				<Title {title} {subtitle} {icon} {size} {color} />
			{/if}
		</div>

		{#if actions}
			<div class="lumi-page-header__actions" role="group" aria-label="Page actions">
				{@render actions()}
			</div>
		{/if}
	</div>
</header>

<style>
	.lumi-page-header {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-lg);
		border-radius: var(--lumi-radius-2xl);
		border: 1px solid var(--lumi-color-border-light);
		background: var(--lumi-color-surface-overlay);
		box-shadow: var(--lumi-shadow-md);
		backdrop-filter: blur(var(--lumi-blur-md));
		-webkit-backdrop-filter: blur(var(--lumi-blur-md));
		overflow: hidden;
		isolation: isolate;
		transition: var(--lumi-transition-all);
	}

	.lumi-page-header::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(
				circle at top left,
				color-mix(in srgb, var(--lumi-color-primary-bg) 70%, transparent),
				transparent 60%
			),
			linear-gradient(
				140deg,
				color-mix(in srgb, var(--lumi-color-surface) 80%, transparent),
				var(--lumi-color-surface-overlay)
			);
		z-index: -2;
	}

	.lumi-page-header::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: linear-gradient(
			120deg,
			transparent 0%,
			rgba(var(--lumi-color-primary-rgb), 0.08) 45%,
			transparent 100%
		);
		opacity: 0.8;
		z-index: -1;
		pointer-events: none;
	}

	.lumi-page-header--bordered {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 12%, var(--lumi-color-border-light));
	}

	.lumi-page-header__main {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--lumi-space-md);
		width: 100%;
		position: relative;
		z-index: var(--lumi-z-base);
	}

	.lumi-page-header--bordered .lumi-page-header__main {
		padding-bottom: var(--lumi-space-xs);
		border-bottom: 1px solid color-mix(in srgb, var(--lumi-color-border) 65%, transparent);
	}

	.lumi-page-header__breadcrumbs {
		position: relative;
		z-index: var(--lumi-z-base);
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		padding: var(--lumi-space-2xs) var(--lumi-space-sm);
		border-radius: var(--lumi-radius-full);
		background: color-mix(in srgb, var(--lumi-color-surface) 80%, transparent);
		border: 1px solid var(--lumi-color-border-light);
		color: var(--lumi-color-text-muted);
		font-size: var(--lumi-font-size-sm);
		box-shadow: var(--lumi-shadow-sm);
		width: fit-content;
	}

	.lumi-page-header__title {
		flex: 1;
		min-width: 0;
	}

	.lumi-page-header__actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		flex-shrink: 0;
		flex-wrap: wrap;
	}

	@media (max-width: 768px) {
		.lumi-page-header {
			padding: var(--lumi-space-md);
			border-radius: var(--lumi-radius-xl);
		}

		.lumi-page-header__main {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--lumi-space-sm);
		}

		.lumi-page-header__actions {
			width: 100%;
			justify-content: flex-end;
			gap: var(--lumi-space-xs);
		}
	}
</style>
