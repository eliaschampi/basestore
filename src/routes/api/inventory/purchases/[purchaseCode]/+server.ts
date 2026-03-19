import { error, isHttpError, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import {
	isValidInventoryPurchaseState,
	normalizeInventoryPurchaseState,
	type InventoryPurchaseState
} from '$lib/utils/inventory';
import { isUuid } from '$lib/utils/validation';

interface UpdatePurchaseBody {
	state?: string;
	note?: string;
}

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	const body = (await request.json()) as UpdatePurchaseBody;
	const stateRaw = normalizeInventoryPurchaseState(body.state);
	const note = body.note === undefined ? undefined : body.note.trim();

	if (!isValidInventoryPurchaseState(stateRaw)) {
		throw error(400, 'Estado inválido. Usa: in_transit, received o refunded');
	}
	const state: InventoryPurchaseState = stateRaw;

	const requiredPermission = state === 'refunded' ? 'inventory:delete' : 'inventory:update';
	if (!(await locals.can(requiredPermission))) {
		throw error(
			403,
			state === 'refunded'
				? 'No tienes permisos para reembolsar compras'
				: 'No tienes permisos para actualizar compras'
		);
	}

	if (!locals.user) {
		throw error(401, 'No autorizado');
	}

	const purchaseCode = (params.purchaseCode || '').trim();
	if (!isUuid(purchaseCode)) {
		throw error(400, 'Compra inválida');
	}

	try {
		const purchase = await InventoryRepository.updatePurchaseState(locals.db, {
			purchaseCode,
			userCode: locals.user.code,
			state,
			note: note === undefined ? undefined : note || null
		});

		if (!purchase) {
			throw error(404, 'Compra no encontrada');
		}

		return json({ purchase });
	} catch (caught) {
		if (isHttpError(caught)) {
			throw caught;
		}

		const dbError = caught as { code?: string; message?: string };
		if (dbError.code === '23514') {
			throw error(400, dbError.message || 'Inventario insuficiente para aplicar reembolso');
		}

		if (dbError.message) {
			throw error(400, dbError.message);
		}

		throw error(500, 'No se pudo actualizar la compra');
	}
};
