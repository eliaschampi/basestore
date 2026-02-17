import { error, isHttpError, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import {
	isValidInventoryListFilterState,
	normalizeInventoryListFilterState
} from '$lib/utils/inventory';
import { isUuid } from '$lib/utils/validation';

interface UpdateThresholdsBody {
	product_code?: string;
	branch_code?: string;
	reorder_point?: number;
	emergency_point?: number;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('inventory:read'))) {
		throw error(403, 'No tienes permisos para ver inventario');
	}

	const branchCode = (url.searchParams.get('branch_code') || '').trim();
	const categoryCode = (url.searchParams.get('category_code') || '').trim();
	const search = (url.searchParams.get('search') || '').trim();
	const includeInactive = url.searchParams.get('include_inactive') === 'true';
	const stockParam = normalizeInventoryListFilterState(url.searchParams.get('stock') || 'all');

	if (branchCode && !isUuid(branchCode)) {
		throw error(400, 'Sede inválida');
	}

	if (categoryCode && !isUuid(categoryCode)) {
		throw error(400, 'Categoría inválida');
	}

	if (!isValidInventoryListFilterState(stockParam)) {
		throw error(400, 'Filtro de stock inválido');
	}

	const [overview, branches, categories, products] = await Promise.all([
		InventoryRepository.listOverview(locals.db, {
			branchCode: branchCode || undefined,
			categoryCode: categoryCode || undefined,
			search: search || undefined,
			stock: stockParam,
			includeInactive
		}),
		locals.db
			.selectFrom('branches')
			.select(['code', 'name', 'state'])
			.orderBy('name', 'asc')
			.execute(),
		locals.db.selectFrom('categories').select(['code', 'name']).orderBy('name', 'asc').execute(),
		locals.db
			.selectFrom('products')
			.select(['code', 'name', 'category_code', 'is_active'])
			.orderBy('name', 'asc')
			.execute()
	]);

	return json({
		items: overview.items,
		summary: overview.summary,
		filters: {
			branches,
			categories,
			products
		}
	});
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!(await locals.can('inventory:update'))) {
		throw error(403, 'No tienes permisos para actualizar inventario');
	}

	const body = (await request.json()) as UpdateThresholdsBody;
	const productCode = (body.product_code || '').trim();
	const branchCode = (body.branch_code || '').trim();
	const reorderPoint = Number(body.reorder_point);
	const emergencyPoint = Number(body.emergency_point);

	if (!isUuid(productCode)) {
		throw error(400, 'Producto inválido');
	}

	if (!isUuid(branchCode)) {
		throw error(400, 'Sede inválida');
	}

	if (!Number.isInteger(reorderPoint) || reorderPoint < 0) {
		throw error(400, 'El punto de reposición debe ser un entero mayor o igual a 0');
	}

	if (!Number.isInteger(emergencyPoint) || emergencyPoint < 0) {
		throw error(400, 'El punto de emergencia debe ser un entero mayor o igual a 0');
	}

	if (reorderPoint < emergencyPoint) {
		throw error(400, 'El punto de reposición no puede ser menor al punto de emergencia');
	}

	try {
		const item = await InventoryRepository.updateThresholds(locals.db, {
			productCode,
			branchCode,
			reorderPoint,
			emergencyPoint
		});

		if (!item) {
			throw error(404, 'No se encontró el balance de inventario');
		}

		return json({ item });
	} catch (caught) {
		if (isHttpError(caught)) {
			throw caught;
		}

		const dbError = caught as { code?: string; message?: string };

		if (dbError.code === '23503') {
			throw error(404, 'Producto o sede no encontrada');
		}

		if (dbError.code === '23514') {
			throw error(400, dbError.message || 'Umbrales de inventario inválidos');
		}

		if (dbError.message) {
			throw error(400, dbError.message);
		}

		throw error(500, 'No se pudieron actualizar los umbrales');
	}
};
