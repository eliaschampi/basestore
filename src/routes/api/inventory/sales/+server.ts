import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import { isUuid } from '$lib/utils/validation';

interface CreateSaleBody {
	product_code?: string;
	branch_code?: string;
	quantity?: number;
	customer_name?: string;
	customer_phone?: string;
	sold_at?: string;
	note?: string;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('inventory:read'))) {
		throw error(403, 'No tienes permisos para ver ventas');
	}

	const branchCode = (url.searchParams.get('branch_code') || '').trim();
	const productCode = (url.searchParams.get('product_code') || '').trim();
	const limitRaw = Number(url.searchParams.get('limit') || 50);
	const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

	if (branchCode && !isUuid(branchCode)) {
		throw error(400, 'Sede inválida');
	}

	if (productCode && !isUuid(productCode)) {
		throw error(400, 'Producto inválido');
	}

	const sales = await InventoryRepository.listSales(locals.db, {
		branchCode: branchCode || undefined,
		productCode: productCode || undefined,
		limit
	});
	return json({ sales });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!(await locals.can('inventory:create'))) {
		throw error(403, 'No tienes permisos para registrar ventas');
	}

	if (!locals.user) {
		throw error(401, 'No autorizado');
	}

	const body = (await request.json()) as CreateSaleBody;
	const productCode = (body.product_code || '').trim();
	const branchCode = (body.branch_code || '').trim();
	const quantity = Number(body.quantity);
	const customerName = (body.customer_name || '').trim();
	const customerPhone = (body.customer_phone || '').trim();
	const soldAtRaw = (body.sold_at || '').trim();
	const note = (body.note || '').trim();

	if (!isUuid(productCode)) {
		throw error(400, 'Producto inválido');
	}

	if (!isUuid(branchCode)) {
		throw error(400, 'Sede inválida');
	}

	if (!Number.isInteger(quantity) || quantity <= 0) {
		throw error(400, 'La cantidad debe ser un entero mayor a 0');
	}

	if (!customerName) {
		throw error(400, 'El nombre del cliente es obligatorio');
	}

	let soldAt: Date | string = new Date();
	if (soldAtRaw) {
		const parsed = new Date(soldAtRaw);
		if (Number.isNaN(parsed.getTime())) {
			throw error(400, 'Fecha de venta inválida');
		}
		soldAt = parsed;
	}

	try {
		const sale = await InventoryRepository.createSale(locals.db, {
			productCode,
			branchCode,
			userCode: locals.user.code,
			quantity,
			customerName,
			customerPhone: customerPhone || null,
			soldAt,
			note: note || null
		});

		return json({ sale }, { status: 201 });
	} catch (caught) {
		const dbError = caught as { code?: string; message?: string };

		if (dbError.code === '23503') {
			throw error(404, 'Producto o sede no encontrada');
		}

		if (dbError.code === '23514') {
			throw error(400, dbError.message || 'Inventario insuficiente para registrar la venta');
		}

		throw error(500, 'No se pudo registrar la venta');
	}
};
