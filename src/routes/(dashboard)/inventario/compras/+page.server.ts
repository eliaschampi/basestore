import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('inventory:purchases:load');

	if (!(await locals.can('inventory:read'))) {
		throw error(403, 'No tienes permisos para ver compras');
	}

	const [purchases, branches, products] = await Promise.all([
		InventoryRepository.listPurchases(locals.db, {
			page: 1,
			pageSize: 20
		}),
		locals.db
			.selectFrom('branches')
			.select(['code', 'name', 'state'])
			.orderBy('name', 'asc')
			.execute(),
		locals.db
			.selectFrom('products')
			.select(['code', 'name', 'category_code', 'is_active', 'price'])
			.orderBy('name', 'asc')
			.execute()
	]);

	return {
		title: 'Inventario · Compras',
		purchases: purchases.items,
		pagination: purchases.pagination,
		branches,
		products
	};
};
