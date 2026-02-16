<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { TooltipProps } from './types';
	import { LUMI_CONFIG } from '../config';

	interface Props extends TooltipProps {
		children?: Snippet;
		content?: Snippet;
	}

	const {
		text = '',
		color = 'primary',
		position = 'top',
		delay = 0,
		class: className = '',
		children,
		content
	}: Props = $props();

	let isVisible = $state(false);
	let showTimeout: number | null = null;

	const transitionDuration = LUMI_CONFIG.transitions.fast;

	const tooltipClasses = $derived(() => {
		return [
			'lumi-tooltip__content',
			`lumi-tooltip--${position}`,
			`lumi-tooltip--${color}`,
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	function showTooltip(): void {
		if (delay > 0) {
			showTimeout = window.setTimeout(() => {
				isVisible = true;
			}, delay);
		} else {
			isVisible = true;
		}
	}

	function hideTooltip(): void {
		if (showTimeout) {
			clearTimeout(showTimeout);
			showTimeout = null;
		}
		isVisible = false;
	}
</script>

<div
	class="lumi-tooltip"
	role="tooltip"
	aria-label={text || 'Tooltip'}
	onmouseenter={showTooltip}
	onmouseleave={hideTooltip}
>
	{#if children}
		{@render children()}
	{/if}

	{#if isVisible}
		<div class={tooltipClasses()} transition:fade={{ duration: transitionDuration }}>
			{#if content}
				{@render content()}
			{:else}
				{text}
			{/if}
		</div>
	{/if}
</div>

<style>
	.lumi-tooltip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.lumi-tooltip__content {
		position: absolute;
		z-index: var(--lumi-z-tooltip);
		background: var(--tooltip-bg, var(--lumi-color-gray-900));
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		font-size: var(--lumi-font-size-xs);
		border-radius: var(--lumi-radius-md);
		max-width: 14rem;
		color: var(--lumi-color-text-inverse);
		white-space: nowrap;
		pointer-events: none;
		font-family: var(--lumi-font-family-sans);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-tight);
		box-shadow: var(--lumi-shadow-lg);
	}

	/* Position Variants con flechas */
	.lumi-tooltip--top {
		bottom: calc(100% + var(--lumi-space-sm));
		left: 50%;
		transform: translateX(-50%);
	}

	.lumi-tooltip--top::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 4px solid transparent;
		border-top-color: var(--tooltip-bg, var(--lumi-color-gray-900));
	}

	.lumi-tooltip--bottom {
		top: calc(100% + var(--lumi-space-sm));
		left: 50%;
		transform: translateX(-50%);
	}

	.lumi-tooltip--bottom::after {
		content: '';
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 4px solid transparent;
		border-bottom-color: var(--tooltip-bg, var(--lumi-color-gray-900));
	}

	.lumi-tooltip--left {
		right: calc(100% + var(--lumi-space-sm));
		top: 50%;
		transform: translateY(-50%);
	}

	.lumi-tooltip--left::after {
		content: '';
		position: absolute;
		left: 100%;
		top: 50%;
		transform: translateY(-50%);
		border: 4px solid transparent;
		border-left-color: var(--tooltip-bg, var(--lumi-color-gray-900));
	}

	.lumi-tooltip--right {
		left: calc(100% + var(--lumi-space-sm));
		top: 50%;
		transform: translateY(-50%);
	}

	.lumi-tooltip--right::after {
		content: '';
		position: absolute;
		right: 100%;
		top: 50%;
		transform: translateY(-50%);
		border: 4px solid transparent;
		border-right-color: var(--tooltip-bg, var(--lumi-color-gray-900));
	}

	/* Color Variants - usando CSS custom properties */
	.lumi-tooltip--primary {
		--tooltip-bg: var(--lumi-color-primary);
	}

	.lumi-tooltip--secondary {
		--tooltip-bg: var(--lumi-color-secondary);
	}

	.lumi-tooltip--success {
		--tooltip-bg: var(--lumi-color-success);
	}

	.lumi-tooltip--warning {
		--tooltip-bg: var(--lumi-color-warning);
	}

	.lumi-tooltip--danger {
		--tooltip-bg: var(--lumi-color-danger);
	}

	.lumi-tooltip--info {
		--tooltip-bg: var(--lumi-color-info);
	}
</style>
