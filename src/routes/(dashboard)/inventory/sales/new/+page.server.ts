import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolveInventoryBranchCode } from '$lib/utils/inventory';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!(await locals.can('inventory:create'))) {
		throw error(403, 'No tienes permisos para registrar ventas');
	}

	const [branches, products, customers] = await Promise.all([
		locals.db
			.selectFrom('branches')
			.select(['code', 'name', 'state'])
			.orderBy('name', 'asc')
			.execute(),
		locals.db
			.selectFrom('products')
			.select(['code', 'name', 'category_code', 'is_active', 'price', 'cost_price'])
			.orderBy('name', 'asc')
			.execute(),
		InventoryRepository.listCustomers(locals.db, {
			page: 1,
			pageSize: 80
		})
	]);

	const selectedBranchCode = resolveInventoryBranchCode(
		branches,
		url.searchParams.get('branch_code')
	);

	return {
		title: 'Inventario · Nueva venta',
		selectedBranchCode: selectedBranchCode || null,
		branches,
		products,
		customers: customers.items
	};
};
