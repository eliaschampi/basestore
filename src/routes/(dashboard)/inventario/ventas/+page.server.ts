import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('inventory:sales:load');

	if (!(await locals.can('inventory:read'))) {
		throw error(403, 'No tienes permisos para ver ventas');
	}

	const [sales, branches, products, favoriteCustomers] = await Promise.all([
		InventoryRepository.listSales(locals.db, {
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
			.execute(),
		InventoryRepository.listCustomers(locals.db, {
			favoritesOnly: true,
			page: 1,
			pageSize: 30
		})
	]);

	return {
		title: 'Inventario · Ventas',
		sales: sales.items,
		pagination: sales.pagination,
		branches,
		products,
		favoriteCustomers: favoriteCustomers.items
	};
};
