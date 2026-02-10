import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isUuid } from '$lib/utils/validation';
import { DriveRepository } from '$lib/server/repositories/drive.repository';
import { isValidTagHash, normalizeDriveName, validateDriveName } from '$lib/utils/drive';

const DRIVE_COLUMNS = [
	'code',
	'name',
	'type',
	'size',
	'tag',
	'mime_type',
	'storage_path',
	'branch_code',
	'parent_code',
	'user_code',
	'is_trashed',
	'created_at',
	'updated_at'
] as const;

interface CreateDirectoryBody {
	name?: string;
	branch_code?: string;
	parent_code?: string | null;
}

/**
 * GET /api/drive — List files
 * Query params: branch, parent (UUID|null), trashed (bool), search (string), tag (string), view (recent/heavy)
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('drive:read'))) {
		throw error(403, 'No tienes permisos para ver el Drive');
	}

	const branchCode = url.searchParams.get('branch');
	const parentCode = url.searchParams.get('parent');
	const trashed = url.searchParams.get('trashed') === 'true';
	const search = url.searchParams.get('search')?.trim();
	const tag = url.searchParams.get('tag')?.trim();
	const view = url.searchParams.get('view');

	if (!branchCode || !isUuid(branchCode)) {
		throw error(400, 'Código de sede inválido');
	}

	await DriveRepository.assertBranchAccess(locals.db, locals.user, branchCode);

	let query = locals.db
		.selectFrom('drive_files')
		.select(DRIVE_COLUMNS)
		.where('branch_code', '=', branchCode);

	if (view === 'recent') {
		query = query
			.where('is_trashed', '=', false)
			.where('type', '!=', 'dir')
			.orderBy('updated_at', 'desc')
			.limit(50);
	} else if (view === 'heavy') {
		query = query
			.where('is_trashed', '=', false)
			.where('type', '!=', 'dir')
			.orderBy('size', 'desc')
			.limit(50);
	} else if (trashed) {
		query = query.where('is_trashed', '=', true).orderBy('updated_at', 'desc');
	} else if (search) {
		query = query
			.where('is_trashed', '=', false)
			.where('name', 'ilike', `%${search}%`)
			.orderBy('type', 'asc')
			.orderBy('name', 'asc')
			.limit(100);
	} else if (tag) {
		if (!isValidTagHash(tag)) {
			throw error(400, 'Etiqueta inválida');
		}

		query = query
			.where('is_trashed', '=', false)
			.where('tag', '=', tag.toLowerCase())
			.orderBy('type', 'asc')
			.orderBy('name', 'asc');
	} else {
		if (parentCode && parentCode !== 'null') {
			if (!isUuid(parentCode)) {
				throw error(400, 'Código de carpeta inválido');
			}

			const parent = await locals.db
				.selectFrom('drive_files')
				.select(['code'])
				.where('code', '=', parentCode)
				.where('branch_code', '=', branchCode)
				.where('type', '=', 'dir')
				.where('is_trashed', '=', false)
				.executeTakeFirst();

			if (!parent) {
				throw error(404, 'Carpeta padre no encontrada');
			}

			query = query.where('parent_code', '=', parentCode);
		} else {
			query = query.where('parent_code', 'is', null);
		}

		query = query.where('is_trashed', '=', false).orderBy('type', 'asc').orderBy('name', 'asc');
	}

	const files = await query.execute();
	return json({ files });
};

/**
 * POST /api/drive — Create directory
 * Body: { name, branch_code, parent_code? }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!(await locals.can('drive:create'))) {
		throw error(403, 'No tienes permisos para crear en el Drive');
	}

	if (!locals.user) {
		throw error(401, 'No autorizado');
	}

	const body = (await request.json()) as CreateDirectoryBody;
	const normalizedName = normalizeDriveName(body.name ?? '');
	const nameError = validateDriveName(normalizedName);

	if (nameError) {
		throw error(400, nameError);
	}

	const branchCode = body.branch_code?.trim() || '';
	if (!branchCode || !isUuid(branchCode)) {
		throw error(400, 'Código de sede inválido');
	}

	await DriveRepository.assertBranchAccess(locals.db, locals.user, branchCode);

	const parentCode = body.parent_code && body.parent_code !== 'null' ? body.parent_code : null;

	if (parentCode && !isUuid(parentCode)) {
		throw error(400, 'Código de carpeta padre inválido');
	}

	if (parentCode) {
		const parent = await locals.db
			.selectFrom('drive_files')
			.select(['code'])
			.where('code', '=', parentCode)
			.where('branch_code', '=', branchCode)
			.where('type', '=', 'dir')
			.where('is_trashed', '=', false)
			.executeTakeFirst();

		if (!parent) {
			throw error(404, 'Carpeta padre no encontrada');
		}
	}

	try {
		const directory = await locals.db
			.insertInto('drive_files')
			.values({
				name: normalizedName,
				type: 'dir',
				branch_code: branchCode,
				user_code: locals.user.code,
				parent_code: parentCode,
				size: 0
			})
			.returning(DRIVE_COLUMNS)
			.executeTakeFirstOrThrow();

		return json({ file: directory }, { status: 201 });
	} catch (caught) {
		const dbError = caught as { code?: string };
		if (dbError.code === '23505') {
			throw error(409, 'Ya existe una carpeta o archivo con ese nombre en esta ubicación');
		}
		throw error(500, 'No se pudo crear la carpeta');
	}
};
