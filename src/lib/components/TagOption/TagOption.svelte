<script lang="ts">
	import { Chip } from '$lib/components';
	import type { DriveTagOption } from '$lib/utils/drive';

	interface Props {
		tag: DriveTagOption;
		active?: boolean;
		onclick?: () => void;
	}

	const { tag, active = false, onclick }: Props = $props();

	const TONE_COLORS: Record<string, string> = {
		favorite: 'var(--lumi-color-secondary)',
		highlight: 'var(--lumi-color-success)',
		work: 'var(--lumi-color-warning)',
		personal: 'var(--lumi-color-info)'
	};

	const dotColor = $derived(TONE_COLORS[tag.tone] ?? 'var(--lumi-color-text-muted)');
</script>

<button
	type="button"
	class="lumi-tag-option"
	class:lumi-tag-option--active={active}
	style:--dot-color={dotColor}
	{onclick}
>
	<span class="lumi-tag-option__dot"></span>
	<span class="lumi-tag-option__label">{tag.name}</span>
	{#if active}
		<Chip size="sm" color="primary">Activa</Chip>
	{/if}
</button>

<style>
	.lumi-tag-option {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		width: 100%;
		padding: var(--lumi-space-xs) var(--lumi-space-md);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-lg);
		background: var(--lumi-color-surface);
		color: var(--lumi-color-text);
		font-family: inherit;
		font-size: var(--lumi-font-size-sm);
		cursor: pointer;
		text-align: left;
		transition:
			border-color var(--lumi-duration-base) var(--lumi-easing-default),
			background-color var(--lumi-duration-base) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-base) var(--lumi-easing-default);
	}

	.lumi-tag-option:hover {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 26%, var(--lumi-color-border));
		background: color-mix(in srgb, var(--lumi-color-primary) 4%, var(--lumi-color-surface));
	}

	.lumi-tag-option:focus-visible {
		outline: var(--lumi-border-width-thick) solid
			color-mix(in srgb, var(--lumi-color-primary) 35%, transparent);
		outline-offset: var(--lumi-space-2xs);
	}

	.lumi-tag-option--active {
		border-color: color-mix(in srgb, var(--dot-color) 40%, var(--lumi-color-border));
		background: color-mix(in srgb, var(--dot-color) 8%, var(--lumi-color-surface));
	}

	.lumi-tag-option--active:hover {
		background: color-mix(in srgb, var(--dot-color) 14%, var(--lumi-color-surface));
	}

	.lumi-tag-option__dot {
		width: var(--lumi-icon-xs);
		height: var(--lumi-icon-xs);
		border-radius: var(--lumi-radius-full);
		flex-shrink: 0;
		background: var(--dot-color);
		box-shadow: 0 0 0 var(--lumi-border-width-thick)
			color-mix(in srgb, var(--dot-color) 20%, transparent);
	}

	.lumi-tag-option__label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-tag-option {
			transition: none;
		}
	}
</style>
