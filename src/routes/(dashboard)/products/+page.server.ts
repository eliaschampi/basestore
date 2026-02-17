import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { readFormCheckbox, readFormField } from '$lib/utils/formData';
import { isUuid } from '$lib/utils/validation';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('products:load');

	// Load brands and categories for form selects (always needed for the form)
	const [brands, categories] = await Promise.all([
		locals.db.selectFrom('brands').select(['code', 'name']).orderBy('name', 'asc').execute(),
		locals.db.selectFrom('categories').select(['code', 'name']).orderBy('name', 'asc').execute()
	]);

	if (!(await locals.can('products:read'))) {
		return { products: [], brands, categories, title: 'Productos' };
	}

	try {
		const products = await locals.db
			.selectFrom('products_overview')
			.selectAll()
			.orderBy('name', 'asc')
			.execute();
		return { products, brands, categories, title: 'Productos' };
	} catch {
		return { products: [], brands, categories, title: 'Productos' };
	}
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can('products:create'))) {
			return fail(403, { error: 'No tienes permisos para crear productos' });
		}

		if (!locals.user) {
			return fail(401, { error: 'No autorizado' });
		}

		const formData = await request.formData();
		const name = readFormField(formData, 'name');
		const description = readFormField(formData, 'description');
		const brandCode = readFormField(formData, 'brand_code');
		const categoryCode = readFormField(formData, 'category_code');
		const priceStr = readFormField(formData, 'price');
		const sku = readFormField(formData, 'sku');
		const isActive = readFormCheckbox(formData, 'is_active');

		if (!name) {
			return fail(400, { error: 'El nombre del producto es obligatorio' });
		}

		if (!brandCode || !isUuid(brandCode)) {
			return fail(400, { error: 'Debe seleccionar una marca válida' });
		}

		if (!categoryCode || !isUuid(categoryCode)) {
			return fail(400, { error: 'Debe seleccionar una categoría válida' });
		}

		const price = parseFloat(priceStr);
		if (isNaN(price) || price < 0) {
			return fail(400, { error: 'El precio debe ser un número válido mayor o igual a 0' });
		}

		try {
			await locals.db
				.insertInto('products')
				.values({
					name,
					description: description || null,
					brand_code: brandCode,
					category_code: categoryCode,
					user_code: locals.user.code,
					price,
					sku: sku || null,
					is_active: isActive
				})
				.execute();
			return { success: true, type: 'success' };
		} catch (error) {
			const dbError = error as { code?: string };
			if (dbError.code === '23505') {
				return fail(400, { error: 'Ya existe un producto con ese SKU' });
			}
			const message = error instanceof Error ? error.message : 'Error creando producto';
			return fail(400, { error: message });
		}
	},

	update: async ({ locals, request }) => {
		if (!(await locals.can('products:update'))) {
			return fail(403, { error: 'No tienes permisos para actualizar productos' });
		}

		const formData = await request.formData();
		const productCode = readFormField(formData, 'code');
		const name = readFormField(formData, 'name');
		const description = readFormField(formData, 'description');
		const brandCode = readFormField(formData, 'brand_code');
		const categoryCode = readFormField(formData, 'category_code');
		const priceStr = readFormField(formData, 'price');
		const sku = readFormField(formData, 'sku');
		const isActive = readFormCheckbox(formData, 'is_active');

		if (!productCode || !isUuid(productCode)) {
			return fail(400, { error: 'Producto inválido' });
		}

		if (!name) {
			return fail(400, { error: 'El nombre del producto es obligatorio' });
		}

		if (!brandCode || !isUuid(brandCode)) {
			return fail(400, { error: 'Debe seleccionar una marca válida' });
		}

		if (!categoryCode || !isUuid(categoryCode)) {
			return fail(400, { error: 'Debe seleccionar una categoría válida' });
		}

		const price = parseFloat(priceStr);
		if (isNaN(price) || price < 0) {
			return fail(400, { error: 'El precio debe ser un número válido mayor o igual a 0' });
		}

		try {
			const result = await locals.db
				.updateTable('products')
				.set({
					name,
					description: description || null,
					brand_code: brandCode,
					category_code: categoryCode,
					price,
					sku: sku || null,
					is_active: isActive,
					updated_at: new Date()
				})
				.where('code', '=', productCode)
				.executeTakeFirst();

			if (Number(result.numUpdatedRows ?? 0) === 0) {
				return fail(404, { error: 'Producto no encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const dbError = error as { code?: string };
			if (dbError.code === '23505') {
				return fail(400, { error: 'Ya existe un producto con ese SKU' });
			}
			const message = error instanceof Error ? error.message : 'Error actualizando producto';
			return fail(400, { error: message });
		}
	},

	delete: async ({ locals, request }) => {
		if (!(await locals.can('products:delete'))) {
			return fail(403, { error: 'No tienes permisos para eliminar productos' });
		}

		const formData = await request.formData();
		const productCode = readFormField(formData, 'code');

		if (!productCode || !isUuid(productCode)) {
			return fail(400, { error: 'Producto inválido' });
		}

		try {
			const deletedRows = await locals.db.transaction().execute(async (trx) => {
				await trx
					.deleteFrom('drive_links')
					.where('entity_type', '=', 'product')
					.where('entity_code', '=', productCode)
					.execute();

				const result = await trx
					.deleteFrom('products')
					.where('code', '=', productCode)
					.executeTakeFirst();

				return Number(result.numDeletedRows ?? 0);
			});

			if (deletedRows === 0) {
				return fail(404, { error: 'Producto no encontrado' });
			}

			return { success: true, type: 'success' };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Error eliminando producto';
			return fail(400, { error: message });
		}
	}
};
