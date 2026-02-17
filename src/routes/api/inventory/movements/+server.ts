import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import {
	isValidInventoryMovementDirection,
	isValidInventoryMovementReason,
	normalizeInventoryMovementDirection,
	normalizeInventoryMovementReason,
	type InventoryMovementDirection,
	type InventoryMovementReason
} from '$lib/utils/inventory';
import { isUuid } from '$lib/utils/validation';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('inventory:read'))) {
		throw error(403, 'No tienes permisos para ver movimientos de inventario');
	}

	const branchCode = (url.searchParams.get('branch_code') || '').trim();
	const productCode = (url.searchParams.get('product_code') || '').trim();
	const reasonRaw = normalizeInventoryMovementReason(url.searchParams.get('reason'));
	const directionRaw = normalizeInventoryMovementDirection(url.searchParams.get('direction'));
	const limitRaw = Number(url.searchParams.get('limit') || 100);
	const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 300) : 100;

	if (branchCode && !isUuid(branchCode)) {
		throw error(400, 'Sede inválida');
	}

	if (productCode && !isUuid(productCode)) {
		throw error(400, 'Producto inválido');
	}

	let reason: InventoryMovementReason | undefined;
	if (reasonRaw) {
		if (!isValidInventoryMovementReason(reasonRaw)) {
			throw error(400, 'Razón de movimiento inválida');
		}
		reason = reasonRaw;
	}

	let direction: InventoryMovementDirection | undefined;
	if (directionRaw) {
		if (!isValidInventoryMovementDirection(directionRaw)) {
			throw error(400, 'Dirección de movimiento inválida');
		}
		direction = directionRaw;
	}

	const movements = await InventoryRepository.listMovements(locals.db, {
		branchCode: branchCode || undefined,
		productCode: productCode || undefined,
		reason,
		direction,
		limit
	});

	return json({ movements });
};
