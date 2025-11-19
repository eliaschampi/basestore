<script lang="ts">
	import type { Snippet } from "svelte";
	import { getContext } from "svelte";
	import Icon from "../Icon/Icon.svelte";

	interface Props {
		children?: Snippet;
		icon?: string;
		danger?: boolean;
		disabled?: boolean;
		class?: string;
		onclick?: () => void;
	}

	const {
		children,
		icon,
		danger = false,
		disabled = false,
		class: className = "",
		onclick
	}: Props = $props();

	const closeDropdown = getContext<() => void>("dropdownClose");

	const itemClasses = $derived(() => {
		return [
			"lumi-dropdown-item",
			disabled && "lumi-dropdown-item--disabled",
			danger && "lumi-dropdown-item--danger",
			className
		]
			.filter(Boolean)
			.join(" ");
	});

	function handleClick(): void {
		if (disabled) return;
		closeDropdown?.();
		onclick?.();
	}
</script>

<button
	type="button"
	class={itemClasses()}
	role="menuitem"
	tabindex={disabled ? -1 : 0}
	onclick={handleClick}
	onkeydown={(e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleClick();
		}
	}}
>
	{#if icon}
		<Icon {icon} size="sm" />
	{/if}
	{#if children}
		{@render children()}
	{/if}
</button>

<style>
	.lumi-dropdown-item {
		width: 100%;
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		user-select: none;
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-base);
		line-height: var(--lumi-line-height-normal);
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		background: transparent;
		border: none;
		border-radius: var(--lumi-radius-md);
		text-align: left;
	}

	.lumi-dropdown-item:hover:not(.lumi-dropdown-item--disabled) {
		background: var(--lumi-color-background-hover);
	}

	.lumi-dropdown-item:focus {
		outline: none;
		background: var(--lumi-color-background-hover);
		box-shadow: inset 0 0 0 2px var(--lumi-color-primary);
	}

	.lumi-dropdown-item--disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}

	.lumi-dropdown-item--danger {
		color: var(--lumi-color-danger);
	}

	.lumi-dropdown-item--danger:hover:not(.lumi-dropdown-item--disabled) {
		background: color-mix(in srgb, var(--lumi-color-danger) 10%, transparent);
	}
</style>
