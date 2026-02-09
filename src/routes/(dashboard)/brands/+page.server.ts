import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { isUuid } from '$lib/utils/validation';

function readFormField(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === 'string' ? value.trim() : '';
}

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('brands:load');

	if (!(await locals.can('brands:read'))) {
		return { brands: [], title: 'Marcas' };
	}

	try {
		const brands = await locals.db
			.selectFrom('brands')
			.selectAll()
			.orderBy('name', 'asc')
			.execute();
		return { brands, title: 'Marcas' };
	} catch {
		return { brands: [], title: 'Marcas' };
	}
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can('brands:create'))) {
			return fail(403, { error: 'No tienes permisos para crear marcas' });
		}

		const formData = await request.formData();
		const name = readFormField(formData, 'name');
		const description = readFormField(formData, 'description');

		if (!name) {
			return fail(400, { error: 'El nombre es obligatorio' });
		}

		try {
			await locals.db
				.insertInto('brands')
				.values({
					name,
					description: description || null
				})
				.execute();
			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error creando marca';
			return fail(400, { error: message });
		}
	},

	update: async ({ locals, request }) => {
		if (!(await locals.can('brands:update'))) {
			return fail(403, { error: 'No tienes permisos para actualizar marcas' });
		}

		const formData = await request.formData();
		const brandCode = readFormField(formData, 'code');
		const name = readFormField(formData, 'name');
		const description = readFormField(formData, 'description');

		if (!brandCode) {
			return fail(400, { error: 'Marca inválida' });
		}

		if (!isUuid(brandCode)) {
			return fail(400, { error: 'Identificador de marca inválido' });
		}

		if (!name) {
			return fail(400, { error: 'El nombre es obligatorio' });
		}

		try {
			const result = await locals.db
				.updateTable('brands')
				.set({
					name,
					description: description || null,
					updated_at: new Date()
				})
				.where('code', '=', brandCode)
				.executeTakeFirst();

			if (Number(result.numUpdatedRows ?? 0) === 0) {
				return fail(404, { error: 'Marca no encontrada' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error actualizando marca';
			return fail(400, { error: message });
		}
	},

	delete: async ({ locals, request }) => {
		if (!(await locals.can('brands:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar marcas' });
		}

		const formData = await request.formData();
		const brandCode = readFormField(formData, 'code');
		if (!brandCode) {
			return fail(400, { error: 'Marca inválida' });
		}

		if (!isUuid(brandCode)) {
			return fail(400, { error: 'Identificador de marca inválido' });
		}

		try {
			const result = await locals.db
				.deleteFrom('brands')
				.where('code', '=', brandCode)
				.executeTakeFirst();

			if (Number(result.numDeletedRows ?? 0) === 0) {
				return fail(404, { error: 'Marca no encontrada' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error eliminando marca';
			return fail(400, { error: message });
		}
	}
};
