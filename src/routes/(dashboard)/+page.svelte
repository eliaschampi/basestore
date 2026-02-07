<script lang="ts">
	import { PageHeader, QuickAccessCard, StatCard, Title } from '$lib/components';

	const { data } = $props();

	type DashboardColor = 'primary' | 'secondary' | 'success' | 'info';

	interface StatCardData {
		title: string;
		value: number;
		icon: string;
		color: DashboardColor;
		href: string;
	}

	const statCards: StatCardData[] = $derived([
		{
			title: 'Usuarios',
			value: data.stats.users,
			icon: 'users',
			color: 'primary',
			href: '/users'
		},
		{
			title: 'Sedes',
			value: data.stats.branches,
			icon: 'building',
			color: 'secondary',
			href: '/branches'
		},
		{
			title: 'Categorías',
			value: data.stats.categories,
			icon: 'tag',
			color: 'success',
			href: '/categories'
		},
		{
			title: 'Marcas',
			value: data.stats.brands,
			icon: 'award',
			color: 'info',
			href: '/brands'
		}
	]);

	interface QuickAccessCardData {
		title: string;
		description: string;
		icon: string;
		color: DashboardColor;
		href: string;
	}

	const quickAccessCards: QuickAccessCardData[] = [
		{
			title: 'Usuarios',
			description: 'Gestiona usuarios y permisos del sistema',
			icon: 'users',
			color: 'primary',
			href: '/users'
		},
		{
			title: 'Sedes',
			description: 'Administra las sedes del sistema',
			icon: 'building',
			color: 'secondary',
			href: '/branches'
		},
		{
			title: 'Categorías',
			description: 'Administra las categorías del sistema',
			icon: 'tag',
			color: 'success',
			href: '/categories'
		},
		{
			title: 'Marcas',
			description: 'Administra las marcas del sistema',
			icon: 'award',
			color: 'info',
			href: '/brands'
		},
		{
			title: 'Mi Perfil',
			description: 'Gestiona tu información personal',
			icon: 'user',
			color: 'primary',
			href: '/profile'
		}
	];
</script>

<div class="lumi-stack lumi-space--xl">
	<PageHeader title="Dashboard" subtitle="Bienvenido a Faztore" size="xl" icon="home" />

	<div class="lumi-grid lumi-grid--auto-fit lumi-grid--gap-lg">
		{#each statCards as stat (stat.title)}
			<StatCard
				title={stat.title}
				value={stat.value}
				icon={stat.icon}
				color={stat.color}
				href={stat.href}
			/>
		{/each}
	</div>

	<div class="lumi-margin-top--lg">
		<Title title="Acceso Rápido" size="lg" />
	</div>

	<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-lg">
		{#each quickAccessCards as card (card.title)}
			<QuickAccessCard
				title={card.title}
				description={card.description}
				icon={card.icon}
				color={card.color}
				href={card.href}
			/>
		{/each}
	</div>
</div>
