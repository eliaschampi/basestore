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
		hoverable = true,
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
					<div class="lumi-stat-card__icon-container lumi-stat-card__icon-container--{color}">
						<Icon {icon} size="lg" {color} />
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
				<div class="lumi-stat-card__icon-container lumi-stat-card__icon-container--{color}">
					<Icon {icon} size="lg" {color} />
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
	}

	.lumi-stat-card__icon-container--primary {
		background: color-mix(in srgb, var(--lumi-color-primary) 15%, transparent);
	}

	.lumi-stat-card__icon-container--secondary {
		background: color-mix(in srgb, var(--lumi-color-secondary) 15%, transparent);
	}

	.lumi-stat-card__icon-container--success {
		background: color-mix(in srgb, var(--lumi-color-success) 15%, transparent);
	}

	.lumi-stat-card__icon-container--info {
		background: color-mix(in srgb, var(--lumi-color-info) 15%, transparent);
	}

	.lumi-stat-card__icon-container--warning {
		background: color-mix(in srgb, var(--lumi-color-warning) 15%, transparent);
	}

	.lumi-stat-card__icon-container--danger {
		background: color-mix(in srgb, var(--lumi-color-danger) 15%, transparent);
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
