<script lang="ts">
	import type { Snippet } from "svelte";
	import { setContext } from "svelte";
	import { Icon } from "../Icon";
	import type { TabsProps } from "./types";

	interface Props extends TabsProps {
		children?: Snippet;
	}

	let {
		value = $bindable(),
		tabs = [],
		color = "primary",
		position = "horizontal",
		class: className = "",
		children,
		onchange
	}: Props = $props();

	let previousValue = $state<string | number | undefined>(undefined);
	$effect(() => {
		if (value === undefined && tabs.length > 0) {
			const firstEnabledTab = tabs.find((tab) => !tab.disabled);
			if (firstEnabledTab) {
				value = firstEnabledTab.value;
			}
		}
	});

	setContext("tabs", {
		get activeTab() {
			return value;
		}
	});

	const classes = $derived(
		["lumi-tabs", `lumi-tabs--${position}`, `lumi-tabs--${color}`, className]
			.filter(Boolean)
			.join(" ")
	);

	const selectTab = (tabValue: string | number) => {
		if (value === tabValue) return;
		previousValue = value;
		value = tabValue;
		onchange?.(tabValue, previousValue);
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		const enabledTabs = tabs.filter((tab) => !tab.disabled);
		const currentIndex = enabledTabs.findIndex((tab) => tab.value === value);

		let nextIndex = currentIndex;

		if (position === "horizontal") {
			if (event.key === "ArrowLeft") {
				event.preventDefault();
				nextIndex = currentIndex > 0 ? currentIndex - 1 : enabledTabs.length - 1;
			} else if (event.key === "ArrowRight") {
				event.preventDefault();
				nextIndex = currentIndex < enabledTabs.length - 1 ? currentIndex + 1 : 0;
			}
		} else {
			if (event.key === "ArrowUp") {
				event.preventDefault();
				nextIndex = currentIndex > 0 ? currentIndex - 1 : enabledTabs.length - 1;
			} else if (event.key === "ArrowDown") {
				event.preventDefault();
				nextIndex = currentIndex < enabledTabs.length - 1 ? currentIndex + 1 : 0;
			}
		}

		if (nextIndex !== currentIndex) {
			selectTab(enabledTabs[nextIndex].value);
		}
	};
</script>

