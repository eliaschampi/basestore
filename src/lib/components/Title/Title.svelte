<script lang="ts">
	import type { Snippet } from "svelte";
	import Icon from "../Icon/Icon.svelte";
	import type { TitleColor, TitleSize } from "./types";

	interface Props {
		size?: TitleSize;
		color?: TitleColor;
		icon?: string;
		title?: string;
		subtitle?: string;
		class?: string;
		children?: Snippet;
		iconSnippet?: Snippet;
		subtitleSnippet?: Snippet;
		right?: Snippet;
	}

	const {
		size = "md",
		color = "primary",
		icon = "",
		title = "",
		subtitle = "",
		class: className = "",
		children,
		iconSnippet,
		subtitleSnippet,
		right
	}: Props = $props();

	const titleClasses = $derived(() => {
		return [
			"lumi-title",
			(icon || iconSnippet) && "lumi-title--with-icon",
			(subtitle || subtitleSnippet) && "lumi-title--with-subtitle",
			right && "lumi-title--with-right",
			className
		]
			.filter(Boolean)
			.join(" ");
	});

	const titleTextClasses = $derived(() => {
		return ["lumi-title__text", `lumi-title__text--${size}`, `lumi-title__text--${color}`]
			.filter(Boolean)
			.join(" ");
	});
</script>

<div class={titleClasses()}>
	<!-- Icon -->
	{#if icon || iconSnippet}
		<div class="lumi-title__icon">
			{#if iconSnippet}
				{@render iconSnippet()}
			{:else if icon}
				<Icon {icon} size={size === "lg" ? "32px" : "24px"} />
			{/if}
		</div>
	{/if}

	<!-- Content -->
	<div class="lumi-title__content">
		<!-- Main title -->
		<div class={titleTextClasses()}>
			{#if children}
				{@render children()}
			{:else}
				{title}
			{/if}
		</div>

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
		transition: var(--lumi-transition-all);
		gap: var(--lumi-space-xs);
	}

	.lumi-title__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.lumi-title__content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.lumi-title__text {
		margin: 0;
		font-weight: var(--lumi-font-weight-bold);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-tight);
	}

	.lumi-title__text--sm {
		font-size: var(--lumi-font-size-base);
		font-weight: var(--lumi-font-weight-normal);
	}

	.lumi-title__text--md {
		font-size: var(--lumi-font-size-lg);
	}

	.lumi-title__text--lg {
		font-size: var(--lumi-font-size-xl);
	}

	.lumi-title__text--primary {
		color: var(--lumi-color-primary);
	}

	.lumi-title__text--secondary {
		color: var(--lumi-color-secondary);
	}

	.lumi-title__text--success {
		color: var(--lumi-color-success);
	}

	.lumi-title__text--warning {
		color: var(--lumi-color-warning);
	}

	.lumi-title__text--danger {
		color: var(--lumi-color-danger);
	}

	.lumi-title__text--info {
		color: var(--lumi-color-info);
	}

	.lumi-title__subtitle {
		margin: 0;
		margin-top: var(--lumi-space-2xs);
		font-weight: var(--lumi-font-weight-normal);
		color: var(--lumi-color-text-muted);
		line-height: var(--lumi-line-height-normal);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-title__right {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		flex-shrink: 0;
	}

	.lumi-title--with-right {
		justify-content: space-between;
	}

	.lumi-title:hover .lumi-title__icon {
		transform: scale(1.05);
	}

	.lumi-title:focus-visible {
		outline: 2px solid var(--lumi-color-primary);
		outline-offset: 2px;
		border-radius: var(--lumi-radius-md);
	}
</style>
