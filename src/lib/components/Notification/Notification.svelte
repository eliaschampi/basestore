<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';
	import { Icon } from '../Icon';
	import type { NotificationProps, NotificationType } from './types';

	let {
		type = 'primary',
		title = '',
		message = '',
		closable = true,
		position = 'top-right',
		duration = 0,
		active = $bindable(true),
		class: className = '',
		onclose
	}: NotificationProps = $props();

	const iconMap: Record<NotificationType, string> = {
		success: 'checkCircle',
		warning: 'alertTriangle',
		error: 'xCircle',
		info: 'info',
		primary: 'bell'
	};

	const classes = $derived(() => {
		const classList = [
			'lumi-notification',
			`lumi-notification--${type}`,
			`lumi-notification--position-${position}`
		];
		if (className) classList.push(className);
		return classList.join(' ');
	});

	$effect(() => {
		if (!active || duration <= 0) return;

		const timer = setTimeout(() => {
			handleClose();
		}, duration);

		return () => {
			clearTimeout(timer);
		};
	});

	function handleClose() {
		if (!active) return;
		active = false;
		onclose?.();
	}
</script>

{#if active}
	<div
		class={classes()}
		role="status"
		aria-live="polite"
		aria-atomic="true"
		data-position={position}
		transition:fly={{ y: 12, duration: 250, easing: cubicOut }}
	>
		<div class="lumi-notification__icon">
			<Icon icon={iconMap[type]} size="md" />
		</div>

		<div class="lumi-notification__content">
			{#if title}
				<h4 class="lumi-notification__title">{title}</h4>
			{/if}
			{#if message}
				<p class="lumi-notification__text">{message}</p>
			{/if}
		</div>

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
	.lumi-notification {
		--notification-color: var(--lumi-color-primary);
		--notification-bg: var(--lumi-color-primary-bg);

		display: flex;
		align-items: flex-start;
		gap: var(--lumi-space-md);
		inline-size: min(100%, calc(var(--lumi-space-6xl) * 5));
		min-inline-size: min(100%, calc(var(--lumi-space-6xl) * 3));
		padding: var(--lumi-space-md);
		background: var(--lumi-color-surface-overlay);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-inline-start: var(--lumi-space-2xs) solid var(--notification-color);
		border-radius: var(--lumi-radius-2xl);
		box-shadow: var(--lumi-shadow-lg);
		pointer-events: auto;
		position: relative;
		overflow: hidden;
		transition: var(--lumi-transition-all);
		backdrop-filter: blur(var(--lumi-blur-md));
		-webkit-backdrop-filter: blur(var(--lumi-blur-md));
	}

	.lumi-notification--success {
		--notification-color: var(--lumi-color-success);
		--notification-bg: var(--lumi-color-success-bg);
	}

	.lumi-notification--warning {
		--notification-color: var(--lumi-color-warning);
		--notification-bg: var(--lumi-color-warning-bg);
	}

	.lumi-notification--error {
		--notification-color: var(--lumi-color-danger);
		--notification-bg: var(--lumi-color-danger-bg);
	}

	.lumi-notification--info {
		--notification-color: var(--lumi-color-info);
		--notification-bg: var(--lumi-color-info-bg);
	}

	.lumi-notification__icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-xxl);
		height: var(--lumi-space-xxl);
		border-radius: var(--lumi-radius-full);
		color: var(--notification-color);
		background-color: var(--notification-bg);
	}

	.lumi-notification__content {
		flex: 1;
		min-width: 0;
		padding-top: var(--lumi-space-2xs);
	}

	.lumi-notification__title {
		margin: 0;
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-tight);
		margin-bottom: var(--lumi-space-2xs);
		font-size: var(--lumi-font-size-base);
	}

	.lumi-notification__text {
		margin: 0;
		color: var(--lumi-color-text-muted);
		line-height: var(--lumi-line-height-normal);
		font-size: var(--lumi-font-size-sm);
		word-wrap: break-word;
	}

	.lumi-notification__close {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
		padding: 0;
		background: transparent;
		border: none;
		border-radius: var(--lumi-radius-md);
		color: var(--lumi-color-text-muted);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		margin-top: var(--lumi-space-2xs);
	}

	.lumi-notification__close:hover {
		background-color: var(--lumi-color-background-hover);
		color: var(--lumi-color-text);
	}

	.lumi-notification__close:focus-visible {
		outline: var(--lumi-border-width-thick) solid var(--lumi-color-primary);
		outline-offset: var(--lumi-space-2xs);
	}

	:global(.lumi-notification--temporal) {
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--lumi-color-primary-bg) 65%, var(--lumi-color-surface) 35%),
			var(--lumi-color-surface)
		);
		box-shadow: var(--lumi-shadow-xl);
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-notification {
			transition: none;
		}
	}
</style>
