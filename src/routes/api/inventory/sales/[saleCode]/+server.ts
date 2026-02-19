import { error, isHttpError, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import { isUuid } from '$lib/utils/validation';

interface VoidSaleBody {
	note?: string;
}

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	if (!(await locals.can('inventory:update'))) {
		throw error(403, 'No tienes permisos para actualizar ventas');
	}

	if (!locals.user) {
		throw error(401, 'No autorizado');
	}

	const saleCode = (params.saleCode || '').trim();
	if (!isUuid(saleCode)) {
		throw error(400, 'Venta inválida');
	}

	const body = (await request.json()) as VoidSaleBody;
	const note = (body.note || '').trim();

	try {
		const sale = await InventoryRepository.voidSale(locals.db, {
			saleCode,
			userCode: locals.user.code,
			note: note || null
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
			throw error(400, dbError.message || 'No se pudo anular la venta');
		}

		if (dbError.message) {
			throw error(400, dbError.message);
		}

		throw error(500, 'No se pudo anular la venta');
	}
};
