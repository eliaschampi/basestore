import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import { readRequiredUuidSearchParam } from '$lib/server/inventory/api-query';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('product_transfers:create'))) {
		throw error(403, 'No tienes permisos para consultar stock de transferencia');
	}

	const sourceBranchCode = readRequiredUuidSearchParam(url, 'source_branch_code', {
		missingMessage: 'Debes seleccionar una sede origen',
		invalidMessage: 'Sede origen invalida'
	});
	const productCode = readRequiredUuidSearchParam(url, 'product_code', {
		missingMessage: 'Debes seleccionar un producto',
		invalidMessage: 'Producto invalido'
	});

	const stock = await InventoryRepository.getBranchProductStock(locals.db, {
		branchCode: sourceBranchCode,
		productCode
	});

	if (!stock) {
		throw error(404, 'Producto o sede no encontrada');
	}

	return json({ stock });
};
