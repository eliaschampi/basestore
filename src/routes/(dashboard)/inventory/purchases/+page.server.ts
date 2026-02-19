import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import { resolveInventoryBranchCode } from '$lib/utils/inventory';

export const load: PageServerLoad = async ({ locals, depends, url }) => {
	depends('inventory:purchases:load');

	if (!(await locals.can('inventory:read'))) {
		throw error(403, 'No tienes permisos para ver compras');
	}

	const branches = await locals.db
		.selectFrom('branches')
		.select(['code', 'name', 'state'])
		.orderBy('name', 'asc')
		.execute();
	const selectedBranchCode =
		resolveInventoryBranchCode(branches, url.searchParams.get('branch_code')) || null;
	const purchases = selectedBranchCode
		? await InventoryRepository.listPurchases(locals.db, {
				branchCode: selectedBranchCode,
				state: 'received',
				page: 1,
				pageSize: 20
			})
		: { items: [], pagination: { page: 1, page_size: 20, total: 0, total_pages: 1 } };

	return {
		title: 'Inventario · Compras',
		selectedBranchCode,
		purchases: purchases.items,
		pagination: purchases.pagination,
		branches
	};
};
