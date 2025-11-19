<script lang="ts">
	import { fade } from "svelte/transition";
	import { Icon } from "../Icon";
	import type { NotificationProps } from "./types";

	let {
		type = "primary",
		title = "",
		message = "",
		closable = true,
		duration = 0,
		active = $bindable(true),
		class: className = "",
		onclose
	}: NotificationProps = $props();

	const iconMap: Record<string, string> = {
		success: "checkCircle",
		warning: "alertTriangle",
		error: "xCircle",
		info: "info",
		primary: "bell"
	};

	const classes = $derived(
		["lumi-notification", `lumi-notification--${type}`, className].filter(Boolean).join(" ")
	);

	$effect(() => {
		if (active && duration > 0) {
			const timer = setTimeout(() => {
				active = false;
				onclose?.();
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
	<div class={classes} role="alert" aria-live="polite" transition:fade={{ duration: 200 }}>
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
		gap: var(--lumi-space-sm);
		min-width: 320px;
		max-width: 480px;
		padding: var(--lumi-space-md);
		background: var(--lumi-color-surface);
		border: 1px solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-2xl);
		box-shadow: var(--lumi-shadow-md);
		pointer-events: auto;
		cursor: pointer;
		transition: all var(--lumi-transition-base);
		position: relative;
	}

	.lumi-notification:hover {
		opacity: 1;
		background: var(--lumi-color-surface);
		box-shadow: var(--lumi-shadow-lg);
		z-index: 1;
		border-left-width: 6px;
	}

	/* Type variants with left border accents */
	.lumi-notification--success {
		border-left: 4px solid var(--lumi-color-success);
		background: color-mix(in srgb, var(--lumi-color-surface) 95%, var(--lumi-color-success) 5%);
	}

	.lumi-notification--success .lumi-notification__icon {
		color: var(--lumi-color-success);
		background: color-mix(in srgb, var(--lumi-color-success) 10%, transparent);
	}

	.lumi-notification--warning {
		border-left: 4px solid var(--lumi-color-warning);
		background: color-mix(in srgb, var(--lumi-color-surface) 95%, var(--lumi-color-warning) 5%);
	}

	.lumi-notification--warning .lumi-notification__icon {
		color: var(--lumi-color-warning);
		background: color-mix(in srgb, var(--lumi-color-warning) 10%, transparent);
	}

	.lumi-notification--error {
		border-left: 4px solid var(--lumi-color-danger);
		background: color-mix(in srgb, var(--lumi-color-surface) 95%, var(--lumi-color-danger) 5%);
	}

	.lumi-notification--error .lumi-notification__icon {
		color: var(--lumi-color-danger);
		background: color-mix(in srgb, var(--lumi-color-danger) 10%, transparent);
	}

	.lumi-notification--info {
		border-left: 4px solid var(--lumi-color-info);
		background: color-mix(in srgb, var(--lumi-color-surface) 95%, var(--lumi-color-info) 5%);
	}

	.lumi-notification--info .lumi-notification__icon {
		color: var(--lumi-color-info);
		background: color-mix(in srgb, var(--lumi-color-info) 10%, transparent);
	}

	.lumi-notification--primary {
		border-left: 4px solid var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-surface) 95%, var(--lumi-color-primary) 5%);
	}

	.lumi-notification--primary .lumi-notification__icon {
		color: var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 10%, transparent);
	}

	/* Icon container */
	.lumi-notification__icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		transition: all var(--lumi-transition-base);
		border-radius: var(--lumi-radius-lg);
		padding: var(--lumi-space-xs);
	}

	/* Content area */
	.lumi-notification__content {
		flex: 1;
		min-width: 0;
	}

	/* Title */
	.lumi-notification__title {
		margin: 0;
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-tight);
		margin-bottom: var(--lumi-space-sm);
	}

	/* Message text */
	.lumi-notification__text {
		margin: 0;
		color: var(--lumi-color-text-muted);
		line-height: var(--lumi-line-height-relaxed);
		word-wrap: break-word;
		overflow-wrap: break-word;
		hyphens: auto;
	}

	/* Close button */
	.lumi-notification__close {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
		padding: 0;
		background: none;
		border: none;
		border-radius: var(--lumi-radius-full);
		color: var(--lumi-color-text-muted);
		cursor: pointer;
		transition: all var(--lumi-transition-base);
	}

	.lumi-notification__close:hover {
		background: var(--lumi-color-surface);
		color: var(--lumi-color-text);
	}

	.lumi-notification__close:focus-visible {
		outline: 2px solid var(--lumi-color-primary);
		outline-offset: 2px;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.lumi-notification {
			min-width: auto;
			max-width: none;
			width: 100%;
		}
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.lumi-notification {
			transition: none;
		}
	}
</style>
