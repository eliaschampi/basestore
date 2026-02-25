import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	InventoryRepository,
	type CreateInventoryPurchaseItemInput
} from '$lib/server/repositories/inventory.repository';
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
import {
	readInventoryPagination,
	readOptionalUuidSearchParam,
	readRequiredUuidSearchParam
} from '$lib/server/inventory/api-query';
import { isUuid } from '$lib/utils/validation';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

interface PurchaseItemBody {
	product_code?: string;
	quantity?: number | string;
	unit_cost?: number | string | null;
}

interface CreatePurchaseBody {
	branch_code?: string;
	origin?: string;
	origin_custom?: string;
	entry_type?: string;
	tracking_number?: string;
	state?: string;
	ordered_at?: string;
	note?: string;
	items?: PurchaseItemBody[];
}

function parseDateOnly(value: string): string | null {
	const match = DATE_ONLY_PATTERN.exec(value);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const parsed = new Date(Date.UTC(year, month - 1, day));

	if (
		parsed.getUTCFullYear() !== year ||
		parsed.getUTCMonth() !== month - 1 ||
		parsed.getUTCDate() !== day
	) {
		return null;
	}

	return `${match[1]}-${match[2]}-${match[3]}`;
}

function normalizePurchaseItems(
	items: PurchaseItemBody[] | undefined
): CreateInventoryPurchaseItemInput[] {
	if (!Array.isArray(items) || items.length === 0) {
		throw error(400, 'Debes incluir al menos un item de compra');
	}

	const grouped = new Map<
		string,
		{
			quantity: number;
			costWeightedSum: number;
			costQty: number;
		}
	>();

	for (const item of items) {
		const productCode = (item.product_code || '').trim();
		if (!isUuid(productCode)) {
			throw error(400, 'Producto inválido en los items');
		}

		const quantity = Number(item.quantity);
		if (!Number.isInteger(quantity) || quantity <= 0) {
			throw error(400, 'La cantidad de cada item debe ser un entero mayor a 0');
		}

		let unitCost: number | null = null;
		if (
			item.unit_cost !== null &&
			item.unit_cost !== undefined &&
			`${item.unit_cost}`.trim() !== ''
		) {
			const parsed = Number(item.unit_cost);
			if (!Number.isFinite(parsed) || parsed < 0) {
				throw error(400, 'Costo unitario inválido en los items');
			}
			unitCost = parsed;
		}

		const existing = grouped.get(productCode) ?? {
			quantity: 0,
			costWeightedSum: 0,
			costQty: 0
		};

		existing.quantity += quantity;
		if (unitCost !== null) {
			existing.costWeightedSum += unitCost * quantity;
			existing.costQty += quantity;
		}
		grouped.set(productCode, existing);
	}

	return [...grouped.entries()].map(([productCode, value]) => ({
		productCode,
		quantity: value.quantity,
		unitCost: value.costQty > 0 ? value.costWeightedSum / value.costQty : null
	}));
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('inventory:read'))) {
		throw error(403, 'No tienes permisos para ver compras');
	}

	const branchCode = readRequiredUuidSearchParam(url, 'branch_code', {
		missingMessage: 'Debe seleccionar una sede',
		invalidMessage: 'Sede inválida'
	});
	const productCode = readOptionalUuidSearchParam(url, 'product_code', 'Producto inválido');
	const stateRaw = normalizeInventoryPurchaseState(url.searchParams.get('state'));
	const originRaw = normalizeInventoryPurchaseOrigin(url.searchParams.get('origin'));
	const entryTypeRaw = normalizeInventoryPurchaseEntryType(url.searchParams.get('entry_type'));
	const search = (url.searchParams.get('search') || '').trim();
	const { page, pageSize } = readInventoryPagination(url, {
		defaultPage: 1,
		defaultPageSize: 20,
		maxPageSize: 120
	});

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
		productCode,
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
	const branchCode = (body.branch_code || '').trim();
	const originRaw = normalizeInventoryPurchaseOrigin(body.origin || '');
	const stateRaw = normalizeInventoryPurchaseState(body.state || 'in_transit');
	const entryTypeRaw = normalizeInventoryPurchaseEntryType(body.entry_type || 'restock');
	const trackingNumber = (body.tracking_number || '').trim();
	const orderedAtRaw = (body.ordered_at || '').trim();
	const note = (body.note || '').trim();
	const originCustom = (body.origin_custom || '').trim();
	const items = normalizePurchaseItems(body.items);

	if (!isUuid(branchCode)) {
		throw error(400, 'Sede inválida');
	}

	if (!isValidInventoryPurchaseOrigin(originRaw)) {
		throw error(400, 'Origen inválido. Usa: temu, aliexpress, lima u other');
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

	if (origin !== 'lima' && trackingNumber.length < 5) {
		throw error(400, 'El NRO de tracking es obligatorio para compras con envío');
	}

	if (origin === 'other' && originCustom.length < 2) {
		throw error(400, 'Cuando el origen es "Otros", especifica el origen personalizado');
	}

	const finalNote =
		origin === 'other'
			? [`Origen personalizado: ${originCustom}`, note].filter(Boolean).join(' · ')
			: note;

	let orderedAt: Date | string = new Date().toISOString().slice(0, 10);
	if (orderedAtRaw) {
		const parsedDateOnly = parseDateOnly(orderedAtRaw);
		if (!parsedDateOnly) {
			throw error(400, 'Fecha de compra inválida');
		}
		orderedAt = parsedDateOnly;
	}

	try {
		const purchase = await InventoryRepository.createPurchase(locals.db, {
			branchCode,
			userCode: locals.user.code,
			origin,
			entryType,
			trackingNumber: trackingNumber || null,
			state,
			orderedAt,
			note: finalNote || null,
			items
		});

		return json({ purchase }, { status: 201 });
	} catch (caught) {
		const dbError = caught as { code?: string; message?: string };

		if (dbError.code === '23503') {
			throw error(404, 'Producto o sede no encontrada');
		}

		if (dbError.code === '23505') {
			throw error(400, 'No repitas el mismo producto en varias líneas');
		}

		if (dbError.code === '23514') {
			throw error(400, dbError.message || 'Validación de inventario inválida');
		}

		throw error(500, 'No se pudo registrar la compra');
	}
};
