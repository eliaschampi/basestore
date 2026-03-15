import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('products:read'))) {
		throw error(403, 'No tienes permisos para consultar productos');
	}

	const search = (url.searchParams.get('search') ?? '').trim();
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 50);

	const products = await locals.db
		.selectFrom('products_overview')
		.select([
			'code',
			'name',
			'sku',
			'brand_name',
			'category_name',
			'price',
			'is_active',
			'primary_image_url'
		])
		.$if(search.length > 0, (qb) =>
			qb.where((eb) =>
				eb.or([eb('name', 'ilike', `%${search}%`), eb('sku', 'ilike', `%${search}%`)])
			)
		)
		.orderBy('name', 'asc')
		.limit(limit)
		.execute();

	return json({ products });
};
