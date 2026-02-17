import type { PageServerLoad } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('inventory:stock:load');

	if (!(await locals.can('inventory:read'))) {
		throw error(403, 'No tienes permisos para ver inventario');
	}

	const [overview, branches, categories] = await Promise.all([
		InventoryRepository.listOverview(locals.db, {
			stock: 'all',
			includeInactive: false,
			page: 1,
			pageSize: 30
		}),
		locals.db
			.selectFrom('branches')
			.select(['code', 'name', 'state'])
			.orderBy('name', 'asc')
			.execute(),
		locals.db.selectFrom('categories').select(['code', 'name']).orderBy('name', 'asc').execute()
	]);

	return {
		title: 'Inventario · Stock',
		items: overview.items,
		summary: overview.summary,
		pagination: overview.pagination,
		branches,
		categories
	};
};
