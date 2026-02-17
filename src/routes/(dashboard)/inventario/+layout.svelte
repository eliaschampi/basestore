<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Card, Icon } from '$lib/components';

	const { children } = $props();

	const navItems = [
		{
			href: '/inventario',
			label: 'Stock',
			description: 'Estado global y salud de inventario',
			icon: 'boxes'
		},
		{
			href: '/inventario/compras',
			label: 'Compras',
			description: 'Ingresos de stock con tracking',
			icon: 'shoppingBag'
		},
		{
			href: '/inventario/ventas',
			label: 'Ventas',
			description: 'Salidas, clientes favoritos y entregas',
			icon: 'creditCard'
		}
	] as const;

	function isActiveRoute(href: string): boolean {
		if (href === '/inventario') {
			return page.url.pathname === '/inventario';
		}

		return page.url.pathname.startsWith(href);
	}
</script>

<div class="inventory-module">
	<aside class="inventory-module__sidebar">
		<Card spaced>
			<div class="lumi-stack lumi-space--sm">
				<div class="inventory-module__title">
					<p class="lumi-margin--none lumi-font--bold">Inventario</p>
					<p class="lumi-margin--none lumi-text--xs lumi-text--muted">
						Flujo simple para stock, compras y ventas.
					</p>
				</div>

				<nav class="inventory-module__nav">
					{#each navItems as item (item.href)}
						<a
							href={resolve(item.href)}
							class="inventory-module__nav-link"
							class:inventory-module__nav-link--active={isActiveRoute(item.href)}
						>
							<Icon icon={item.icon} size="sm" />
							<span class="inventory-module__nav-content">
								<span class="inventory-module__nav-label">{item.label}</span>
								<span class="inventory-module__nav-description">{item.description}</span>
							</span>
						</a>
					{/each}
				</nav>
			</div>
		</Card>
	</aside>

	<section class="inventory-module__content">
		{@render children()}
	</section>
</div>

<style>
	.inventory-module {
		display: grid;
		grid-template-columns: minmax(16rem, 20rem) minmax(0, 1fr);
		gap: var(--lumi-space-md);
		align-items: start;
	}

	.inventory-module__sidebar {
		position: sticky;
		top: var(--lumi-space-md);
	}

	.inventory-module__title {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	.inventory-module__nav {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	.inventory-module__nav-link {
		display: flex;
		align-items: flex-start;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-sm);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-lg);
		color: var(--lumi-color-text);
		text-decoration: none;
		background: var(--lumi-color-surface);
		transition: var(--lumi-transition-all);
	}

	.inventory-module__nav-link:hover {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 32%, var(--lumi-color-border-light));
		background: color-mix(in srgb, var(--lumi-color-primary) 6%, var(--lumi-color-surface));
	}

	.inventory-module__nav-link--active {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 45%, var(--lumi-color-border-light));
		background: color-mix(in srgb, var(--lumi-color-primary) 10%, var(--lumi-color-surface));
		box-shadow: var(--lumi-shadow-sm);
	}

	.inventory-module__nav-content {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
		min-width: 0;
	}

	.inventory-module__nav-label {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-semibold);
		line-height: var(--lumi-line-height-tight);
	}

	.inventory-module__nav-description {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
		line-height: var(--lumi-line-height-normal);
	}

	@media (max-width: 1024px) {
		.inventory-module {
			grid-template-columns: 1fr;
		}

		.inventory-module__sidebar {
			position: static;
		}
	}
</style>
