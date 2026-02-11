import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isUuid } from '$lib/utils/validation';
import { DriveRepository } from '$lib/server/repositories/drive.repository';

type DriveEntityType = 'product';

interface LinkBody {
	file_code?: string;
	entity_type?: string;
	entity_code?: string;
	position?: number;
	is_primary?: boolean;
}

function isValidEntityType(value: string): value is DriveEntityType {
	return value === 'product';
}

/**
 * GET /api/drive/links?entity_type=product&entity_code=<uuid>&branch=<uuid>
 * List linked drive files for an entity.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('drive:read'))) {
		throw error(403, 'No tienes permisos para ver enlaces de Drive');
	}

	const entityType = (url.searchParams.get('entity_type') || '').trim();
	const entityCode = (url.searchParams.get('entity_code') || '').trim();
	const branchCode = (url.searchParams.get('branch') || '').trim();

	if (!isValidEntityType(entityType)) {
		throw error(400, 'Tipo de entidad inválido');
	}

	if (!isUuid(entityCode)) {
		throw error(400, 'Código de entidad inválido');
	}

	if (!isUuid(branchCode)) {
		throw error(400, 'Código de sede inválido');
	}

	await assertEntityExists(locals.db, entityType, entityCode);
	await DriveRepository.assertBranchAccess(locals.db, locals.user, branchCode);

	const links = await locals.db
		.selectFrom('drive_links as dl')
		.innerJoin('drive_files as df', 'df.code', 'dl.file_code')
		.select([
			'dl.code as link_code',
			'dl.entity_type',
			'dl.entity_code',
			'dl.position',
			'dl.is_primary',
			'dl.created_at as linked_at',
			'df.code as file_code',
			'df.name as file_name',
			'df.type as file_type',
			'df.size as file_size',
			'df.mime_type',
			'df.storage_path',
			'df.created_at as file_created_at'
		])
		.where('dl.entity_type', '=', entityType)
		.where('dl.entity_code', '=', entityCode)
		.where('df.branch_code', '=', branchCode)
		.where('df.is_trashed', '=', false)
		.orderBy('dl.is_primary', 'desc')
		.orderBy('dl.position', 'asc')
		.orderBy('dl.created_at', 'asc')
		.execute();

	return json({ links });
};

/**
 * POST /api/drive/links
 * Body: { file_code, entity_type, entity_code, position?, is_primary? }
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
	const entityType = (body.entity_type || '').trim();
	const entityCode = (body.entity_code || '').trim();
	const position = Number.isFinite(body.position) ? Math.max(0, Math.floor(body.position ?? 0)) : 0;
	const isPrimary = body.is_primary === true;

	if (!isUuid(fileCode)) {
		throw error(400, 'Código de archivo inválido');
	}

	if (!isValidEntityType(entityType)) {
		throw error(400, 'Tipo de entidad inválido');
	}

	if (!isUuid(entityCode)) {
		throw error(400, 'Código de entidad inválido');
	}

	await assertEntityExists(locals.db, entityType, entityCode);

	const file = await locals.db
		.selectFrom('drive_files')
		.select(['code', 'branch_code', 'is_trashed', 'type'])
		.where('code', '=', fileCode)
		.executeTakeFirst();

	if (!file) {
		throw error(404, 'Archivo no encontrado');
	}

	if (file.is_trashed) {
		throw error(400, 'No se puede vincular un archivo en papelera');
	}

	if (isPrimary && file.type !== 'img') {
		throw error(400, 'Solo los archivos de imagen pueden ser principales');
	}

	await DriveRepository.assertBranchAccess(locals.db, locals.user, file.branch_code);

	const link = await locals.db.transaction().execute(async (trx) => {
		if (isPrimary) {
			await trx
				.updateTable('drive_links')
				.set({ is_primary: false })
				.where('entity_type', '=', entityType)
				.where('entity_code', '=', entityCode)
				.execute();
		}

		return trx
			.insertInto('drive_links')
			.values({
				file_code: fileCode,
				entity_type: entityType,
				entity_code: entityCode,
				position,
				is_primary: isPrimary,
				linked_by_user_code: locals.user!.code
			})
			.onConflict((oc) =>
				oc.columns(['entity_type', 'entity_code', 'file_code']).doUpdateSet({
					position,
					is_primary: isPrimary,
					linked_by_user_code: locals.user!.code
				})
			)
			.returning([
				'code',
				'file_code',
				'entity_type',
				'entity_code',
				'position',
				'is_primary',
				'created_at'
			])
			.executeTakeFirstOrThrow();
	});

	return json({ link }, { status: 201 });
};

/**
 * DELETE /api/drive/links
 * Body: { file_code, entity_type, entity_code }
 */
export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!(await locals.can('drive:update'))) {
		throw error(403, 'No tienes permisos para desvincular archivos');
	}

	const body = (await request.json()) as LinkBody;
	const fileCode = (body.file_code || '').trim();
	const entityType = (body.entity_type || '').trim();
	const entityCode = (body.entity_code || '').trim();

	if (!isUuid(fileCode)) {
		throw error(400, 'Código de archivo inválido');
	}

	if (!isValidEntityType(entityType)) {
		throw error(400, 'Tipo de entidad inválido');
	}

	if (!isUuid(entityCode)) {
		throw error(400, 'Código de entidad inválido');
	}

	await assertEntityExists(locals.db, entityType, entityCode);

	const file = await locals.db
		.selectFrom('drive_files')
		.select(['code', 'branch_code'])
		.where('code', '=', fileCode)
		.executeTakeFirst();

	if (!file) {
		throw error(404, 'Archivo no encontrado');
	}

	await DriveRepository.assertBranchAccess(locals.db, locals.user, file.branch_code);

	const result = await locals.db
		.deleteFrom('drive_links')
		.where('file_code', '=', fileCode)
		.where('entity_type', '=', entityType)
		.where('entity_code', '=', entityCode)
		.executeTakeFirst();

	if (Number(result.numDeletedRows ?? 0) === 0) {
		throw error(404, 'Vínculo no encontrado');
	}

	return json({ success: true });
};

async function assertEntityExists(
	db: App.Locals['db'],
	entityType: DriveEntityType,
	entityCode: string
): Promise<void> {
	switch (entityType) {
		case 'product': {
			const product = await db
				.selectFrom('products')
				.select(['code'])
				.where('code', '=', entityCode)
				.executeTakeFirst();

			if (!product) {
				throw error(404, 'Entidad no encontrada');
			}
			return;
		}
	}
}
