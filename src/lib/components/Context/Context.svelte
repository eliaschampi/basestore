<script lang="ts">
	import type { Snippet } from "svelte";
	import { onMount } from "svelte";
	import { scale } from "svelte/transition";
	import type { ContextProps } from "./types";

	interface Props extends ContextProps {
		children?: Snippet<[{ data: unknown }]>;
	}

	const {
		size = "md",
		closeOnClick = true,
		closeOnScroll = true,
		itemSelector = ".lumi-context-item",
		maxHeight = 400,
		viewportPadding = 16,
		class: className = "",
		onopen,
		onclose,
		children
	}: Props = $props();

	let contextMenu: HTMLDivElement | undefined = $state();
	let show = $state(false);
	let isPositioned = $state(false);
	let top = $state(0);
	let left = $state(0);
	let contextData = $state<unknown>(null);

	const contextClasses = $derived(() => {
		return [
			"lumi-context",
			`lumi-context--${size}`,
			show && isPositioned && "lumi-context--visible",
			className
		]
			.filter(Boolean)
			.join(" ");
	});

	const contextStyle = $derived(() => ({
		top: `${top}px`,
		left: `${left}px`,
		maxHeight: `${maxHeight}px`
	}));

	export function open(event: MouseEvent, data?: unknown): void {
		event.preventDefault();
		event.stopPropagation();

		contextData = data;
		show = true;
		isPositioned = false;

		// Wait for DOM update and calculate position
		setTimeout(() => {
			if (contextMenu) {
				const { clientX, clientY } = event;
				const { offsetWidth, offsetHeight } = contextMenu;

				// Calculate position to keep menu within viewport
				const maxLeft = window.innerWidth - offsetWidth - viewportPadding;
				const maxTop = window.innerHeight - offsetHeight - viewportPadding;

				left = Math.min(clientX, maxLeft);
				top = Math.min(clientY, maxTop);

				// Small delay to ensure smooth animation
				setTimeout(() => {
					isPositioned = true;

					// Focus the menu for keyboard navigation
					contextMenu?.focus();

					// Add scroll listener if needed
					if (closeOnScroll) {
						window.addEventListener("scroll", close, { passive: true });
					}

					onopen?.(event, data, top, left);
				}, 10);
			}
		}, 0);
	}

	export function close(): void {
		if (!show) return;

		isPositioned = false;

		// Small delay for exit animation
		setTimeout(() => {
			show = false;
			contextData = null;
		}, 150);

		// Remove scroll listener
		if (closeOnScroll) {
			window.removeEventListener("scroll", close);
		}

		onclose?.();
	}

	function handleClick(event: Event): void {
		if (closeOnClick) {
			const target = event.target as HTMLElement;
			if (target.closest(itemSelector)) {
				close();
			}
		}
	}

	function handleKeydown(event: KeyboardEvent): void {
		switch (event.key) {
			case "Escape":
				event.preventDefault();
				close();
				break;
			case "ArrowDown":
				event.preventDefault();
				focusNextItem(1);
				break;
			case "ArrowUp":
				event.preventDefault();
				focusNextItem(-1);
				break;
		}
	}

	function focusNextItem(direction: number): void {
		if (!contextMenu) return;

		const items = contextMenu.querySelectorAll(itemSelector);
		const currentIndex = Array.from(items).findIndex((item) => item === document.activeElement);

		let nextIndex = currentIndex + direction;
		if (nextIndex < 0) nextIndex = items.length - 1;
		if (nextIndex >= items.length) nextIndex = 0;

		const nextItem = items[nextIndex] as HTMLElement;
		nextItem?.focus();
	}

	function handleClickOutside(event: Event): void {
		if (show && contextMenu && !contextMenu.contains(event.target as Node)) {
			close();
		}
	}

	onMount(() => {
		document.addEventListener("click", handleClickOutside);
		document.addEventListener("contextmenu", handleClickOutside);

		return () => {
			document.removeEventListener("click", handleClickOutside);
			document.removeEventListener("contextmenu", handleClickOutside);
			if (closeOnScroll) {
				window.removeEventListener("scroll", close);
			}
		};
	});
</script>

{#if show}
	<div
		bind:this={contextMenu}
		class={contextClasses()}
		style="top: {contextStyle().top}; left: {contextStyle().left}; max-height: {contextStyle()
			.maxHeight}"
		tabindex="-1"
		role="menu"
		transition:scale={{ duration: 150, start: 0.95 }}
		onkeydown={handleKeydown}
		onclick={handleClick}
	>
		{#if children}
			{@render children({ data: contextData })}
		{/if}
	</div>
{/if}

<style>
	.lumi-context {
		position: fixed;
		z-index: var(--lumi-z-dropdown);
		background: var(--lumi-color-surface);
		border-radius: var(--lumi-radius-2xl);
		padding: var(--lumi-space-xs);
		min-width: 12rem;
		max-width: 20rem;
		box-shadow: var(--lumi-shadow-md);
		border: 1px solid var(--lumi-color-border-light);
		outline: none;
		overflow-y: auto;
		opacity: 0;
		transform: scale(0.95);
		transition:
			opacity 0.15s ease,
			transform 0.15s ease;
	}

	.lumi-context--visible {
		opacity: 1;
		transform: scale(1);
	}

	.lumi-context:focus {
		outline: none;
	}

	.lumi-context::-webkit-scrollbar {
		width: 6px;
	}

	.lumi-context::-webkit-scrollbar-track {
		background: var(--lumi-color-background);
		border-radius: var(--lumi-radius-base);
	}

	.lumi-context::-webkit-scrollbar-thumb {
		background: var(--lumi-color-border-strong);
		border-radius: var(--lumi-radius-base);
	}

	.lumi-context::-webkit-scrollbar-thumb:hover {
		background: var(--lumi-color-text-muted);
	}
	.lumi-context--sm {
		min-width: 150px;
	}

	.lumi-context--md {
		min-width: 200px;
	}

	.lumi-context--lg {
		min-width: 250px;
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-context {
			transition: none;
		}
	}
</style>
