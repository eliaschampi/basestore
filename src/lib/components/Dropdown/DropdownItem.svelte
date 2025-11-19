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
		<div class="lumi-dropdown-item__icon">
			<Icon {icon} size="16px" />
		</div>
	{/if}
	
	<span class="lumi-dropdown-item__content">
		{#if children}
			{@render children()}
		{/if}
	</span>
</button>

<style>
	.lumi-dropdown-item {
		width: 100%;
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		cursor: pointer;
		transition: all 0.1s ease;
		user-select: none;
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-sm);
		line-height: var(--lumi-line-height-normal);
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
		background: transparent;
		border: none;
		border-radius: var(--lumi-radius-sm);
		text-align: left;
		text-decoration: none;
	}

	.lumi-dropdown-item:hover:not(.lumi-dropdown-item--disabled) {
		background: var(--lumi-color-background-hover);
		color: var(--lumi-color-text);
	}

	.lumi-dropdown-item:focus-visible {
		outline: none;
		background: var(--lumi-color-background-hover);
		box-shadow: inset 0 0 0 2px var(--lumi-color-primary);
	}
	
	.lumi-dropdown-item:active:not(.lumi-dropdown-item--disabled) {
		transform: scale(0.98);
	}

	.lumi-dropdown-item__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--lumi-color-text-muted);
		flex-shrink: 0;
		width: 16px;
		height: 16px;
	}

	.lumi-dropdown-item:hover .lumi-dropdown-item__icon {
		color: inherit;
	}

	.lumi-dropdown-item__content {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* States */
	.lumi-dropdown-item--disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.lumi-dropdown-item--danger {
		color: var(--lumi-color-danger);
	}

	.lumi-dropdown-item--danger .lumi-dropdown-item__icon {
		color: var(--lumi-color-danger);
	}

	.lumi-dropdown-item--danger:hover:not(.lumi-dropdown-item--disabled) {
		background: var(--lumi-color-danger-bg);
		color: var(--lumi-color-danger);
	}
</style>
