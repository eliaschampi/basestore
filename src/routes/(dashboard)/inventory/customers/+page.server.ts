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
			.select(['code', 'full_name', 'phone', 'note', 'is_favorite', 'created_at', 'updated_at'])
			.orderBy('is_favorite', 'desc')
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
		const isFavorite = readFormField(formData, 'is_favorite') === 'true';

		if (!fullName) {
			return fail(400, { error: 'El nombre del cliente es obligatorio' });
		}

		try {
			await InventoryRepository.createCustomer(locals.db, {
				fullName,
				phone: phone || null,
				note: note || null,
				isFavorite
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
		const isFavoriteField = readFormField(formData, 'is_favorite');

		if (!customerCode || !isUuid(customerCode)) {
			return fail(400, { error: 'Cliente inválido' });
		}

		if (isFavoriteField !== 'true' && isFavoriteField !== 'false') {
			return fail(400, { error: 'Debes indicar si el cliente es favorito' });
		}

		try {
			const customer = await InventoryRepository.updateCustomerFavorite(
				locals.db,
				customerCode,
				isFavoriteField === 'true'
			);

			if (!customer) {
				return fail(404, { error: 'Cliente no encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'No se pudo actualizar el cliente';
			return fail(400, { error: message });
		}
	}
};
