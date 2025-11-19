<script lang="ts">
	import type { Snippet } from "svelte";
	import type { CardProps } from "./types";

	interface Props extends CardProps {
		children?: Snippet;
		header?: Snippet;
		footer?: Snippet;
		onclick?: (event: MouseEvent) => void;
	}

	const {
		clickable = false,
		image,
		imageHeight = 200,
		imageAlt,
		title,
		subtitle,
		spaced = false,
		class: className,
		style,
		onclick,
		children,
		header,
		footer
	}: Props = $props();

	const cardClasses = $derived(() => {
		const classes = ["lumi-card"];

		if (clickable) classes.push("lumi-card--clickable");
		if (image) classes.push("lumi-card--with-image");
		if (spaced) classes.push("lumi-card--spaced");
		if (className) classes.push(className);

		return classes.join(" ");
	});

	const contentClasses = $derived(() => {
		return "lumi-card__content";
	});

	function handleClick(event: MouseEvent) {
		if (clickable && onclick) {
			onclick(event);
		}
	}
</script>

<div class={cardClasses()} {style} onclick={handleClick}>
	{#if image}
		<div class="lumi-card__image" style="height: {imageHeight}px;">
			<img src={image} alt={imageAlt || title || "Card image"} />
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

	<div class={contentClasses()}>
		{#if children}
			{@render children()}
		{/if}
	</div>

	{#if footer}
		<div class="lumi-card__footer">
			{@render footer()}
		</div>
	{/if}
</div>

<style>
	.lumi-card {
		position: relative;
		background: var(--lumi-color-surface);
		border-radius: var(--lumi-radius-2xl);
		border: none;
		transition: var(--lumi-transition-all);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: var(--lumi-shadow-md);
		padding: var(--lumi-space-lg);
		width: 100%;
		text-align: left;
		font: inherit;
		color: inherit;
	}

	/* Card with image - remove padding for seamless image */
	.lumi-card--with-image {
		padding: 0;
	}

	.lumi-card--with-image .lumi-card__header,
	.lumi-card--with-image .lumi-card__content,
	.lumi-card--with-image .lumi-card__footer {
		padding: 0 var(--lumi-space-lg);
	}

	.lumi-card--with-image .lumi-card__header {
		padding-top: var(--lumi-space-lg);
	}

	.lumi-card--with-image .lumi-card__content {
		padding-bottom: var(--lumi-space-lg);
	}

	.lumi-card--with-image .lumi-card__footer {
		padding-bottom: var(--lumi-space-lg);
	}

	/* Clickable state */
	.lumi-card--clickable {
		cursor: pointer;
	}
	/** will change shadow to border */
	.lumi-card--clickable:hover {
		transform: translateY(-1px);
		border: 2px dotted var(--lumi-color-border);
	}

	.lumi-card--clickable:active {
		transform: translateY(0);
		border: 2px dotted var(--lumi-color-border);
	}

	/* Spaced content - adds gap between children */
	.lumi-card--spaced .lumi-card__content {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-md);
	}

	/* Card image - seamless integration */
	.lumi-card__image {
		width: 100%;
		overflow: hidden;
		flex-shrink: 0;
		position: relative;
	}

	.lumi-card__image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* Card elements - clean and minimal */
	.lumi-card__header {
		border-bottom: none;
		flex-shrink: 0;
		padding-bottom: var(--lumi-space-sm);
	}

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

	.lumi-card__content {
		flex: 1;
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-normal);
	}

	.lumi-card__footer {
		border-top: none;
		flex-shrink: 0;
		padding-top: var(--lumi-space-md);
	}
</style>
