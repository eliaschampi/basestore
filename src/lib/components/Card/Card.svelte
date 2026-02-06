<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { CardProps } from './types';

	interface Props extends CardProps {
		children?: Snippet;
		header?: Snippet;
		footer?: Snippet;
		onclick?: (event: MouseEvent) => void;
		'aria-label'?: string;
	}

	const {
		clickable = false,
		hoverable,
		image,
		imageHeight = 200,
		imageAlt,
		title,
		subtitle,
		spaced = false,
		class: className,
		style,
		'aria-label': ariaLabel = '',
		onclick,
		children,
		header,
		footer
	}: Props = $props();

	const cardClasses = $derived(() => {
		const classes = ['lumi-card'];
		const isHoverable = hoverable ?? clickable;

		if (clickable) classes.push('lumi-card--clickable');
		if (isHoverable) classes.push('lumi-card--hoverable');
		if (image) classes.push('lumi-card--with-image');
		if (spaced) classes.push('lumi-card--spaced');
		if (className) classes.push(className);
		return classes.join(' ');
	});

	const cardStyles = $derived(() => {
		const imageHeightStyle = `--card-image-height: ${imageHeight}px;`;
		return style ? `${imageHeightStyle} ${style}` : imageHeightStyle;
	});

	function handleClick(event: MouseEvent) {
		if (clickable && onclick) {
			onclick(event);
		}
	}
</script>

{#snippet cardContent()}
	{#if image}
		<div class="lumi-card__image">
			<img src={image} alt={imageAlt || title || 'Card image'} />
		</div>
	{/if}

	{#if header || title}
		<div class="lumi-card__header">
			{#if header}
				{@render header()}
			{:else}
				{#if title}
					<h4 class="lumi-card__title">{title}</h4>
				{/if}
				{#if subtitle}
					<p class="lumi-card__subtitle">{subtitle}</p>
				{/if}
			{/if}
		</div>
	{/if}

	<div class="lumi-card__content">
		{#if children}
			{@render children()}
		{/if}
	</div>

	{#if footer}
		<div class="lumi-card__footer">
			{@render footer()}
		</div>
	{/if}
{/snippet}

{#if clickable}
	<button
		type="button"
		class={cardClasses()}
		style={cardStyles()}
		onclick={handleClick}
		aria-label={ariaLabel || title || 'Card'}
	>
		{@render cardContent()}
	</button>
{:else}
	<div class={cardClasses()} style={cardStyles()}>
		{@render cardContent()}
	</div>
{/if}

<style>
	.lumi-card {
		position: relative;
		background:
			linear-gradient(
				180deg,
				rgba(var(--lumi-color-primary-rgb), 0.04) 0%,
				rgba(var(--lumi-color-primary-rgb), 0) 30%
			),
			var(--lumi-color-surface);
		border: 1px solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-2xl);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: var(--lumi-shadow-md);
		transition: var(--lumi-transition-all);
		width: 100%;
		text-align: left;
		color: var(--lumi-color-text);
		appearance: none;
		font: inherit;
		padding: 0;
	}

	/* Clickable state */
	.lumi-card--clickable {
		cursor: pointer;
	}

	.lumi-card--clickable:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 var(--lumi-border-width-thick)
				color-mix(in srgb, var(--lumi-color-primary) 18%, transparent),
			var(--lumi-shadow-md);
	}

	.lumi-card--hoverable:hover {
		transform: translateY(calc(var(--lumi-space-2xs) * -1));
		box-shadow: var(--lumi-shadow-lg);
		border-color: color-mix(in srgb, var(--lumi-color-primary) 25%, var(--lumi-color-border));
	}

	.lumi-card--hoverable:active {
		transform: translateY(0);
		box-shadow: var(--lumi-shadow-sm);
	}

	/* Spaced content */
	.lumi-card--spaced .lumi-card__content {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-md);
	}

	/* Image */
	.lumi-card__image {
		width: 100%;
		height: var(--card-image-height);
		overflow: hidden;
		flex-shrink: 0;
		position: relative;
		border-bottom: 1px solid var(--lumi-color-border-light);
	}

	.lumi-card__image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: transform var(--lumi-duration-slow) var(--lumi-easing-default);
	}

	.lumi-card--hoverable:hover .lumi-card__image img {
		transform: scale(1.05);
	}

	/* Sections */
	.lumi-card__header,
	.lumi-card__content,
	.lumi-card__footer {
		padding: var(--lumi-space-lg);
	}

	.lumi-card__header {
		padding-bottom: var(--lumi-space-xs);
	}

	.lumi-card__content {
		flex: 1;
		padding-top: var(--lumi-space-sm);
		padding-bottom: var(--lumi-space-lg);
	}

	.lumi-card__footer {
		padding-top: var(--lumi-space-md);
		border-top: 1px solid var(--lumi-color-border-light);
		background: var(--lumi-color-background-hover);
	}

	/* Typography */
	.lumi-card__title {
		margin: 0;
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-tight);
		font-size: var(--lumi-font-size-lg);
		font-weight: var(--lumi-font-weight-semibold);
	}

	.lumi-card__subtitle {
		margin: var(--lumi-space-xs) 0 0 0;
		color: var(--lumi-color-text-muted);
		font-size: var(--lumi-font-size-sm);
		line-height: var(--lumi-line-height-normal);
	}

	/* With Image adjustments */
	.lumi-card--with-image .lumi-card__header {
		padding-top: var(--lumi-space-lg);
	}
</style>
