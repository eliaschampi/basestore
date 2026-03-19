import { error } from '@sveltejs/kit';
import { checkAllPermissions } from '$lib/permissions/server';
import type { PageServerLoad } from './$types';
import { resolveInventoryBranchCode } from '$lib/utils/inventory';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!(await checkAllPermissions(locals.can, 'inventory:create', 'products:read'))) {
		throw error(403, 'No tienes permisos para registrar compras');
	}

	const [branches, products] = await Promise.all([
		locals.db
			.selectFrom('branches')
			.select(['code', 'name', 'state'])
			.orderBy('name', 'asc')
			.execute(),
		locals.db
			.selectFrom('products')
			.select(['code', 'name', 'category_code', 'is_active', 'price', 'cost_price'])
			.orderBy('name', 'asc')
			.execute()
	]);

	const selectedBranchCode = resolveInventoryBranchCode(
		branches,
		url.searchParams.get('branch_code')
	);

	return {
		title: 'Inventario · Nueva compra',
		selectedBranchCode: selectedBranchCode || null,
		branches,
		products
	};
};
