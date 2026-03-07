import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import { readOptionalUuidSearchParam } from '$lib/server/inventory/api-query';

export const load: PageServerLoad = async ({ locals, depends, url }) => {
	depends('inventory:transfers:load');

	if (!(await locals.can('product_transfers:read'))) {
		throw error(403, 'No tienes permisos para ver transferencias');
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

	const [branches, transfers] = await Promise.all([
		locals.db
			.selectFrom('branches')
			.select(['code', 'name', 'state'])
			.orderBy('name', 'asc')
			.execute(),
		InventoryRepository.listProductTransfers(locals.db, {
			sourceBranchCode,
			destinationBranchCode,
			page: 1,
			pageSize: 20
		})
	]);

	return {
		title: 'Inventario · Transferencias',
		selectedSourceBranchCode: sourceBranchCode ?? null,
		selectedDestinationBranchCode: destinationBranchCode ?? null,
		transfers: transfers.items,
		pagination: transfers.pagination,
		branches
	};
};
