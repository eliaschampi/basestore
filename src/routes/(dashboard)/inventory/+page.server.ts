import type { PageServerLoad } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import { resolveInventoryBranchCode } from '$lib/utils/inventory';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, depends, url }) => {
	depends('inventory:stock:load');

	if (!(await locals.can('inventory:read'))) {
		throw error(403, 'No tienes permisos para ver inventario');
	}

	const [branches, categories] = await Promise.all([
		locals.db
			.selectFrom('branches')
			.select(['code', 'name', 'state'])
			.orderBy('name', 'asc')
			.execute(),
		locals.db.selectFrom('categories').select(['code', 'name']).orderBy('name', 'asc').execute()
	]);
	const requestedBranchCode = url.searchParams.get('branch_code') || undefined;
	const selectedBranchCode = resolveInventoryBranchCode(branches, requestedBranchCode) || null;
	const overview = selectedBranchCode
		? await InventoryRepository.listOverview(locals.db, {
				branchCode: selectedBranchCode,
				stock: 'all',
				includeInactive: true,
				page: 1,
				pageSize: 30
			})
		: {
				items: [],
				summary: {
					total_products: 0,
					healthy_count: 0,
					low_count: 0,
					emergency_count: 0,
					out_of_stock_count: 0,
					in_transit_only_count: 0,
					total_available: 0,
					total_inbound: 0
				},
				pagination: { page: 1, page_size: 30, total: 0, total_pages: 1 }
			};

	return {
		title: 'Inventario · Stock',
		selectedBranchCode,
		items: overview.items,
		summary: overview.summary,
		pagination: overview.pagination,
		branches,
		categories
	};
};
