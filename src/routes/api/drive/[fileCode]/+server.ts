import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from 'kysely';
import { promises as fs } from 'fs';
import { join } from 'path';
import { isUuid } from '$lib/utils/validation';
import { isValidTagHash, normalizeDriveName, validateDriveName } from '$lib/utils/drive';
import { DriveRepository, type DriveScopeContext } from '$lib/server/repositories/drive.repository';

interface UpdateFileBody {
	name?: string;
	parent_code?: string | null;
	tag?: string | null;
	is_trashed?: boolean;
}

/**
 * PATCH /api/drive/[fileCode]
 * Supports rename, move, tag update, and trash/restore.
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { fileCode } = params;
	if (!fileCode || !isUuid(fileCode)) {
		throw error(400, 'Código de archivo inválido');
	}

	let body: UpdateFileBody;
	try {
		body = (await request.json()) as UpdateFileBody;
	} catch {
		throw error(400, 'Cuerpo de solicitud inválido');
	}

	const needsUpdatePermission = 'name' in body || 'parent_code' in body || 'tag' in body;
	const needsDeletePermission = 'is_trashed' in body;

	if (needsUpdatePermission && !(await locals.can('drive:update'))) {
		throw error(403, 'No tienes permisos para editar archivos');
	}

	if (needsDeletePermission && !(await locals.can('drive:delete'))) {
		throw error(403, 'No tienes permisos para mover archivos a papelera');
	}

	if (!needsUpdatePermission && !needsDeletePermission) {
		throw error(400, 'No hay cambios para aplicar');
	}

	const file = await locals.db
		.selectFrom('drive_files')
		.select(['code', 'scope', 'user_code', 'parent_code', 'name', 'type', 'is_trashed'])
		.where('code', '=', fileCode)
		.executeTakeFirst();

	if (!file) {
		throw error(404, 'Archivo no encontrado');
	}

	await DriveRepository.assertFileRecordAccess(locals.user, file);
	const fileScope = DriveRepository.normalizeScope(file.scope);

	const fileScopeContext: DriveScopeContext = {
		scope: fileScope,
		ownerUserCode: fileScope === 'user_private' ? file.user_code : null
	};

	const updates: Record<string, unknown> = {};

	if ('name' in body && typeof body.name === 'string') {
		const normalizedName = normalizeDriveName(body.name);
		const nameError = validateDriveName(normalizedName);
		if (nameError) {
			throw error(400, nameError);
		}
		updates.name = normalizedName;
	}

	if ('parent_code' in body) {
		const parentCode = body.parent_code;

		if (parentCode === null) {
			updates.parent_code = null;
		} else {
			if (typeof parentCode !== 'string' || !isUuid(parentCode)) {
				throw error(400, 'Código de carpeta destino inválido');
			}

			if (parentCode === fileCode) {
				throw error(400, 'No se puede mover una carpeta dentro de sí misma');
			}

			const targetParent = await locals.db
				.selectFrom('drive_files')
				.select(['code', 'scope', 'user_code', 'type', 'is_trashed'])
				.where('code', '=', parentCode)
				.executeTakeFirst();

			if (!targetParent || !DriveRepository.isFileInContext(targetParent, fileScopeContext)) {
				throw error(404, 'Carpeta destino no encontrada');
			}

			if (targetParent.type !== 'dir') {
				throw error(400, 'El destino debe ser una carpeta');
			}

			if (targetParent.is_trashed) {
				throw error(400, 'No se puede mover a una carpeta en papelera');
			}

			if (file.type === 'dir') {
				const isChild = await isDescendant(locals.db, fileCode, parentCode);
				if (isChild) {
					throw error(400, 'No se puede mover una carpeta dentro de su propio árbol');
				}
			}

			updates.parent_code = parentCode;
		}
	}

	if ('tag' in body) {
		if (body.tag === null || body.tag === '') {
			updates.tag = null;
		} else if (typeof body.tag === 'string' && isValidTagHash(body.tag)) {
			updates.tag = body.tag.toLowerCase();
		} else {
			throw error(400, 'Etiqueta inválida');
		}
	}

	if ('is_trashed' in body) {
		if (typeof body.is_trashed !== 'boolean') {
			throw error(400, 'Estado de papelera inválido');
		}
		updates.is_trashed = body.is_trashed;
	}

	if (Object.keys(updates).length === 0) {
		throw error(400, 'No hay cambios para aplicar');
	}

	try {
		const result = await locals.db
			.updateTable('drive_files')
			.set(updates)
			.where('code', '=', fileCode)
			.executeTakeFirst();

		if (Number(result.numUpdatedRows ?? 0) === 0) {
			throw error(404, 'Archivo no encontrado');
		}

		return json({ success: true });
	} catch (caught) {
		const dbError = caught as { code?: string };
		if (dbError.code === '23505') {
			throw error(409, 'Ya existe un archivo con ese nombre en la carpeta destino');
		}
		throw caught;
	}
};

/**
 * DELETE /api/drive/[fileCode]
 * Permanent delete. Only files in trash can be permanently deleted.
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!(await locals.can('drive:delete'))) {
		throw error(403, 'No tienes permisos para eliminar archivos');
	}

	const { fileCode } = params;
	if (!fileCode || !isUuid(fileCode)) {
		throw error(400, 'Código de archivo inválido');
	}

	const file = await locals.db
		.selectFrom('drive_files')
		.select(['code', 'scope', 'user_code', 'is_trashed'])
		.where('code', '=', fileCode)
		.executeTakeFirst();

	if (!file) {
		throw error(404, 'Archivo no encontrado');
	}

	await DriveRepository.assertFileRecordAccess(locals.user, file);

	if (!file.is_trashed) {
		throw error(400, 'Solo se pueden eliminar permanentemente archivos en papelera');
	}

	const descendants = await sql<{ storage_path: string | null }>`
		WITH RECURSIVE drive_tree AS (
			SELECT code, storage_path
			FROM drive_files
			WHERE code = ${fileCode}
			UNION ALL
			SELECT f.code, f.storage_path
			FROM drive_files f
			INNER JOIN drive_tree dt ON f.parent_code = dt.code
		)
		SELECT storage_path FROM drive_tree
	`.execute(locals.db);

	await locals.db.deleteFrom('drive_files').where('code', '=', fileCode).execute();

	for (const row of descendants.rows) {
		if (!row.storage_path) {
			continue;
		}

		try {
			await fs.unlink(join(process.cwd(), 'static', row.storage_path));
		} catch {
			// File may already be removed from disk.
		}
	}

	return json({ success: true, deletedFiles: descendants.rows.length });
};

async function isDescendant(
	db: App.Locals['db'],
	ancestorCode: string,
	targetCode: string
): Promise<boolean> {
	if (ancestorCode === targetCode) {
		return true;
	}

	let currentCode: string | null = targetCode;
	const visited = new Set<string>();

	while (currentCode) {
		if (visited.has(currentCode)) {
			break;
		}

		visited.add(currentCode);

		if (currentCode === ancestorCode) {
			return true;
		}

		const parent = await db
			.selectFrom('drive_files')
			.select(['parent_code'])
			.where('code', '=', currentCode)
			.executeTakeFirst();

		currentCode = parent?.parent_code ?? null;
	}

	return false;
}
