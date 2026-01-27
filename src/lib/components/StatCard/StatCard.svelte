<script lang="ts">
	import Card from '../Card/Card.svelte';
	import Title from '../Title/Title.svelte';
	import Icon from '../Icon/Icon.svelte';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import type { StatCardProps } from './types';

	const {
		title,
		value,
		icon,
		color = 'primary',
		href,
		hoverable = false,
		subtitle = 'Total registrados',
		class: className = ''
	}: StatCardProps = $props();

	const cardClasses = $derived(() => {
		return ['lumi-stat-card', className].filter(Boolean).join(' ');
	});
</script>

{#if href}
	<a href={resolve(href as Pathname)} class="lumi-text-decoration--none">
		<Card clickable {hoverable} class={cardClasses()}>
			<div class="lumi-stat-card__container">
				<div class="lumi-stat-card__header">
					<Title {title} size="sm" {color} />
					<div class="lumi-stat-card__icon-container lumi-bg--{color}">
						<Icon {icon} size="lg" color="var(--lumi-color-{color})" />
					</div>
				</div>
				<div class="lumi-stat-card__value">{value}</div>
				<div class="lumi-stat-card__subtitle">{subtitle}</div>
			</div>
		</Card>
	</a>
{:else}
	<Card {hoverable} class={cardClasses()}>
		<div class="lumi-stat-card__container">
			<div class="lumi-stat-card__header">
				<Title {title} size="sm" {color} />
				<div class="lumi-stat-card__icon-container lumi-bg--{color}">
					<Icon {icon} size="lg" color="var(--lumi-color-{color})" />
				</div>
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

	.lumi-stat-card__icon-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: var(--lumi-radius-md);
		opacity: 0.1;
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
