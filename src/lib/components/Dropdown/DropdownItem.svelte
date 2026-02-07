<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getContext } from 'svelte';
	import { resolve } from '$app/paths';
	import Icon from '../Icon/Icon.svelte';

	interface Props {
		children?: Snippet;
		icon?: string;
		href?: string;
		color?: 'danger';
		danger?: boolean;
		disabled?: boolean;
		submit?: boolean;
		class?: string;
		onclick?: () => void;
	}

	const {
		children,
		icon,
		href,
		color,
		danger = false,
		disabled = false,
		submit = false,
		class: className = '',
		onclick
	}: Props = $props();

	const closeDropdown = getContext<() => void>('dropdownClose');

	const isDanger = $derived(danger || color === 'danger');

	const itemClasses = $derived(() => {
		return [
			'lumi-dropdown-item',
			disabled && 'lumi-dropdown-item--disabled',
			isDanger && 'lumi-dropdown-item--danger',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	function handleClick(): void {
		if (disabled) return;
		closeDropdown?.();
		onclick?.();
	}
</script>

{#if href}
	<a
		href={resolve(href as `/`)}
		data-sveltekit-noscroll
		class={itemClasses()}
		role="menuitem"
		tabindex={disabled ? -1 : 0}
		onclick={handleClick}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
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
	</a>
{:else}
	<button
		type={submit ? 'submit' : 'button'}
		class={itemClasses()}
		role="menuitem"
		tabindex={disabled ? -1 : 0}
		onclick={handleClick}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
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
{/if}

<style>
	.lumi-dropdown-item {
		--dropdown-item-hover-bg: color-mix(in srgb, var(--lumi-color-primary) 4%, transparent);
		--dropdown-item-lift: calc(var(--lumi-space-2xs) * -0.25);
		width: 100%;
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		cursor: pointer;
		transition:
			background-color var(--lumi-duration-fast) var(--lumi-easing-default),
			color var(--lumi-duration-fast) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-fast) var(--lumi-easing-default),
			transform var(--lumi-duration-fast) var(--lumi-easing-default);
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
		background: var(--dropdown-item-hover-bg);
		color: var(--lumi-color-text);
		transform: translateY(var(--dropdown-item-lift));
	}

	.lumi-dropdown-item:focus-visible {
		outline: none;
		background: var(--dropdown-item-hover-bg);
		box-shadow: 0 0 0 var(--lumi-border-width-thick)
			color-mix(in srgb, var(--lumi-color-primary) 20%, transparent);
	}

	.lumi-dropdown-item:active:not(.lumi-dropdown-item--disabled) {
		transform: none;
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
		transform: translateY(var(--dropdown-item-lift));
	}

	/* Link styles */
	a.lumi-dropdown-item {
		text-decoration: none;
	}
</style>
