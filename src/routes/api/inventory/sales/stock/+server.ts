import { error, json } from '@sveltejs/kit';
import { checkAllPermissions } from '$lib/permissions/server';
import type { RequestHandler } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import { readRequiredUuidSearchParam } from '$lib/server/inventory/api-query';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await checkAllPermissions(locals.can, 'inventory:create', 'inventory:read'))) {
		throw error(403, 'No tienes permisos para consultar stock');
	}

	const branchCode = readRequiredUuidSearchParam(url, 'branch_code', {
		missingMessage: 'Debes seleccionar una sede',
		invalidMessage: 'Sede inválida'
	});
	const productCode = readRequiredUuidSearchParam(url, 'product_code', {
		missingMessage: 'Debes seleccionar un producto',
		invalidMessage: 'Producto inválido'
	});

	const stock = await InventoryRepository.getBranchProductStock(locals.db, {
		branchCode,
		productCode
	});

	if (!stock) {
		throw error(404, 'Producto o sede no encontrada');
	}

	return json({ stock });
};
