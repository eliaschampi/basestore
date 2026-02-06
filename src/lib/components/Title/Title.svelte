<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import { getIconSize } from '../config';
	import type { LumiSize } from '../config';
	import type { TitleColor, TitleSize } from './types';

	interface Props {
		size?: TitleSize;
		color?: TitleColor;
		icon?: string;
		iconColor?: TitleColor;
		title?: string;
		subtitle?: string;
		class?: string;
		children?: Snippet;
		iconSnippet?: Snippet;
		subtitleSnippet?: Snippet;
		right?: Snippet;
	}

	const {
		size = 'md',
		color = 'text',
		icon = '',
		iconColor,
		title = '',
		subtitle = '',
		class: className = '',
		children,
		iconSnippet,
		subtitleSnippet,
		right
	}: Props = $props();

	const iconSizeMap: Record<TitleSize, LumiSize> = {
		sm: 'sm',
		md: 'md',
		lg: 'lg',
		xl: 'xl'
	};

	const iconSize = $derived(() => `${getIconSize(iconSizeMap[size])}px`);

	const titleClasses = $derived(() => {
		return [
			'lumi-title',
			`lumi-title--${size}`,
			(icon || iconSnippet) && 'lumi-title--with-icon',
			(subtitle || subtitleSnippet) && 'lumi-title--with-subtitle',
			right && 'lumi-title--with-right',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	const styleVars = $derived(() => {
		const titleColorVar =
			color === 'text'
				? 'var(--lumi-color-text)'
				: `var(--lumi-color-${color as Exclude<TitleColor, 'text'>})`;
		const resolvedIconColor = iconColor ? `var(--lumi-color-${iconColor})` : titleColorVar;
		return `--title-color: ${titleColorVar}; --title-icon-color: ${resolvedIconColor};`;
	});
</script>

<div class={titleClasses()} style={styleVars()}>
	<!-- Icon -->
	{#if icon || iconSnippet}
		<div class="lumi-title__icon">
			{#if iconSnippet}
				{@render iconSnippet()}
			{:else if icon}
				<Icon {icon} size={iconSize()} />
			{/if}
		</div>
	{/if}

	<!-- Content -->
	<div class="lumi-title__content">
		<!-- Main title -->
		<h3 class="lumi-title__text">
			{#if children}
				{@render children()}
			{:else}
				{title}
			{/if}
		</h3>

		<!-- Subtitle -->
		{#if subtitle || subtitleSnippet}
			<div class="lumi-title__subtitle">
				{#if subtitleSnippet}
					{@render subtitleSnippet()}
				{:else}
					{subtitle}
				{/if}
			</div>
		{/if}
	</div>

	<!-- Right content -->
	{#if right}
		<div class="lumi-title__right">
			{@render right()}
		</div>
	{/if}
</div>

<style>
	.lumi-title {
		display: flex;
		align-items: center;
		font-family: var(--lumi-font-family-sans);
		line-height: var(--lumi-line-height-normal);
		gap: var(--lumi-space-sm);
		color: var(--title-color);
	}

	.lumi-title__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: var(--title-icon-color);
		opacity: 0.8;
	}

	.lumi-title__content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.lumi-title__text {
		margin: 0;
		font-weight: var(--lumi-font-weight-bold);
		color: inherit;
		line-height: var(--lumi-line-height-tight);
	}

	.lumi-title__subtitle {
		margin-top: var(--lumi-space-2xs);
		font-weight: var(--lumi-font-weight-normal);
		color: var(--lumi-color-text-muted);
		line-height: var(--lumi-line-height-normal);
		font-size: 0.875em; /* Relative to title size */
	}

	.lumi-title__right {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		flex-shrink: 0;
		margin-left: auto;
	}

	/* Sizes */
	.lumi-title--sm .lumi-title__text {
		font-size: var(--lumi-font-size-base);
	}
	.lumi-title--md .lumi-title__text {
		font-size: var(--lumi-font-size-lg);
	}
	.lumi-title--lg .lumi-title__text {
		font-size: var(--lumi-font-size-xl);
	}
	.lumi-title--xl .lumi-title__text {
		font-size: var(--lumi-font-size-2xl);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.lumi-title--xl .lumi-title__text {
			font-size: var(--lumi-font-size-xl);
		}
		.lumi-title--lg .lumi-title__text {
			font-size: var(--lumi-font-size-lg);
		}
	}
</style>
