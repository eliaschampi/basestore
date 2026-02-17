import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const HOME_ENTRY_ROUTES = [
	{ href: '/inventario', permission: 'inventory:read' },
	{ href: '/products', permission: 'products:read' },
	{ href: '/drive', permission: 'drive:read' },
	{ href: '/branches', permission: 'branches:read' },
	{ href: '/categories', permission: 'categories:read' },
	{ href: '/brands', permission: 'brands:read' },
	{ href: '/users', permission: 'users:read' }
] as const;

export const load: PageServerLoad = async ({ locals }) => {
	const permissions = await Promise.all(
		HOME_ENTRY_ROUTES.map((route) => locals.can(route.permission))
	);
	const firstAllowedRoute = HOME_ENTRY_ROUTES.find((_, index) => permissions[index]);

	if (firstAllowedRoute) {
		throw redirect(307, firstAllowedRoute.href);
	}

	return { title: 'Inicio' };
};
