import { error } from '@sveltejs/kit';
import { checkAllPermissions } from '$lib/permissions/server';
import type { PageServerLoad } from './$types';
import { readOptionalUuidSearchParam } from '$lib/server/inventory/api-query';
import { resolveInventoryBranchCode } from '$lib/utils/inventory';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (
		!(await checkAllPermissions(
			locals.can,
			'product_transfers:create',
			'inventory:read',
			'products:read'
		))
	) {
		throw error(403, 'No tienes permisos para registrar transferencias');
	}

	const sourceBranchCode = readOptionalUuidSearchParam(
		url,
		'source_branch_code',
		'Sede origen invalida'
	);
	const destinationBranchCode = readOptionalUuidSearchParam(
		url,
		'destination_branch_code',
		'Sede destino invalida'
	);
	const productCode = readOptionalUuidSearchParam(url, 'product_code', 'Producto invalido');

	const [branches, products] = await Promise.all([
		locals.db
			.selectFrom('branches')
			.select(['code', 'name', 'state'])
			.orderBy('name', 'asc')
			.execute(),
		locals.db
			.selectFrom('products')
			.select(['code', 'name', 'is_active', 'sku'])
			.orderBy('name', 'asc')
			.execute()
	]);

	return {
		title: 'Inventario · Nueva transferencia',
		selectedSourceBranchCode: resolveInventoryBranchCode(branches, sourceBranchCode) || null,
		selectedDestinationBranchCode: destinationBranchCode ?? null,
		selectedProductCode: productCode ?? null,
		branches,
		products
	};
};
