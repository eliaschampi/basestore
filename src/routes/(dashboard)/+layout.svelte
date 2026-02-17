<script lang="ts">
	import { browser } from '$app/environment';
	import Navbar from '$lib/components/Navbar/Navbar.svelte';
	import Sidebar from '$lib/components/Sidebar/Sidebar.svelte';
	import SidebarItem from '$lib/components/Sidebar/SidebarItem.svelte';
	import { Icon, Divider, Button } from '$lib/components';
	import Avatar from '$lib/components/Avatar/Avatar.svelte';
	import Dropdown from '$lib/components/Dropdown/Dropdown.svelte';
	import DropdownItem from '$lib/components/Dropdown/DropdownItem.svelte';
	import { can, initializePermissions } from '$lib/stores/permissions';
	import { hasSuperUserAccess } from '$lib/permissions/super-user';
	import { theme } from '$lib/stores/theme';
	import { page } from '$app/state';

	initializePermissions(page.data.userPermissions || [], hasSuperUserAccess(page.data.user));

	const { children } = $props();

	let sidebarCollapsed = $state(false);
	let sidebarMobileOpen = $state(false);
	let isMobile = $state(false);

	// Detect mobile viewport
	$effect(() => {
		if (browser) {
			const checkMobile = () => {
				isMobile = window.innerWidth <= 1024;
				// Close mobile sidebar when resizing to desktop
				if (!isMobile && sidebarMobileOpen) {
					sidebarMobileOpen = false;
				}
			};

			checkMobile();
			window.addEventListener('resize', checkMobile);

			return () => {
				window.removeEventListener('resize', checkMobile);
			};
		}
	});

	function toggleSidebar() {
		if (isMobile) {
			sidebarMobileOpen = !sidebarMobileOpen;
		} else {
			sidebarCollapsed = !sidebarCollapsed;
		}
	}

	function closeMobileSidebar() {
		sidebarMobileOpen = false;
	}

	function toggleTheme() {
		theme.toggle();
	}

	const isDarkTheme = $derived($theme === 'dark');

	function getInitials(name?: string | null, lastName?: string | null): string {
		const first = name?.charAt(0) || '';
		const last = lastName?.charAt(0) || '';
		return (first + last).toUpperCase() || 'U';
	}

	const sidebarName = $derived(() => {
		if (!page.data.user) return 'Faztore';
		return `${page.data.user.name ?? ''} ${page.data.user.last_name ?? ''}`.trim();
	});

	const sidebarMeta = $derived(() => page.data.user?.email || 'Panel administrativo');
	const canReadDrive = $derived(can('drive:read'));
	const canReadProducts = $derived(can('products:read'));
</script>

<svelte:head>
	<title>{page.data.title ? `${page.data.title} | Faztore` : 'Faztore'}</title>
</svelte:head>

<div
	class="lumi-dashboard-layout"
	class:lumi-sidebar--is-collapsed={sidebarCollapsed && !isMobile}
	class:lumi-sidebar--mobile-open={sidebarMobileOpen && isMobile}