<div class={classes}>
	<!-- Tab Navigation -->
	<div class="lumi-tabs__nav" role="tablist" aria-orientation={position}>
		{#each tabs as tab, index (tab.value)}
			<button
				type="button"
				role="tab"
				class="lumi-tabs__tab {value === tab.value ? 'lumi-tabs__tab--active' : ''} {tab.disabled
					? 'lumi-tabs__tab--disabled'
					: ''}"
				disabled={tab.disabled}
				aria-selected={value === tab.value}
				aria-disabled={tab.disabled}
				tabindex={value === tab.value ? 0 : -1}
				onclick={() => selectTab(tab.value)}
				onkeydown={handleKeyDown}
			>
				{#if tab.icon}
					<Icon icon={tab.icon} size="md" />
				{/if}
				{#if tab.label}
					<span>{tab.label}</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Tab Content -->
	<div class="lumi-tabs__content" role="tabpanel">
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>

<style>
	/* ============================================================================
	 * TABS COMPONENT - Beautiful Tab Navigation
	 * ============================================================================ */

	.lumi-tabs {
		display: flex;
		flex-direction: column;
		width: 100%;
		--lumi-tabs-color: var(--lumi-color-primary);
	}

	/* Position variants */
	.lumi-tabs--horizontal .lumi-tabs__nav {
		flex-direction: row;
		border-bottom: 1px solid var(--lumi-color-border);
	}

	.lumi-tabs--horizontal .lumi-tabs__tab {
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		flex: 1;
	}

	.lumi-tabs--horizontal .lumi-tabs__tab--active {
		border-bottom-color: var(--lumi-tabs-color);
	}

	.lumi-tabs--vertical {
		flex-direction: row;
	}

	.lumi-tabs--vertical .lumi-tabs__nav {
		flex-direction: column;
		align-items: stretch;
		border-right: 1px solid var(--lumi-color-border);
		min-width: 200px;
	}

	.lumi-tabs--vertical .lumi-tabs__tab {
		border-right: 2px solid transparent;
		margin-right: -2px;
		justify-content: flex-start;
		text-align: left;
		width: 100%;
	}

	.lumi-tabs--vertical .lumi-tabs__tab--active {
		border-right-color: var(--lumi-tabs-color);
		background: var(--lumi-color-surface);
	}

	.lumi-tabs--vertical .lumi-tabs__content {
		flex: 1;
		padding-left: var(--lumi-space-md);
	}

	/* Tab navigation */
	.lumi-tabs__nav {
		align-items: stretch;
		gap: 0;
		margin-bottom: 0;
	}

	/* Individual tab */
	.lumi-tabs__tab {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-xs);
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		font-family: var(--lumi-font-family-sans);
		font-size: var(--lumi-font-size-base);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-tight);
		color: var(--lumi-color-text-muted);
		background: transparent;
		border: none;
		border-radius: var(--lumi-radius-md) var(--lumi-radius-md) 0 0;
		cursor: pointer;
		transition: var(--lumi-transition-all);
		user-select: none;
		white-space: nowrap;
		position: relative;
		min-height: var(--lumi-space-xxl);
	}

	.lumi-tabs__tab:hover:not(:disabled) {
		color: var(--lumi-color-text);
		background: var(--lumi-color-surface);
	}

	.lumi-tabs__tab--active {
		color: var(--lumi-tabs-color);
		font-weight: var(--lumi-font-weight-semibold);
	}

	.lumi-tabs__tab--disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}

	.lumi-tabs__tab:focus-visible {
		outline: 2px solid var(--lumi-tabs-color);
		outline-offset: 2px;
		border-radius: var(--lumi-radius-md);
	}

	/* Tab content */
	.lumi-tabs__content {
		flex: 1;
		padding-top: var(--lumi-space-md);
	}

	/* Color variants */
	.lumi-tabs--primary {
		--lumi-tabs-color: var(--lumi-color-primary);
	}
	.lumi-tabs--secondary {
		--lumi-tabs-color: var(--lumi-color-secondary);
	}
	.lumi-tabs--success {
		--lumi-tabs-color: var(--lumi-color-success);
	}
	.lumi-tabs--warning {
		--lumi-tabs-color: var(--lumi-color-warning);
	}
	.lumi-tabs--danger {
		--lumi-tabs-color: var(--lumi-color-danger);
	}
	.lumi-tabs--info {
		--lumi-tabs-color: var(--lumi-color-info);
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.lumi-tabs--vertical {
			flex-direction: column;
		}

		.lumi-tabs--vertical .lumi-tabs__nav {
			border-right: none;
			border-bottom: 1px solid var(--lumi-color-border);
			min-width: auto;
			margin-bottom: var(--lumi-space-sm);
		}

		.lumi-tabs--vertical .lumi-tabs__tab {
			border-right: none;
			border-bottom: 2px solid transparent;
			margin-right: 0;
			margin-bottom: -2px;
		}

		.lumi-tabs--vertical .lumi-tabs__tab--active {
			border-right-color: transparent;
			border-bottom-color: var(--lumi-tabs-color);
		}

		.lumi-tabs--vertical .lumi-tabs__content {
			padding-left: 0;
			padding-top: var(--lumi-space-sm);
		}

		.lumi-tabs__tab {
			padding: var(--lumi-space-xs) var(--lumi-space-sm);
			font-size: var(--lumi-font-size-sm);
			min-height: 2rem;
		}
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.lumi-tabs__tab {
			transition: none;
		}
	}
</style>
