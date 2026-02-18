import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import { resolveInventoryBranchCode } from '$lib/utils/inventory';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('inventory:purchases:load');

	if (!(await locals.can('inventory:read'))) {
		throw error(403, 'No tienes permisos para ver compras');
	}

	const [branches, products] = await Promise.all([
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
	const selectedBranchCode = resolveInventoryBranchCode(branches) || null;
	const purchases = selectedBranchCode
		? await InventoryRepository.listPurchases(locals.db, {
				branchCode: selectedBranchCode,
				page: 1,
				pageSize: 20
			})
		: { items: [], pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 } };

	return {
		title: 'Inventario · Compras',
		selectedBranchCode,
		purchases: purchases.items,
		pagination: purchases.pagination,
		branches,
		products
	};
};
