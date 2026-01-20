<script lang="ts">
	import Card from '../Card/Card.svelte';
	import Title from '../Title/Title.svelte';
	import Icon from '../Icon/Icon.svelte';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import type { QuickAccessCardProps } from './types';

	const {
		title,
		description,
		icon,
		color = 'primary',
		href,
		class: className = ''
	}: QuickAccessCardProps = $props();

	const cardClasses = $derived(() => {
		return ['lumi-quick-access-card', className].filter(Boolean).join(' ');
	});
</script>

<a href={resolve(href as Pathname)} class="lumi-text-decoration--none">
	<Card clickable class={cardClasses()}>
		<div class="lumi-quick-access-card__container">
			<div class="lumi-quick-access-card__icon-container lumi-bg--{color}">
				<Icon {icon} size="xl" color="var(--lumi-color-{color})" />
			</div>
			<Title {title} size="md" {color} />
			<p class="lumi-quick-access-card__description">{description}</p>
		</div>
	</Card>
</a>

<style>
	.lumi-quick-access-card__container {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: var(--lumi-space-lg);
		gap: var(--lumi-space-sm);
	}

	.lumi-quick-access-card__icon-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		border-radius: var(--lumi-radius-2xl);
		opacity: 0.1;
		margin-bottom: var(--lumi-space-xs);
	}

	.lumi-quick-access-card__description {
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text-muted);
		margin: 0;
	}
</style>
