<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { AlertProps } from './types';

	type Props = AlertProps & {
		children?: Snippet;
		onclose?: (event: MouseEvent) => void;
	};

	let {
		type = 'info',
		title,
		icon = true,
		closable = false,
		class: className,
		onclose,
		children,
		active = $bindable(true)
	}: Props = $props();

	const alertClasses = $derived(() => {
		const classes = ['lumi-alert', `lumi-alert--${type}`];
		if (className) classes.push(className);
		return classes.join(' ');
	});

	function handleClose(event: MouseEvent) {
		active = false;
		if (onclose) {
			onclose(event);
		}
	}
</script>

{#if active}
	<div class={alertClasses()} transition:fade={{ duration: 200 }}>
		<!-- Alert content -->
		<div class="lumi-alert__content">
			<!-- Icon -->
			{#if icon}
				<div class="lumi-alert__icon">
					<!-- Icon placeholder - will be replaced with actual icon component -->
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						{#if type === 'success'}
							<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
							<polyline points="22 4 12 14.01 9 11.01"></polyline>
						{:else if type === 'warning'}
							<path
								d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
							></path>
							<line x1="12" y1="9" x2="12" y2="13"></line>
							<line x1="12" y1="17" x2="12.01" y2="17"></line>
						{:else if type === 'danger'}
							<circle cx="12" cy="12" r="10"></circle>
							<line x1="15" y1="9" x2="9" y2="15"></line>
							<line x1="9" y1="9" x2="15" y2="15"></line>
						{:else}
							<circle cx="12" cy="12" r="10"></circle>
							<line x1="12" y1="16" x2="12" y2="12"></line>
							<line x1="12" y1="8" x2="12.01" y2="8"></line>
						{/if}
					</svg>
				</div>
			{/if}

			<!-- Content wrapper -->
			<div class="lumi-alert__body">
				<!-- Title -->
				{#if title}
					<h4 class="lumi-alert__title">{title}</h4>
				{/if}

				<!-- Message -->
				<div class="lumi-alert__message">
					{#if children}
						{@render children()}
					{/if}
				</div>
			</div>
		</div>

		<!-- Close button -->
		{#if closable}
			<button
				class="lumi-alert__close"
				type="button"
				aria-label="Close alert"
				onclick={handleClose}
			>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>
		{/if}
	</div>
{/if}

<style>
	.lumi-alert {
		/* Base alert styles */
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-md);
		border-radius: var(--lumi-radius-2xl);
		border: 2px solid transparent;
		background: var(--lumi-color-surface);
		transition: var(--lumi-transition-all);
		box-shadow: var(--lumi-shadow-sm);
	}

	.lumi-alert:hover {
		transform: translateY(-1px);
		box-shadow: var(--lumi-shadow-md);
	}

	/* Icon styling */
	.lumi-alert__icon {
		flex-shrink: 0;
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Content layout */
	.lumi-alert__content {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		flex: 1;
		min-width: 0;
	}

	/* Body content */
	.lumi-alert__body {
		flex: 1;
		min-width: 0;
	}

	/* Title styling */
	.lumi-alert__title {
		font-size: var(--lumi-font-size-base);
		font-weight: var(--lumi-font-weight-semibold);
		line-height: var(--lumi-line-height-tight);
		margin: 0 0 var(--lumi-space-xs) 0;
		color: var(--lumi-color-text);
	}

	/* Message styling */
	.lumi-alert__message {
		font-size: var(--lumi-font-size-sm);
		line-height: var(--lumi-line-height-relaxed);
		margin: 0;
		color: var(--lumi-color-text-muted);
	}

	/* Close button */
	.lumi-alert__close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-xl);
		height: var(--lumi-space-xl);
		padding: 0;
		background: transparent;
		border: none;
		border-radius: var(--lumi-radius-full);
		color: var(--lumi-color-text-muted);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		flex-shrink: 0;
		opacity: 0.7;
	}

	.lumi-alert__close:hover {
		opacity: 1;
		background: var(--lumi-color-background-hover);
		color: var(--lumi-color-text);
		transform: scale(1.1);
	}

	.lumi-alert__close:focus-visible {
		outline: 2px solid var(--lumi-color-primary);
		outline-offset: var(--lumi-space-xs);
	}

	/* Color variants */
	.lumi-alert--primary {
		background: var(--lumi-color-primary-bg);
		border-color: color-mix(in srgb, var(--lumi-color-primary) 20%, transparent);
	}

	.lumi-alert--primary .lumi-alert__icon {
		color: var(--lumi-color-primary);
	}

	.lumi-alert--secondary {
		background: color-mix(in srgb, var(--lumi-color-secondary) 10%, transparent);
		border-color: color-mix(in srgb, var(--lumi-color-secondary) 20%, transparent);
	}

	.lumi-alert--secondary .lumi-alert__icon {
		color: var(--lumi-color-secondary);
	}

	.lumi-alert--success {
		background: var(--lumi-color-success-bg);
		border-color: color-mix(in srgb, var(--lumi-color-success) 20%, transparent);
	}

	.lumi-alert--success .lumi-alert__icon {
		color: var(--lumi-color-success);
	}

	.lumi-alert--warning {
		background: var(--lumi-color-warning-bg);
		border-color: color-mix(in srgb, var(--lumi-color-warning) 20%, transparent);
	}

	.lumi-alert--warning .lumi-alert__icon {
		color: var(--lumi-color-warning);
	}

	.lumi-alert--danger {
		background: var(--lumi-color-danger-bg);
		border-color: color-mix(in srgb, var(--lumi-color-danger) 20%, transparent);
	}

	.lumi-alert--danger .lumi-alert__icon {
		color: var(--lumi-color-danger);
	}

	.lumi-alert--info {
		background: var(--lumi-color-info-bg);
		border-color: color-mix(in srgb, var(--lumi-color-info) 20%, transparent);
	}

	.lumi-alert--info .lumi-alert__icon {
		color: var(--lumi-color-info);
	}
</style>
