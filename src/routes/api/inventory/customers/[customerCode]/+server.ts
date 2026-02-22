import { error, isHttpError, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import { isUuid } from '$lib/utils/validation';

interface UpdateCustomerBody {
	full_name?: string;
	phone?: string;
	note?: string;
}

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	if (!(await locals.can('inventory:update'))) {
		throw error(403, 'No tienes permisos para actualizar clientes');
	}

	const customerCode = (params.customerCode || '').trim();
	if (!isUuid(customerCode)) {
		throw error(400, 'Cliente inválido');
	}

	const body = (await request.json()) as UpdateCustomerBody;
	const fullName = (body.full_name || '').trim();
	const phone = (body.phone || '').trim();
	const note = (body.note || '').trim();

	if (!fullName) {
		throw error(400, 'El nombre del cliente es obligatorio');
	}

	try {
		const customer = await InventoryRepository.updateCustomer(locals.db, {
			customerCode,
			fullName,
			phone: phone || null,
			note: note || null
		});

		if (!customer) {
			throw error(404, 'Cliente no encontrado');
		}

		return json({ customer });
	} catch (caught) {
		if (isHttpError(caught)) {
			throw caught;
		}

		const dbError = caught as { code?: string; message?: string };

		if (dbError.code === '23505') {
			throw error(409, 'Ya existe un cliente con ese nombre y teléfono');
		}

		if (dbError.code === '23514') {
			throw error(400, 'El nombre del cliente es obligatorio');
		}

		if (dbError.message) {
			throw error(400, dbError.message);
		}

		throw error(500, 'No se pudo actualizar el cliente');
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!(await locals.can('inventory:delete'))) {
		throw error(403, 'No tienes permisos para eliminar clientes');
	}

	const customerCode = (params.customerCode || '').trim();
	if (!isUuid(customerCode)) {
		throw error(400, 'Cliente inválido');
	}

	try {
		const result = await InventoryRepository.deleteCustomer(locals.db, customerCode);
		if (!result) {
			throw error(404, 'Cliente no encontrado');
		}

		return json({
			customer: result.customer,
			linked_sales_count: result.linkedSalesCount
		});
	} catch (caught) {
		if (isHttpError(caught)) {
			throw caught;
		}

		const dbError = caught as { code?: string; message?: string };

		if (dbError.message) {
			throw error(400, dbError.message);
		}

		throw error(500, 'No se pudo eliminar el cliente');
	}
};
