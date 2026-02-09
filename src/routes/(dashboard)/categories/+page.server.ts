import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

function readFormField(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === 'string' ? value.trim() : '';
}

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('categories:load');

	if (!(await locals.can('categories:read'))) {
		return { categories: [], title: 'Categorías' };
	}

	try {
		const categories = await locals.db
			.selectFrom('categories')
			.selectAll()
			.orderBy('name', 'asc')
			.execute();
		return { categories, title: 'Categorías' };
	} catch {
		return { categories: [], title: 'Categorías' };
	}
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can('categories:create'))) {
			return fail(403, { error: 'No tienes permisos para crear categorías' });
		}

		const formData = await request.formData();
		const name = readFormField(formData, 'name');
		const description = readFormField(formData, 'description');

		if (!name) {
			return fail(400, { error: 'El nombre es obligatorio' });
		}

		try {
			await locals.db
				.insertInto('categories')
				.values({
					name,
					description: description || null
				})
				.execute();
			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error creando categoría';
			return fail(400, { error: message });
		}
	},

	update: async ({ locals, request }) => {
		if (!(await locals.can('categories:update'))) {
			return fail(403, { error: 'No tienes permisos para actualizar categorías' });
		}

		const formData = await request.formData();
		const categoryCode = readFormField(formData, 'code');
		const name = readFormField(formData, 'name');
		const description = readFormField(formData, 'description');

		if (!categoryCode) {
			return fail(400, { error: 'Categoría inválida' });
		}

		if (!name) {
			return fail(400, { error: 'El nombre es obligatorio' });
		}

		try {
			const result = await locals.db
				.updateTable('categories')
				.set({
					name,
					description: description || null,
					updated_at: new Date()
				})
				.where('code', '=', categoryCode)
				.executeTakeFirst();

			if (Number(result.numUpdatedRows ?? 0) === 0) {
				return fail(404, { error: 'Categoría no encontrada' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error actualizando categoría';
			return fail(400, { error: message });
		}
	},

	delete: async ({ locals, request }) => {
		if (!(await locals.can('categories:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar categorías' });
		}

		const formData = await request.formData();
		const categoryCode = readFormField(formData, 'code');
		if (!categoryCode) {
			return fail(400, { error: 'Categoría inválida' });
		}

		try {
			const result = await locals.db
				.deleteFrom('categories')
				.where('code', '=', categoryCode)
				.executeTakeFirst();

			if (Number(result.numDeletedRows ?? 0) === 0) {
				return fail(404, { error: 'Categoría no encontrada' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error eliminando categoría';
			return fail(400, { error: message });
		}
	}
};
