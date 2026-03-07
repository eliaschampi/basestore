import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	InventoryRepository,
	type CreateInventoryProductTransferItemInput
} from '$lib/server/repositories/inventory.repository';
import {
	readInventoryPagination,
	readOptionalUuidSearchParam
} from '$lib/server/inventory/api-query';
import { isUuid } from '$lib/utils/validation';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

interface TransferItemBody {
	product_code?: string;
	quantity?: number | string;
}

interface CreateTransferBody {
	source_branch_code?: string;
	destination_branch_code?: string;
	transferred_at?: string;
	note?: string;
	items?: TransferItemBody[];
}

function parseDateOnlyAsUtcNoon(value: string): Date | null {
	const match = DATE_ONLY_PATTERN.exec(value);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

	if (
		parsed.getUTCFullYear() !== year ||
		parsed.getUTCMonth() !== month - 1 ||
		parsed.getUTCDate() !== day
	) {
		return null;
	}

	return parsed;
}

function normalizeTransferItems(
	items: TransferItemBody[] | undefined
): CreateInventoryProductTransferItemInput[] {
	if (!Array.isArray(items) || items.length === 0) {
		throw error(400, 'Debes incluir al menos un item de transferencia');
	}

	const grouped = new Map<string, number>();

	for (const item of items) {
		const productCode = (item.product_code || '').trim();
		if (!isUuid(productCode)) {
			throw error(400, 'Producto invalido en los items');
		}

		const quantity = Number(item.quantity);
		if (!Number.isInteger(quantity) || quantity <= 0) {
			throw error(400, 'La cantidad de cada item debe ser un entero mayor a 0');
		}

		grouped.set(productCode, (grouped.get(productCode) ?? 0) + quantity);
	}

	return [...grouped.entries()].map(([productCode, quantity]) => ({
		productCode,
		quantity
	}));
}

export const GET: RequestHandler = async ({ url, locals }) => {
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
	const productCode = readOptionalUuidSearchParam(url, 'product_code', 'Producto invalido');
	const search = (url.searchParams.get('search') || '').trim();
	const { page, pageSize } = readInventoryPagination(url, {
		defaultPage: 1,
		defaultPageSize: 20,
		maxPageSize: 120
	});

	const result = await InventoryRepository.listProductTransfers(locals.db, {
		sourceBranchCode,
		destinationBranchCode,
		productCode,
		search: search || undefined,
		page,
		pageSize
	});

	return json({ transfers: result.items, pagination: result.pagination });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!(await locals.can('product_transfers:create'))) {
		throw error(403, 'No tienes permisos para registrar transferencias');
	}

	if (!locals.user) {
		throw error(401, 'No autorizado');
	}

	const body = (await request.json()) as CreateTransferBody;
	const sourceBranchCode = (body.source_branch_code || '').trim();
	const destinationBranchCode = (body.destination_branch_code || '').trim();
	const transferredAtRaw = (body.transferred_at || '').trim();
	const note = (body.note || '').trim();
	const items = normalizeTransferItems(body.items);

	if (!isUuid(sourceBranchCode)) {
		throw error(400, 'Sede origen invalida');
	}

	if (!isUuid(destinationBranchCode)) {
		throw error(400, 'Sede destino invalida');
	}

	if (sourceBranchCode === destinationBranchCode) {
		throw error(400, 'La sede origen y la sede destino deben ser distintas');
	}

	let transferredAt: Date | string = new Date();
	if (transferredAtRaw) {
		const parsedDateOnly = parseDateOnlyAsUtcNoon(transferredAtRaw);
		if (parsedDateOnly) {
			transferredAt = parsedDateOnly;
		} else {
			const parsed = new Date(transferredAtRaw);
			if (Number.isNaN(parsed.getTime())) {
				throw error(400, 'Fecha de transferencia invalida');
			}
			transferredAt = parsed;
		}
	}

	try {
		const transfer = await InventoryRepository.createProductTransfer(locals.db, {
			sourceBranchCode,
			destinationBranchCode,
			userCode: locals.user.code,
			transferredAt,
			note: note || null,
			items
		});

		return json({ transfer }, { status: 201 });
	} catch (caught) {
		const dbError = caught as { code?: string; message?: string };

		if (dbError.code === '23503') {
			throw error(404, 'Producto o sede no encontrada');
		}

		if (dbError.code === '23505') {
			throw error(400, 'No repitas el mismo producto en varias lineas');
		}

		if (dbError.code === '23514') {
			throw error(400, dbError.message || 'Transferencia de inventario invalida');
		}

		if (dbError.message) {
			throw error(400, dbError.message);
		}

		throw error(500, 'No se pudo registrar la transferencia');
	}
};
