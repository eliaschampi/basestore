import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { InventoryRepository } from '$lib/server/repositories/inventory.repository';
import { readFormField } from '$lib/utils/formData';
import { isUuid } from '$lib/utils/validation';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('inventory:customers:load');

	if (!(await locals.can('inventory:read'))) {
		return { customers: [], title: 'Clientes' };
	}

	try {
		const customers = await locals.db
			.selectFrom('inventory_customers')
			.select(['code', 'full_name', 'phone', 'note', 'created_at', 'updated_at'])
			.orderBy('updated_at', 'desc')
			.orderBy('full_name', 'asc')
			.execute();

		return { customers, title: 'Clientes' };
	} catch {
		return { customers: [], title: 'Clientes' };
	}
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can('inventory:create'))) {
			return fail(403, { error: 'No tienes permisos para crear clientes' });
		}

		const formData = await request.formData();
		const fullName = readFormField(formData, 'full_name');
		const phone = readFormField(formData, 'phone');
		const note = readFormField(formData, 'note');

		if (!fullName) {
			return fail(400, { error: 'El nombre del cliente es obligatorio' });
		}

		try {
			await InventoryRepository.createCustomer(locals.db, {
				fullName,
				phone: phone || null,
				note: note || null
			});
			return { success: true, type: 'success' };
		} catch (caught) {
			const dbError = caught as { code?: string; message?: string };
			if (dbError.code === '23505') {
				return fail(409, { error: 'Ya existe un cliente con ese nombre y teléfono' });
			}

			return fail(400, { error: dbError.message || 'No se pudo crear el cliente' });
		}
	},

	update: async ({ locals, request }) => {
		if (!(await locals.can('inventory:update'))) {
			return fail(403, { error: 'No tienes permisos para actualizar clientes' });
		}

		const formData = await request.formData();
		const customerCode = readFormField(formData, 'code');
		const fullName = readFormField(formData, 'full_name');
		const phone = readFormField(formData, 'phone');
		const note = readFormField(formData, 'note');

		if (!customerCode || !isUuid(customerCode)) {
			return fail(400, { error: 'Cliente inválido' });
		}

		if (!fullName) {
			return fail(400, { error: 'El nombre del cliente es obligatorio' });
		}

		try {
			const customer = await InventoryRepository.updateCustomer(locals.db, {
				customerCode,
				fullName,
				phone: phone || null,
				note: note || null
			});

			if (!customer) {
				return fail(404, { error: 'Cliente no encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (caught) {
			const dbError = caught as { code?: string; message?: string };
			if (dbError.code === '23505') {
				return fail(409, { error: 'Ya existe un cliente con ese nombre y teléfono' });
			}

			if (dbError.code === '23514') {
				return fail(400, { error: 'El nombre del cliente es obligatorio' });
			}

			return fail(400, { error: dbError.message || 'No se pudo actualizar el cliente' });
		}
	},

	delete: async ({ locals, request }) => {
		if (!(await locals.can('inventory:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar clientes' });
		}

		const formData = await request.formData();
		const customerCode = readFormField(formData, 'code');

		if (!customerCode || !isUuid(customerCode)) {
			return fail(400, { error: 'Cliente inválido' });
		}

		try {
			const result = await InventoryRepository.deleteCustomer(locals.db, customerCode);

			if (!result) {
				return fail(404, { error: 'Cliente no encontrado' });
			}

			return {
				success: true,
				type: 'success',
				linkedSalesCount: result.linkedSalesCount,
				customerName: result.customer.full_name
			};
		} catch (caught) {
			const dbError = caught as { message?: string };
			return fail(400, { error: dbError.message || 'No se pudo eliminar el cliente' });
		}
	}
};
