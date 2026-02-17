import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import { isUuid } from '$lib/utils/validation';

interface ToggleFavoriteBody {
	is_favorite?: boolean;
}

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	if (!(await locals.can('inventory:update'))) {
		throw error(403, 'No tienes permisos para actualizar clientes');
	}

	const customerCode = (params.customerCode || '').trim();
	if (!isUuid(customerCode)) {
		throw error(400, 'Cliente inválido');
	}

	const body = (await request.json()) as ToggleFavoriteBody;
	if (typeof body.is_favorite !== 'boolean') {
		throw error(400, 'Debes indicar si el cliente es favorito');
	}

	const customer = await InventoryRepository.updateCustomerFavorite(
		locals.db,
		customerCode,
		body.is_favorite
	);

	if (!customer) {
		throw error(404, 'Cliente no encontrado');
	}

	return json({ customer });
};
