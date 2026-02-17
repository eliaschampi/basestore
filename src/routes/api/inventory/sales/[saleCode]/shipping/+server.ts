import { error, isHttpError, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import {
	isValidInventorySaleShippingState,
	normalizeInventorySaleShippingState,
	type InventorySaleShippingState
} from '$lib/utils/inventory';
import { isUuid } from '$lib/utils/validation';

interface UpdateSaleShippingBody {
	shipping_state?: string;
	delivery_address?: string;
	order_reference?: string;
}

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	if (!(await locals.can('inventory:update'))) {
		throw error(403, 'No tienes permisos para actualizar ventas');
	}

	const saleCode = (params.saleCode || '').trim();
	if (!isUuid(saleCode)) {
		throw error(400, 'Venta inválida');
	}

	const body = (await request.json()) as UpdateSaleShippingBody;
	const shippingStateRaw = normalizeInventorySaleShippingState(body.shipping_state || '');
	const deliveryAddress =
		body.delivery_address === undefined ? undefined : body.delivery_address.trim();
	const orderReference =
		body.order_reference === undefined ? undefined : body.order_reference.trim();

	if (!isValidInventorySaleShippingState(shippingStateRaw)) {
		throw error(400, 'Estado de envío inválido');
	}
	const shippingState: InventorySaleShippingState = shippingStateRaw;

	try {
		const sale = await InventoryRepository.updateSaleShippingState(locals.db, {
			saleCode,
			shippingState,
			deliveryAddress: deliveryAddress === undefined ? undefined : deliveryAddress || null,
			orderReference: orderReference === undefined ? undefined : orderReference || null
		});

		if (!sale) {
			throw error(404, 'Venta no encontrada');
		}

		return json({ sale });
	} catch (caught) {
		if (isHttpError(caught)) {
			throw caught;
		}

		const dbError = caught as { code?: string; message?: string };
		if (dbError.code === '23514') {
			throw error(400, dbError.message || 'Estado de envío inválido para esta venta');
		}

		if (dbError.message) {
			throw error(400, dbError.message);
		}

		throw error(500, 'No se pudo actualizar la venta');
	}
};
