<script lang="ts">
	import { browser } from "$app/environment";
	import Navbar from "$lib/components/Navbar/Navbar.svelte";
	import Sidebar from "$lib/components/Sidebar/Sidebar.svelte";
	import SidebarItem from "$lib/components/Sidebar/SidebarItem.svelte";
	import { Icon, Divider, Button } from "$lib/components";
	import Avatar from "$lib/components/Avatar/Avatar.svelte";
	import Dropdown from "$lib/components/Dropdown/Dropdown.svelte";
	import DropdownItem from "$lib/components/Dropdown/DropdownItem.svelte";
	import { initializePermissions } from "$lib/stores/permissions.ts";
	import { theme } from "$lib/stores/theme.ts";
	import { page } from "$app/state";

	initializePermissions(page.data.userPermissions || [], page.data.user?.is_super_admin || false);

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
			window.addEventListener("resize", checkMobile);

			return () => {
				window.removeEventListener("resize", checkMobile);
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

	const isDarkTheme = $derived($theme === "dark");

	function getInitials(name?: string | null, lastName?: string | null): string {
		const first = name?.charAt(0) || "";
		const last = lastName?.charAt(0) || "";
		return (first + last).toUpperCase() || "U";
	}
</script>

<svelte:head>
	<title>{page.data.title ? `${page.data.title} | Faztore` : "Faztore"}</title>
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
			<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
				<Icon icon="package" size="32px" color="var(--lumi-color-primary)" />
				{#if !sidebarCollapsed}
					<span class="lumi-text--lg lumi-font--bold"> Faztore </span>
				{/if}
			</div>
		{/snippet}

		<SidebarItem href="/" active={page.url.pathname === "/"} collapsed={sidebarCollapsed}>
			{#snippet icon()}
				<Icon icon="home" size="20px" />
			{/snippet}
			Inicio
		</SidebarItem>

		<Divider />

		<SidebarItem
			href="/branches"
			active={page.url.pathname.startsWith("/branches")}
			collapsed={sidebarCollapsed}
		>
			{#snippet icon()}
				<Icon icon="building" size="20px" />
			{/snippet}
			Sedes
		</SidebarItem>

		<SidebarItem
			href="/categories"
			active={page.url.pathname.startsWith("/categories")}
			collapsed={sidebarCollapsed}
		>
			{#snippet icon()}
				<Icon icon="tag" size="20px" />
			{/snippet}
			Categorías
		</SidebarItem>

		<SidebarItem
			href="/brands"
			active={page.url.pathname.startsWith("/brands")}
			collapsed={sidebarCollapsed}
		>
			{#snippet icon()}
				<Icon icon="award" size="20px" />
			{/snippet}
			Marcas
		</SidebarItem>

		<Divider />

		<SidebarItem
			href="/users"
			active={page.url.pathname.startsWith("/users")}
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
			{page.data.title || "Dashboard"}
		{/snippet}

		{#snippet actions()}
			<Button
				type="flat"
				size="sm"
				icon={isDarkTheme ? "sun" : "moon"}
				aria-label="Toggle theme"
				onclick={toggleTheme}
			/>

			{#if page.data.user}
				{@const user = page.data.user}
				<Dropdown position="bottom-end">
					{#snippet children()}
						<Button type="flat" size="sm">
							<Avatar text={getInitials(user.name, user.last_name)} size="sm" color="primary" />
						</Button>
					{/snippet}

					{#snippet content()}
						<div class="lumi-padding--sm lumi-min-w--md">
							<div class="lumi-padding--sm lumi-border lumi-border--light">
								<p class="lumi-font--medium lumi-margin--none">
									{user.name}
									{user.last_name}
								</p>
								<p class="lumi-text--sm lumi-text--muted lumi-margin-top--2xs">
									{user.email}
								</p>
							</div>

							<DropdownItem icon="user" href="/profile">Mi Perfil</DropdownItem>

							<form action="/api/logout" method="POST" class="lumi-margin-top--xs">
								<DropdownItem icon="log-out" color="danger" submit>Cerrar sesión</DropdownItem>
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
