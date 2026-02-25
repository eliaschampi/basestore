import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isUuid } from '$lib/utils/validation';
import { DriveRepository } from '$lib/server/repositories/drive.repository';

interface LinkBody {
	file_code?: string;
	product_code?: string;
	position?: number;
	is_primary?: boolean;
}

/**
 * GET /api/drive/links?product_code=<uuid>&scope=product_shared
 * List linked drive files for a product.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('drive:read'))) {
		throw error(403, 'No tienes permisos para ver enlaces de Drive');
	}

	const productCode = (url.searchParams.get('product_code') || '').trim();
	const scope = url.searchParams.get('scope');

	if (!isUuid(productCode)) {
		throw error(400, 'Código de producto inválido');
	}

	const scopeContext = await DriveRepository.resolveScopeContext(locals.user, {
		scope: (scope || 'product_shared').trim()
	});

	if (scopeContext.scope !== 'product_shared') {
		throw error(400, 'Los productos solo pueden vincular archivos del Drive compartido');
	}

	await assertProductExists(locals.db, productCode);

	const links = await locals.db
		.selectFrom('drive_links as dl')
		.innerJoin('drive_files as df', 'df.code', 'dl.file_code')
		.select([
			'dl.code as link_code',
			'dl.product_code',
			'dl.position',
			'dl.is_primary',
			'dl.created_at as linked_at',
			'df.code as file_code',
			'df.name as file_name',
			'df.type as file_type',
			'df.size as file_size',
			'df.mime_type',
			'df.created_at as file_created_at',
			'df.updated_at as file_updated_at'
		])
		.where('dl.product_code', '=', productCode)
		.where('df.scope', '=', scopeContext.scope)
		.where('df.deleted_at', 'is', null)
		.orderBy('dl.is_primary', 'desc')
		.orderBy('dl.position', 'asc')
		.orderBy('dl.created_at', 'asc')
		.execute();

	return json({ links });
};

/**
 * POST /api/drive/links
 * Body: { file_code, product_code, position?, is_primary? }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!(await locals.can('drive:update'))) {
		throw error(403, 'No tienes permisos para vincular archivos');
	}

	if (!locals.user) {
		throw error(401, 'No autorizado');
	}

	const body = (await request.json()) as LinkBody;

	const fileCode = (body.file_code || '').trim();
	const productCode = (body.product_code || '').trim();
	const position = Number.isFinite(body.position) ? Math.max(0, Math.floor(body.position ?? 0)) : 0;
	const isPrimary = body.is_primary === true;

	if (!isUuid(fileCode)) {
		throw error(400, 'Código de archivo inválido');
	}

	if (!isUuid(productCode)) {
		throw error(400, 'Código de producto inválido');
	}

	await assertProductExists(locals.db, productCode);

	const file = await locals.db
		.selectFrom('drive_files')
		.select(['code', 'scope', 'user_code', 'deleted_at', 'type'])
		.where('code', '=', fileCode)
		.executeTakeFirst();

	if (!file) {
		throw error(404, 'Archivo no encontrado');
	}

	if (file.deleted_at !== null) {
		throw error(400, 'No se puede vincular un archivo eliminado');
	}

	if (file.scope !== 'product_shared') {
		throw error(400, 'Solo puedes vincular archivos del alcance Compartido');
	}

	if (isPrimary && file.type !== 'img') {
		throw error(400, 'Solo los archivos de imagen pueden ser principales');
	}

	await DriveRepository.assertFileRecordAccess(locals.user, file);

	const link = await locals.db.transaction().execute(async (trx) => {
		if (isPrimary) {
			await trx
				.updateTable('drive_links')
				.set({ is_primary: false })
				.where('product_code', '=', productCode)
				.execute();
		}

		return trx
			.insertInto('drive_links')
			.values({
				file_code: fileCode,
				product_code: productCode,
				position,
				is_primary: isPrimary,
				linked_by_user_code: locals.user!.code
			})
			.onConflict((oc) =>
				oc.columns(['product_code', 'file_code']).doUpdateSet({
					position,
					is_primary: isPrimary,
					linked_by_user_code: locals.user!.code
				})
			)
			.returning(['code', 'file_code', 'product_code', 'position', 'is_primary', 'created_at'])
			.executeTakeFirstOrThrow();
	});

	return json({ link }, { status: 201 });
};

/**
 * DELETE /api/drive/links
 * Body: { file_code, product_code }
 */
export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!(await locals.can('drive:update'))) {
		throw error(403, 'No tienes permisos para desvincular archivos');
	}

	const body = (await request.json()) as LinkBody;
	const fileCode = (body.file_code || '').trim();
	const productCode = (body.product_code || '').trim();

	if (!isUuid(fileCode)) {
		throw error(400, 'Código de archivo inválido');
	}

	if (!isUuid(productCode)) {
		throw error(400, 'Código de producto inválido');
	}

	await assertProductExists(locals.db, productCode);

	const file = await locals.db
		.selectFrom('drive_files')
		.select(['code', 'scope', 'user_code'])
		.where('code', '=', fileCode)
		.executeTakeFirst();

	if (!file) {
		throw error(404, 'Archivo no encontrado');
	}

	if (file.scope !== 'product_shared') {
		throw error(400, 'Solo puedes desvincular archivos del alcance Compartido');
	}

	await DriveRepository.assertFileRecordAccess(locals.user, file);

	const result = await locals.db
		.deleteFrom('drive_links')
		.where('file_code', '=', fileCode)
		.where('product_code', '=', productCode)
		.executeTakeFirst();

	if (Number(result.numDeletedRows ?? 0) === 0) {
		throw error(404, 'Vínculo no encontrado');
	}

	return json({ success: true });
};

async function assertProductExists(db: App.Locals['db'], productCode: string): Promise<void> {
	const product = await db
		.selectFrom('products')
		.select(['code'])
		.where('code', '=', productCode)
		.executeTakeFirst();

	if (!product) {
		throw error(404, 'Producto no encontrado');
	}
}