>
	<!-- Mobile Overlay -->
	{#if sidebarMobileOpen && isMobile}
		<div class="lumi-mobile-overlay" onclick={closeMobileSidebar} role="presentation"></div>
	{/if}

	<!-- Sidebar -->
	<Sidebar collapsed={sidebarCollapsed && !isMobile} mobileOpen={sidebarMobileOpen && isMobile}>
		{#snippet header()}
			<div class="lumi-sidebar-profile">
				<Avatar
					text={getInitials(page.data.user?.name, page.data.user?.last_name)}
					src={page.data.user?.photo_url || undefined}
					alt={sidebarName()}
					size={sidebarCollapsed ? 'md' : 'xl'}
					color="primary"
				/>
				{#if !sidebarCollapsed}
					<div class="lumi-sidebar-profile__content">
						<p class="lumi-sidebar-profile__brand">Faztore</p>
						<p class="lumi-sidebar-profile__name">{sidebarName()}</p>
						<p class="lumi-sidebar-profile__meta">{sidebarMeta()}</p>
					</div>
				{/if}
			</div>
		{/snippet}

		<SidebarItem href="/" active={page.url.pathname === '/'} collapsed={sidebarCollapsed}>
			{#snippet icon()}
				<Icon icon="home" size="20px" />
			{/snippet}
			Inicio
		</SidebarItem>

		<Divider />

		<SidebarItem
			href="/branches"
			active={page.url.pathname.startsWith('/branches')}
			collapsed={sidebarCollapsed}
		>
			{#snippet icon()}
				<Icon icon="building" size="20px" />
			{/snippet}
			Sedes
		</SidebarItem>

		<SidebarItem
			href="/categories"
			active={page.url.pathname.startsWith('/categories')}
			collapsed={sidebarCollapsed}
		>
			{#snippet icon()}
				<Icon icon="tag" size="20px" />
			{/snippet}
			Categorías
		</SidebarItem>

		<SidebarItem
			href="/brands"
			active={page.url.pathname.startsWith('/brands')}
			collapsed={sidebarCollapsed}
		>
			{#snippet icon()}
				<Icon icon="award" size="20px" />
			{/snippet}
			Marcas
		</SidebarItem>

		{#if canReadProducts}
			<SidebarItem
				href="/products"
				active={page.url.pathname.startsWith('/products')}
				collapsed={sidebarCollapsed}
			>
				{#snippet icon()}
					<Icon icon="package" size="20px" />
				{/snippet}
				Productos
			</SidebarItem>
		{/if}

		{#if canReadDrive}
			<SidebarItem
				href="/drive"
				active={page.url.pathname.startsWith('/drive')}
				collapsed={sidebarCollapsed}
			>
				{#snippet icon()}
					<Icon icon="hardDrive" size="20px" />
				{/snippet}
				Drive
			</SidebarItem>
		{/if}

		<Divider />

		<SidebarItem
			href="/users"
			active={page.url.pathname.startsWith('/users')}
			collapsed={sidebarCollapsed}
		>
			{#snippet icon()}
				<Icon icon="users" size="20px" />
			{/snippet}
			Usuarios
		</SidebarItem>
	</Sidebar>

	<!-- Navbar -->
	<Navbar ontoggle-sidebar={toggleSidebar} ontoggle-theme={toggleTheme}>
		{#snippet title()}
			{page.data.title || 'Dashboard'}
		{/snippet}

		{#snippet actions()}
			<Button
				type="ghost"
				size="sm"
				icon={isDarkTheme ? 'sun' : 'moon'}
				aria-label="Toggle theme"
				onclick={toggleTheme}
			/>

			{#if page.data.user}
				{@const user = page.data.user}
				<Dropdown position="bottom-end">
					{#snippet triggerContent()}
						<Avatar
							text={getInitials(user.name, user.last_name)}
							src={user.photo_url || undefined}
							alt={`${user.name ?? ''} ${user.last_name ?? ''}`.trim() || 'Usuario'}
							size="sm"
							color="primary"
						/>
					{/snippet}

					{#snippet content()}
						<div class="lumi-padding--sm" style="max-width: 220px;">
							<div class="lumi-padding--sm lumi-border lumi-border--light">
								<p class="lumi-font--medium lumi-margin--none lumi-text-ellipsis">
									{user.name}
									{user.last_name}
								</p>
								<p class="lumi-text--xs lumi-text--muted lumi-margin-top--2xs lumi-text-ellipsis">
									{user.email}
								</p>
							</div>

							<DropdownItem icon="user" href="/profile">Mi Perfil</DropdownItem>

							<form action="/api/logout" method="POST" class="lumi-margin-top--xs">
								<DropdownItem icon="logOut" color="danger" submit>Cerrar sesión</DropdownItem>
							</form>
						</div>
					{/snippet}
				</Dropdown>
			{/if}
		{/snippet}
	</Navbar>

	<!-- Main Content -->
	<main class="lumi-dashboard__content">
		{@render children()}
	</main>
</div>

<style>
	.lumi-sidebar-profile {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		width: 100%;
	}

	.lumi-sidebar-profile__content {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	.lumi-sidebar-profile__brand,
	.lumi-sidebar-profile__name,
	.lumi-sidebar-profile__meta {
		margin: 0;
		line-height: var(--lumi-line-height-tight);
	}

	.lumi-sidebar-profile__brand {
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-primary);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.lumi-sidebar-profile__name {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
	}

	.lumi-sidebar-profile__meta {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
