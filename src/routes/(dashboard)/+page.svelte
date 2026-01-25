<script lang="ts">
	import { Title, StatCard, QuickAccessCard } from '$lib/components';

	const { data } = $props();
	const { users, branches, categories, brands } = $derived(data.stats);

	interface StatCardData {
		title: string;
		value: number;
		icon: string;
		color: 'primary' | 'secondary' | 'success' | 'info';
		href: string;
	}

	const statCards: StatCardData[] = [
		{
			title: 'Usuarios',
			value: users,
			icon: 'users',
			color: 'primary',
			href: '/users'
		},
		{
			title: 'Sedes',
			value: branches,
			icon: 'building',
			color: 'secondary',
			href: '/branches'
		},
		{
			title: 'Categorías',
			value: categories,
			icon: 'tag',
			color: 'success',
			href: '/categories'
		},
		{
			title: 'Marcas',
			value: brands,
			icon: 'award',
			color: 'info',
			href: '/brands'
		}
	];

	interface QuickAccessCardData {
		title: string;
		description: string;
		icon: string;
		color: 'primary' | 'secondary' | 'success' | 'info';
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
	<!-- Welcome Section -->
	<div>
		<Title title="Dashboard" subtitle="Bienvenido a Faztore" size="xl" icon="home" />
	</div>

	<!-- Stats Cards -->
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

	<!-- Quick Access Section -->
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
