import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import { readInventoryPagination } from '$lib/server/inventory/api-query';

interface CreateCustomerBody {
	full_name?: string;
	phone?: string;
	note?: string;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('inventory:read'))) {
		throw error(403, 'No tienes permisos para ver clientes');
	}

	const search = (url.searchParams.get('search') || '').trim();
	const { page, pageSize } = readInventoryPagination(url, {
		defaultPage: 1,
		defaultPageSize: 20,
		maxPageSize: 100
	});

	const result = await InventoryRepository.listCustomers(locals.db, {
		search: search || undefined,
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

	if (!fullName) {
		throw error(400, 'El nombre del cliente es obligatorio');
	}

	try {
		const customer = await InventoryRepository.createCustomer(locals.db, {
			fullName,
			phone: phone || null,
			note: note || null
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
