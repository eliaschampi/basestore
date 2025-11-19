<script lang="ts">
	import Card from "$lib/components/Card/Card.svelte";
	import Title from "$lib/components/Title/Title.svelte";
	import { Icon } from "$lib/components";
	import type { PageData } from "./$types";

	const { data }: { data: PageData } = $props();

	interface StatCard {
		title: string;
		value: number;
		icon: string;
		color: "primary" | "secondary" | "success" | "info";
		href: string;
	}

	const statCards: StatCard[] = [
		{
			title: "Usuarios",
			value: data.stats.users,
			icon: "users",
			color: "primary",
			href: "/users"
		},
		{
			title: "Sedes",
			value: data.stats.branches,
			icon: "building",
			color: "secondary",
			href: "/branches"
		},
		{
			title: "Categorías",
			value: data.stats.categories,
			icon: "tag",
			color: "success",
			href: "/categories"
		},
		{
			title: "Marcas",
			value: data.stats.brands,
			icon: "award",
			color: "info",
			href: "/brands"
		}
	];

	interface QuickAccessCard {
		title: string;
		description: string;
		icon: string;
		color: "primary" | "secondary" | "success" | "info";
		href: string;
	}

	const quickAccessCards: QuickAccessCard[] = [
		{
			title: "Usuarios",
			description: "Gestiona usuarios y permisos del sistema",
			icon: "users",
			color: "primary",
			href: "/users"
		},
		{
			title: "Sedes",
			description: "Administra las sedes del sistema",
			icon: "building",
			color: "secondary",
			href: "/branches"
		},
		{
			title: "Categorías",
			description: "Administra las categorías del sistema",
			icon: "tag",
			color: "success",
			href: "/categories"
		},
		{
			title: "Marcas",
			description: "Administra las marcas del sistema",
			icon: "award",
			color: "info",
			href: "/brands"
		},
		{
			title: "Mi Perfil",
			description: "Gestiona tu información personal",
			icon: "user",
			color: "primary",
			href: "/profile"
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
		{#each statCards as stat}
			<a href={stat.href} class="lumi-text-decoration--none">
				<Card clickable>
					<div class="lumi-padding--md">
						<div
							class="lumi-flex lumi-flex--between lumi-align-items--center lumi-margin-bottom--md"
						>
							<Title title={stat.title} size="sm" color={stat.color} />
							<div
								class="lumi-flex lumi-flex--center lumi-bg--{stat.color} lumi-opacity--10 lumi-rounded--md"
								style="width: 48px; height: 48px;"
							>
								<Icon name={stat.icon} size={24} color="var(--lumi-color-{stat.color})" />
							</div>
						</div>
						<div class="lumi-text--4xl lumi-font--bold lumi-margin-bottom--xs">{stat.value}</div>
						<div class="lumi-text--sm lumi-text--muted">Total registrados</div>
					</div>
				</Card>
			</a>
		{/each}
	</div>

	<!-- Quick Access Section -->
	<div class="lumi-margin-top--lg">
		<Title title="Acceso Rápido" size="lg" />
	</div>

	<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-lg">
		{#each quickAccessCards as card}
			<a href={card.href} class="lumi-text-decoration--none">
				<Card clickable>
					<div
						class="lumi-flex lumi-flex--column lumi-align-items--center lumi-text--center lumi-padding--lg lumi-flex--gap-sm"
					>
						<div
							class="lumi-flex lumi-flex--center lumi-bg--{card.color} lumi-opacity--10 lumi-rounded--2xl lumi-margin-bottom--xs"
							style="width: 64px; height: 64px;"
						>
							<Icon name={card.icon} size={32} color="var(--lumi-color-{card.color})" />
						</div>
						<Title title={card.title} size="md" color={card.color} />
						<p class="lumi-text--sm lumi-text--muted lumi-margin--none">{card.description}</p>
					</div>
				</Card>
			</a>
		{/each}
	</div>
</div>
