import type { PageServerLoad } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('inventory:load');

	if (!(await locals.can('inventory:read'))) {
		throw error(403, 'No tienes permisos para ver inventario');
	}

	const [overview, branches, categories, products, recentPurchases, recentSales, recentMovements] =
		await Promise.all([
			InventoryRepository.listOverview(locals.db, {
				stock: 'all',
				includeInactive: false
			}),
			locals.db
				.selectFrom('branches')
				.select(['code', 'name', 'state'])
				.orderBy('name', 'asc')
				.execute(),
			locals.db.selectFrom('categories').select(['code', 'name']).orderBy('name', 'asc').execute(),
			locals.db
				.selectFrom('products')
				.select(['code', 'name', 'category_code', 'is_active'])
				.orderBy('name', 'asc')
				.execute(),
			InventoryRepository.listPurchases(locals.db, { limit: 8 }),
			InventoryRepository.listSales(locals.db, { limit: 8 }),
			InventoryRepository.listMovements(locals.db, { limit: 12 })
		]);

	return {
		title: 'Inventario',
		items: overview.items,
		summary: overview.summary,
		branches,
		categories,
		products,
		recentPurchases,
		recentSales,
		recentMovements
	};
};
