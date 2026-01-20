<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import Icon from '../Icon/Icon.svelte';
	import type { DialogProps } from './types';

	interface Props extends DialogProps {
		children?: Snippet;
		header?: Snippet;
		footer?: Snippet;
	}

	let {
		open = $bindable(false),
		title = '',
		size = 'md',
		persistent = false,
		scrollable = false,
		fullScreen = false,
		hideClose = false,
		closeLabel = 'Close dialog',
		closeOnEscape = true,
		class: _className = '',
		onclose,
		onopen,
		onafteropen,
		onafterclose,
		children,
		header,
		footer
	}: Props = $props();

	let dialogElement: HTMLDivElement | undefined = $state();
	let previousActiveElement: HTMLElement | null = null;
	let bodyOverflow = '';

	const uniqueId = Math.random().toString(36).substring(2, 11);
	const titleId = `lumi-dialog-title-${uniqueId}`;
	const contentId = `lumi-dialog-content-${uniqueId}`;

	const dialogClasses = $derived(() => {
		return [
			'lumi-dialog',
			`lumi-dialog--${size}`,
			scrollable && 'lumi-dialog--scrollable',
			fullScreen && 'lumi-dialog--full-screen'
		]
			.filter(Boolean)
			.join(' ');
	});

	const overlayClasses = $derived(
		['lumi-dialog-overlay', persistent && 'lumi-dialog-overlay--persistent']
			.filter(Boolean)
			.join(' ')
	);

	function handleClose(): void {
		if (!persistent) {
			open = false;
			onclose?.();
		}
	}

	function handleOverlayClick(): void {
		if (!persistent) {
			handleClose();
		}
	}

	function handleEscapeKey(event: KeyboardEvent): void {
		if (event.key === 'Escape' && closeOnEscape && open) {
			handleClose();
		}
	}

	function trapFocus(event: KeyboardEvent): void {
		if (!dialogElement || event.key !== 'Tab') return;

		const focusableElements = dialogElement.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);

		const firstElement = focusableElements[0] as HTMLElement;
		const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

		if (event.shiftKey) {
			if (document.activeElement === firstElement) {
				event.preventDefault();
				lastElement?.focus();
			}
		} else {
			if (document.activeElement === lastElement) {
				event.preventDefault();
				firstElement?.focus();
			}
		}
	}

	function lockBodyScroll(): void {
		bodyOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
	}

	function unlockBodyScroll(): void {
		document.body.style.overflow = bodyOverflow;
	}

	function focusDialog(): void {
		setTimeout(() => {
			if (dialogElement) {
				const firstFocusable = dialogElement.querySelector(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
				) as HTMLElement;

				if (firstFocusable) {
					firstFocusable.focus();
				} else {
					dialogElement.focus();
				}
			}
		}, 0);
	}

	$effect(() => {
		if (open) {
			previousActiveElement = document.activeElement as HTMLElement;
			lockBodyScroll();
			document.addEventListener('keydown', handleEscapeKey);
			document.addEventListener('keydown', trapFocus);
			onopen?.();
			focusDialog();
			setTimeout(() => onafteropen?.(), 300);
		} else {
			document.removeEventListener('keydown', handleEscapeKey);
			document.removeEventListener('keydown', trapFocus);
			unlockBodyScroll();
			if (previousActiveElement) {
				previousActiveElement.focus();
				previousActiveElement = null;
			}
			setTimeout(() => onafterclose?.(), 300);
		}
	});

	onMount(() => {
		return () => {
			document.removeEventListener('keydown', handleEscapeKey);
			document.removeEventListener('keydown', trapFocus);
			unlockBodyScroll();
		};
	});
</script>

