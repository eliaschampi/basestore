<script lang="ts">
	import {
		Button,
		Card,
		Notification,
		QuickAccessCard,
		StatCard,
		Title,
		type NotificationPosition,
		type NotificationType
	} from '$lib/components';

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

	interface DashboardNotification {
		id: number;
		type: NotificationType;
		title: string;
		message: string;
		closable: boolean;
		duration: number;
		position: NotificationPosition;
		active: boolean;
		className: string;
	}

	const notificationTypeButtons: {
		type: NotificationType;
		label: string;
		color: DashboardColor | 'warning';
	}[] = [
		{ type: 'primary', label: 'Primary', color: 'primary' },
		{ type: 'success', label: 'Success', color: 'success' },
		{ type: 'info', label: 'Info', color: 'info' },
		{ type: 'warning', label: 'Warning', color: 'warning' },
		{ type: 'error', label: 'Error', color: 'secondary' }
	];

	const notificationPositions: { value: NotificationPosition; label: string }[] = [
		{ value: 'top-left', label: 'Top Left' },
		{ value: 'top-center', label: 'Top Center' },
		{ value: 'top-right', label: 'Top Right' },
		{ value: 'bottom-left', label: 'Bottom Left' },
		{ value: 'bottom-center', label: 'Bottom Center' },
		{ value: 'bottom-right', label: 'Bottom Right' }
	];

	const notificationTypeTitles: Record<NotificationType, string> = {
		primary: 'Primary Notification',
		success: 'Success Notification',
		info: 'Info Notification',
		warning: 'Warning Notification',
		error: 'Error Notification'
	};

	let notificationSeed = 0;
	let demoPosition = $state<NotificationPosition>('top-right');
	let demoClosable = $state(true);
	let demoDuration = $state(4000);
	let demoCustomClass = $state(false);
	let demoNotifications = $state<DashboardNotification[]>([]);

	function createNotification(type: NotificationType) {
		notificationSeed += 1;
		const durationLabel =
			demoDuration === 0 ? 'Manual close mode enabled.' : 'Auto close in 4 seconds.';

		const nextNotification: DashboardNotification = {
			id: notificationSeed,
			type,
			title: notificationTypeTitles[type],
			message: `Temporal dashboard test. Position: ${demoPosition}. ${durationLabel}`,
			closable: demoClosable,
			duration: demoDuration,
			position: demoPosition,
			active: true,
			className: demoCustomClass ? 'lumi-notification--temporal' : ''
		};

		demoNotifications = [nextNotification, ...demoNotifications].slice(0, 12);
	}

	function closeNotification(id: number) {
		demoNotifications = demoNotifications.filter((notification) => notification.id !== id);
	}

	function clearNotifications() {
		demoNotifications = [];
	}

	function notificationsByPosition(position: NotificationPosition): DashboardNotification[] {
		return demoNotifications.filter(
			(notification) => notification.position === position && notification.active
		);
	}
</script>

