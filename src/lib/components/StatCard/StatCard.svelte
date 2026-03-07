<script lang="ts">
	import Card from '../Card/Card.svelte';
	import Title from '../Title/Title.svelte';
	import IconBadge from '../IconBadge/IconBadge.svelte';
	import { resolve } from '$app/paths';
	import type { StatCardProps } from './types';

	const {
		title,
		value,
		icon,
		color = 'primary',
		href,
		hoverable = true,
		subtitle = 'Total registrados',
		class: className = ''
	}: StatCardProps = $props();

	const cardClasses = $derived.by(() => {
		return ['lumi-stat-card', className].filter(Boolean).join(' ');
	});
</script>

{#if href}
	<a href={resolve(href as '/')} class="lumi-text-decoration--none">
		<Card clickable {hoverable} class={cardClasses}>
			<div class="lumi-stat-card__container">
				<div class="lumi-stat-card__header">
					<Title {title} size="sm" {color} />
					<IconBadge {icon} {color} size="md" />
				</div>
				<div class="lumi-stat-card__value">{value}</div>
				<div class="lumi-stat-card__subtitle">{subtitle}</div>
			</div>
		</Card>
	</a>
{:else}
	<Card {hoverable} class={cardClasses}>
		<div class="lumi-stat-card__container">
			<div class="lumi-stat-card__header">
				<Title {title} size="sm" {color} />
				<IconBadge {icon} {color} size="md" />
			</div>
			<div class="lumi-stat-card__value">{value}</div>
			<div class="lumi-stat-card__subtitle">{subtitle}</div>
		</div>
	</Card>
{/if}

<style>
	.lumi-stat-card__container {
		padding: var(--lumi-space-md);
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
	}

	.lumi-stat-card__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--lumi-space-md);
	}

	.lumi-stat-card__value {
		font-size: var(--lumi-font-size-4xl);
		font-weight: var(--lumi-font-weight-bold);
		margin-bottom: var(--lumi-space-xs);
		color: var(--lumi-color-text);
	}

	.lumi-stat-card__subtitle {
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text-muted);
	}
</style>