{#if open}
	<div
		class={overlayClasses}
		transition:fade={{ duration: 200 }}
		onclick={handleOverlayClick}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleOverlayClick();
			}
		}}
		role="presentation"
	>
		<div
			bind:this={dialogElement}
			class={dialogClasses}
			transition:scale={{ duration: 200, start: 0.95 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={contentId}
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Dialog Header -->
			{#if header || title || !hideClose}
				<header class="lumi-dialog__header">
					<div class="lumi-dialog__header-content">
						{#if header}
							{@render header()}
						{:else if title}
							<h2 id={titleId} class="lumi-dialog__title">
								{title}
							</h2>
						{/if}
					</div>

					{#if !hideClose}
						<button
							class="lumi-dialog__close"
							type="button"
							aria-label={closeLabel}
							onclick={handleClose}
						>
							<Icon icon="x" size="md" />
						</button>
					{/if}
				</header>
			{/if}

			<!-- Dialog Content -->
			<div id={contentId} class="lumi-dialog__content">
				{#if children}
					{@render children()}
				{/if}
			</div>

			<!-- Dialog Footer -->
			{#if footer}
				<footer class="lumi-dialog__footer">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Dialog Overlay (Backdrop) */
	.lumi-dialog-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		z-index: var(--lumi-z-modal-backdrop);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--lumi-space-md);
		cursor: pointer;
		overflow-y: auto;
	}

	.lumi-dialog-overlay--persistent {
		cursor: default;
	}

	/* Dialog Container */
	.lumi-dialog {
		position: relative;
		background: var(--lumi-color-surface);
		border-radius: var(--lumi-radius-2xl);
		max-height: 90vh;
		width: 100%;
		display: flex;
		flex-direction: column;
		cursor: default;
		z-index: var(--lumi-z-modal);
		box-shadow: var(--lumi-shadow-2xl);
		border: 1px solid var(--lumi-color-border-light);
	}

	.lumi-dialog:focus {
		outline: none;
	}

	/* Size Variants */
	.lumi-dialog--sm {
		max-width: 400px;
	}
	.lumi-dialog--md {
		max-width: 560px;
	}
	.lumi-dialog--lg {
		max-width: 800px;
	}
	.lumi-dialog--xl {
		max-width: 1024px;
	}

	/* Scrollable Content */
	.lumi-dialog--scrollable .lumi-dialog__content {
		overflow-y: auto;
		max-height: 60vh;
	}

	/* Full Screen Variant */
	.lumi-dialog--full-screen {
		max-width: none;
		max-height: none;
		width: 100vw;
		height: 100vh;
		border-radius: 0;
	}

	.lumi-dialog--full-screen .lumi-dialog__content {
		flex: 1;
		overflow-y: auto;
	}

	/* Dialog Header */
	.lumi-dialog__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--lumi-space-lg) var(--lumi-space-xl);
		border-bottom: 1px solid var(--lumi-color-border-light);
		flex-shrink: 0;
	}

	.lumi-dialog__header-content {
		flex: 1;
		min-width: 0;
	}

	/* Dialog Title */
	.lumi-dialog__title {
		margin: 0;
		font-size: var(--lumi-font-size-xl);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-tight);
	}

	/* Dialog Close Button */
	.lumi-dialog__close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		margin-left: var(--lumi-space-md);
		background: transparent;
		border: none;
		border-radius: var(--lumi-radius-full);
		color: var(--lumi-color-text-muted);
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.lumi-dialog__close:hover {
		background: var(--lumi-color-background-hover);
		color: var(--lumi-color-text);
	}

	.lumi-dialog__close:active {
		transform: scale(0.95);
	}

	/* Dialog Content */
	.lumi-dialog__content {
		flex: 1;
		padding: var(--lumi-space-xl);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-normal);
		overflow-y: auto;
	}

	.lumi-dialog__content::-webkit-scrollbar {
		width: 6px;
	}

	.lumi-dialog__content::-webkit-scrollbar-track {
		background: transparent;
	}

	.lumi-dialog__content::-webkit-scrollbar-thumb {
		background: var(--lumi-color-border);
		border-radius: var(--lumi-radius-full);
	}

	/* Dialog Footer */
	.lumi-dialog__footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-lg) var(--lumi-space-xl);
		border-top: 1px solid var(--lumi-color-border-light);
		flex-shrink: 0;
		background: var(--lumi-color-background-hover);
		border-bottom-left-radius: var(--lumi-radius-2xl);
		border-bottom-right-radius: var(--lumi-radius-2xl);
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.lumi-dialog-overlay {
			padding: 0;
			align-items: flex-end;
		}

		.lumi-dialog {
			max-width: 100%;
			border-bottom-left-radius: 0;
			border-bottom-right-radius: 0;
			max-height: 90vh;
		}

		.lumi-dialog--full-screen {
			height: 100vh;
			max-height: 100vh;
			border-radius: 0;
		}

		.lumi-dialog__header {
			padding: var(--lumi-space-md) var(--lumi-space-lg);
		}

		.lumi-dialog__content {
			padding: var(--lumi-space-lg);
		}

		.lumi-dialog__footer {
			padding: var(--lumi-space-md) var(--lumi-space-lg);
			flex-direction: column-reverse;
			gap: var(--lumi-space-sm);
		}

		.lumi-dialog__footer :global(.lumi-button) {
			width: 100%;
		}
	}

	/* Reduced Motion Support */
	@media (prefers-reduced-motion: reduce) {
		.lumi-dialog-overlay,
		.lumi-dialog {
			transition-duration: 0.01ms !important;
		}
	}
</style>
