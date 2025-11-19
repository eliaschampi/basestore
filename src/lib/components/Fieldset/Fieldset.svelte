<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { FieldsetProps } from './types';

	interface Props extends FieldsetProps {
		children?: Snippet;
	}

	const { legend = '', class: className = '', children }: Props = $props();

	const classes = $derived(() => {
		return ['lumi-fieldset', className].filter(Boolean).join(' ');
	});
</script>

<fieldset class={classes()}>
	{#if legend}
		<legend class="lumi-fieldset__legend">{legend}</legend>
	{/if}
	<div class="lumi-fieldset__content">
		{#if children}
			{@render children()}
		{/if}
	</div>
</fieldset>

<style>
	.lumi-fieldset {
		border: 1px solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-2xl);
		padding: var(--lumi-space-lg);
		margin: 0;
		background: rgba(var(--lumi-color-background-rgb), 0.3);
		position: relative;
	}

	.lumi-fieldset__legend {
		background: var(--lumi-color-background);
		color: var(--lumi-color-text-muted);
		padding: 0 var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		margin-left: var(--lumi-space-md);
		border-radius: var(--lumi-radius-base);
		position: relative;
		z-index: 1;
	}
</style>
