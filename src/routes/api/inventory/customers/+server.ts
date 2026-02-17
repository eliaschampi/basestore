import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';

interface CreateCustomerBody {
	full_name?: string;
	phone?: string;
	note?: string;
	is_favorite?: boolean;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('inventory:read'))) {
		throw error(403, 'No tienes permisos para ver clientes');
	}

	const search = (url.searchParams.get('search') || '').trim();
	const favoritesOnly = url.searchParams.get('favorites_only') === 'true';
	const pageRaw = Number(url.searchParams.get('page') || 1);
	const pageSizeRaw = Number(url.searchParams.get('page_size') || 20);
	const page = Number.isInteger(pageRaw) ? Math.max(pageRaw, 1) : 1;
	const pageSize = Number.isInteger(pageSizeRaw) ? Math.min(Math.max(pageSizeRaw, 1), 100) : 20;

	const result = await InventoryRepository.listCustomers(locals.db, {
		search: search || undefined,
		favoritesOnly,
		page,
		pageSize
	});

	return json({ customers: result.items, pagination: result.pagination });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!(await locals.can('inventory:create'))) {
		throw error(403, 'No tienes permisos para crear clientes');
	}

	const body = (await request.json()) as CreateCustomerBody;
	const fullName = (body.full_name || '').trim();
	const phone = (body.phone || '').trim();
	const note = (body.note || '').trim();
	const isFavorite = body.is_favorite === true;

	if (!fullName) {
		throw error(400, 'El nombre del cliente es obligatorio');
	}

	try {
		const customer = await InventoryRepository.createCustomer(locals.db, {
			fullName,
			phone: phone || null,
			note: note || null,
			isFavorite
		});

		return json({ customer }, { status: 201 });
	} catch (caught) {
		const dbError = caught as { code?: string };
		if (dbError.code === '23505') {
			throw error(409, 'Ya existe un cliente con ese nombre y teléfono');
		}

		throw error(500, 'No se pudo crear el cliente');
	}
};
