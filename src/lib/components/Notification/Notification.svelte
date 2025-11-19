<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { Icon } from '../Icon';
	import type { NotificationProps } from './types';

	let {
		type = 'primary',
		title = '',
		message = '',
		closable = true,
		duration = 0,
		active = $bindable(true),
		class: className = '',
		onclose
	}: NotificationProps = $props();

	const iconMap: Record<string, string> = {
		success: 'checkCircle',
		warning: 'alertTriangle',
		error: 'xCircle',
		info: 'info',
		primary: 'bell'
	};

	const classes = $derived(
		['lumi-notification', `lumi-notification--${type}`, className].filter(Boolean).join(' ')
	);

	$effect(() => {
		if (active && duration > 0) {
			const timer = setTimeout(() => {
				handleClose();
			}, duration);
			return () => clearTimeout(timer);
		}
	});

	const handleClose = () => {
		active = false;
		onclose?.();
	};
</script>

{#if active}
	<div
		class={classes}
		role="alert"
		aria-live="polite"
		transition:fly={{ y: 20, duration: 300, easing: cubicOut }}
	>
		<!-- Icon -->
		<div class="lumi-notification__icon">
			<Icon icon={iconMap[type]} size="md" />
		</div>

		<!-- Content -->
		<div class="lumi-notification__content">
			{#if title}
				<h4 class="lumi-notification__title">{title}</h4>
			{/if}
			{#if message}
				<p class="lumi-notification__text">{message}</p>
			{/if}
		</div>

		<!-- Close button -->
		{#if closable}
			<button
				type="button"
				class="lumi-notification__close"
				aria-label="Close notification"
				onclick={handleClose}
			>
				<Icon icon="x" size="sm" />
			</button>
		{/if}
	</div>
{/if}

<style>
	/* ============================================================================
	 * NOTIFICATION COMPONENT - Toast notifications
	 * ============================================================================ */

	.lumi-notification {
		display: flex;
		align-items: flex-start;
		gap: var(--lumi-space-md);
		min-width: 320px;
		max-width: 480px;
		padding: var(--lumi-space-md);
		background: var(--lumi-color-surface);
		border: 1px solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-lg);
		box-shadow: var(--lumi-shadow-lg);
		pointer-events: auto;
		cursor: default;
		position: relative;
		overflow: hidden;
	}

	/* Type variants with left border accents */
	.lumi-notification--success {
		border-left: 4px solid var(--lumi-color-success);
	}

	.lumi-notification--success .lumi-notification__icon {
		color: var(--lumi-color-success);
		background-color: var(--lumi-color-success-bg);
	}

	.lumi-notification--warning {
		border-left: 4px solid var(--lumi-color-warning);
	}

	.lumi-notification--warning .lumi-notification__icon {
		color: var(--lumi-color-warning);
		background-color: var(--lumi-color-warning-bg);
	}

	.lumi-notification--error {
		border-left: 4px solid var(--lumi-color-danger);
	}

	.lumi-notification--error .lumi-notification__icon {
		color: var(--lumi-color-danger);
		background-color: var(--lumi-color-danger-bg);
	}

	.lumi-notification--info {
		border-left: 4px solid var(--lumi-color-info);
	}

	.lumi-notification--info .lumi-notification__icon {
		color: var(--lumi-color-info);
		background-color: var(--lumi-color-info-bg);
	}

	.lumi-notification--primary {
		border-left: 4px solid var(--lumi-color-primary);
	}

	.lumi-notification--primary .lumi-notification__icon {
		color: var(--lumi-color-primary);
		background-color: var(--lumi-color-primary-bg);
	}

	/* Icon container */
	.lumi-notification__icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: var(--lumi-radius-full);
	}

	/* Content area */
	.lumi-notification__content {
		flex: 1;
		min-width: 0;
		padding-top: 2px;
	}

	/* Title */
	.lumi-notification__title {
		margin: 0;
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-tight);
		margin-bottom: 4px;
		font-size: var(--lumi-font-size-base);
	}

	/* Message text */
	.lumi-notification__text {
		margin: 0;
		color: var(--lumi-color-text-muted);
		line-height: var(--lumi-line-height-normal);
		font-size: var(--lumi-font-size-sm);
		word-wrap: break-word;
	}

	/* Close button */
	.lumi-notification__close {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: var(--lumi-radius-md);
		color: var(--lumi-color-text-muted);
		cursor: pointer;
		transition: all 0.2s ease;
		margin-top: 2px;
	}

	.lumi-notification__close:hover {
		background-color: var(--lumi-color-background-hover);
		color: var(--lumi-color-text);
	}

	.lumi-notification__close:focus-visible {
		outline: 2px solid var(--lumi-color-primary);
		outline-offset: 2px;
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.lumi-notification {
			min-width: auto;
			width: 100%;
			border-radius: var(--lumi-radius-lg);
		}
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.lumi-notification {
			transition: none;
		}
	}
</style>