<div class="lumi-stack lumi-space--xl">
	<div>
		<Title title="Dashboard" subtitle="Bienvenido a Faztore" size="xl" icon="home" />
	</div>

	<Card class="lumi-notification-lab">
		{#snippet header()}
			<div class="lumi-stack lumi-space--xs">
				<h3 class="lumi-notification-lab__title">Notification Lab (Temporal)</h3>
				<p class="lumi-text--sm lumi-text--muted lumi-margin--none">
					Quick test of all notification props with clean, reusable controls.
				</p>
			</div>
		{/snippet}

		<div class="lumi-stack lumi-space--md">
			<div class="lumi-flex lumi-flex--wrap lumi-flex--gap-sm">
				{#each notificationTypeButtons as item (item.type)}
					<Button
						type="filled"
						color={item.color}
						size="sm"
						icon="bell"
						onclick={() => createNotification(item.type)}
					>
						{item.label}
					</Button>
				{/each}
			</div>

			<div class="lumi-flex lumi-flex--wrap lumi-flex--gap-sm">
				<Button
					type={demoClosable ? 'filled' : 'border'}
					color="secondary"
					size="sm"
					icon="settings"
					onclick={() => (demoClosable = !demoClosable)}
				>
					Closable: {demoClosable ? 'On' : 'Off'}
				</Button>

				<Button
					type={demoDuration > 0 ? 'filled' : 'border'}
					color="info"
					size="sm"
					icon="timer"
					onclick={() => (demoDuration = demoDuration > 0 ? 0 : 4000)}
				>
					Duration: {demoDuration > 0 ? '4s' : 'Persistent'}
				</Button>

				<Button
					type={demoCustomClass ? 'filled' : 'border'}
					color="warning"
					size="sm"
					icon="star"
					onclick={() => (demoCustomClass = !demoCustomClass)}
				>
					Custom Class: {demoCustomClass ? 'On' : 'Off'}
				</Button>

				<Button type="flat" color="danger" size="sm" icon="trash" onclick={clearNotifications}>
					Clear ({demoNotifications.length})
				</Button>
			</div>

			<div class="lumi-flex lumi-flex--wrap lumi-flex--gap-xs">
				{#each notificationPositions as option (option.value)}
					<Button
						type={demoPosition === option.value ? 'filled' : 'border'}
						size="sm"
						color={demoPosition === option.value ? 'primary' : 'secondary'}
						onclick={() => (demoPosition = option.value)}
					>
						{option.label}
					</Button>
				{/each}
			</div>
		</div>
	</Card>

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

<div class="lumi-notification-zones" aria-live="polite">
	{#each notificationPositions as position (position.value)}
		<div class={`lumi-notification-zone lumi-notification-zone--${position.value}`}>
			{#each notificationsByPosition(position.value) as item (item.id)}
				<Notification
					type={item.type}
					title={item.title}
					message={item.message}
					closable={item.closable}
					duration={item.duration}
					position={item.position}
					active={item.active}
					class={item.className}
					onclose={() => closeNotification(item.id)}
				/>
			{/each}
		</div>
	{/each}
</div>

<style>
	.lumi-notification-lab {
		position: relative;
		overflow: hidden;
	}

	.lumi-notification-lab::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			145deg,
			color-mix(in srgb, var(--lumi-color-primary-bg) 65%, transparent),
			color-mix(in srgb, var(--lumi-color-info-bg) 50%, transparent)
		);
		opacity: 0.55;
		pointer-events: none;
	}

	.lumi-notification-lab :global(.lumi-card__header),
	.lumi-notification-lab :global(.lumi-card__content) {
		position: relative;
		z-index: var(--lumi-z-base);
	}

	.lumi-notification-lab__title {
		margin: 0;
		font-size: var(--lumi-font-size-lg);
		font-weight: var(--lumi-font-weight-semibold);
		line-height: var(--lumi-line-height-tight);
	}

	.lumi-notification-zones {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: var(--lumi-z-notification);
	}

	.lumi-notification-zone {
		position: fixed;
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-lg);
		inline-size: 100%;
		max-inline-size: calc((var(--lumi-space-6xl) * 5) + var(--lumi-space-xl));
		pointer-events: none;
	}

	.lumi-notification-zone--top-left {
		top: 0;
		left: 0;
		align-items: flex-start;
	}

	.lumi-notification-zone--top-center {
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		align-items: center;
	}

	.lumi-notification-zone--top-right {
		top: 0;
		right: 0;
		align-items: flex-end;
	}

	.lumi-notification-zone--bottom-left {
		bottom: 0;
		left: 0;
		align-items: flex-start;
	}

	.lumi-notification-zone--bottom-center {
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		align-items: center;
	}

	.lumi-notification-zone--bottom-right {
		bottom: 0;
		right: 0;
		align-items: flex-end;
	}

	.lumi-notification-zone :global(.lumi-notification) {
		pointer-events: auto;
	}
</style>
