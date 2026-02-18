import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import {
	isValidInventoryPurchaseEntryType,
	isValidInventoryPurchaseOrigin,
	isValidInventoryPurchaseState,
	normalizeInventoryPurchaseEntryType,
	normalizeInventoryPurchaseOrigin,
	normalizeInventoryPurchaseState,
	type InventoryPurchaseEntryType,
	type InventoryPurchaseOrigin,
	type InventoryPurchaseState
} from '$lib/utils/inventory';
import { isUuid } from '$lib/utils/validation';

interface CreatePurchaseBody {
	product_code?: string;
	branch_code?: string;
	origin?: string;
	entry_type?: string;
	tracking_number?: string;
	quantity?: number;
	state?: string;
	ordered_at?: string;
	unit_cost?: number | string | null;
	note?: string;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('inventory:read'))) {
		throw error(403, 'No tienes permisos para ver compras');
	}

	const branchCode = (url.searchParams.get('branch_code') || '').trim();
	const productCode = (url.searchParams.get('product_code') || '').trim();
	const stateRaw = normalizeInventoryPurchaseState(url.searchParams.get('state'));
	const originRaw = normalizeInventoryPurchaseOrigin(url.searchParams.get('origin'));
	const entryTypeRaw = normalizeInventoryPurchaseEntryType(url.searchParams.get('entry_type'));
	const search = (url.searchParams.get('search') || '').trim();
	const pageRaw = Number(url.searchParams.get('page') || 1);
	const pageSizeRaw = Number(url.searchParams.get('page_size') || 20);
	const page = Number.isInteger(pageRaw) ? Math.max(pageRaw, 1) : 1;
	const pageSize = Number.isInteger(pageSizeRaw) ? Math.min(Math.max(pageSizeRaw, 1), 120) : 20;

	if (!branchCode) {
		throw error(400, 'Debe seleccionar una sede');
	}

	if (!isUuid(branchCode)) {
		throw error(400, 'Sede inválida');
	}

	if (productCode && !isUuid(productCode)) {
		throw error(400, 'Producto inválido');
	}

	let state: InventoryPurchaseState | undefined;
	if (stateRaw) {
		if (!isValidInventoryPurchaseState(stateRaw)) {
			throw error(400, 'Estado inválido');
		}
		state = stateRaw;
	}

	let origin: InventoryPurchaseOrigin | undefined;
	if (originRaw) {
		if (!isValidInventoryPurchaseOrigin(originRaw)) {
			throw error(400, 'Origen inválido');
		}
		origin = originRaw;
	}

	let entryType: InventoryPurchaseEntryType | undefined;
	if (entryTypeRaw) {
		if (!isValidInventoryPurchaseEntryType(entryTypeRaw)) {
			throw error(400, 'Tipo de compra inválido');
		}
		entryType = entryTypeRaw;
	}

	const result = await InventoryRepository.listPurchases(locals.db, {
		branchCode,
		productCode: productCode || undefined,
		origin,
		entryType,
		state,
		search: search || undefined,
		page,
		pageSize
	});
	return json({ purchases: result.items, pagination: result.pagination });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!(await locals.can('inventory:create'))) {
		throw error(403, 'No tienes permisos para registrar compras');
	}

	if (!locals.user) {
		throw error(401, 'No autorizado');
	}

	const body = (await request.json()) as CreatePurchaseBody;
	const productCode = (body.product_code || '').trim();
	const branchCode = (body.branch_code || '').trim();
	const originRaw = normalizeInventoryPurchaseOrigin(body.origin || '');
	const stateRaw = normalizeInventoryPurchaseState(body.state || 'in_transit');
	const entryTypeRaw = normalizeInventoryPurchaseEntryType(body.entry_type || 'restock');
	const trackingNumber = (body.tracking_number || '').trim();
	const quantity = Number(body.quantity);
	const orderedAtRaw = (body.ordered_at || '').trim();
	const unitCostRaw = body.unit_cost;
	const note = (body.note || '').trim();

	if (!isUuid(productCode)) {
		throw error(400, 'Producto inválido');
	}

	if (!isUuid(branchCode)) {
		throw error(400, 'Sede inválida');
	}

	if (!isValidInventoryPurchaseOrigin(originRaw)) {
		throw error(400, 'Origen inválido. Usa: temu, aliexpress o lima');
	}
	const origin: InventoryPurchaseOrigin = originRaw;

	if (!isValidInventoryPurchaseState(stateRaw)) {
		throw error(400, 'Estado inválido. Usa: in_transit, received o refunded');
	}
	const state: InventoryPurchaseState = stateRaw;

	if (!isValidInventoryPurchaseEntryType(entryTypeRaw)) {
		throw error(400, 'Tipo de compra inválido. Usa: initial o restock');
	}
	const entryType: InventoryPurchaseEntryType = entryTypeRaw;

	if (!Number.isInteger(quantity) || quantity <= 0) {
		throw error(400, 'La cantidad debe ser un entero mayor a 0');
	}

	if (origin !== 'lima' && trackingNumber.length < 5) {
		throw error(400, 'El NRO de tracking es obligatorio para Temu y AliExpress');
	}

	let orderedAt: Date | string = new Date();
	if (orderedAtRaw) {
		const parsed = new Date(orderedAtRaw);
		if (Number.isNaN(parsed.getTime())) {
			throw error(400, 'Fecha de compra inválida');
		}
		orderedAt = parsed.toISOString().slice(0, 10);
	}

	let unitCost: number | null = null;
	if (unitCostRaw !== null && unitCostRaw !== undefined && `${unitCostRaw}`.trim() !== '') {
		const parsed = Number(unitCostRaw);
		if (!Number.isFinite(parsed) || parsed < 0) {
			throw error(400, 'Costo unitario inválido');
		}
		unitCost = parsed;
	}

	try {
		const purchase = await InventoryRepository.createPurchase(locals.db, {
			productCode,
			branchCode,
			userCode: locals.user.code,
			origin,
			entryType,
			trackingNumber: trackingNumber || null,
			quantity,
			state,
			orderedAt,
			unitCost,
			note: note || null
		});

		return json({ purchase }, { status: 201 });
	} catch (caught) {
		const dbError = caught as { code?: string; message?: string };

		if (dbError.code === '23503') {
			throw error(404, 'Producto o sede no encontrada');
		}

		if (dbError.code === '23514') {
			throw error(400, dbError.message || 'Validación de inventario inválida');
		}

		throw error(500, 'No se pudo registrar la compra');
	}
};
