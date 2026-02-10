import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { isUuid } from '$lib/utils/validation';
import { DriveRepository } from '$lib/server/repositories/drive.repository';

/**
 * DELETE /api/drive/trash?branch=<uuid>
 * Permanently delete all trashed files from a branch.
 */
export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('drive:delete'))) {
		throw error(403, 'No tienes permisos para vaciar la papelera');
	}

	const branchCode = url.searchParams.get('branch');
	if (!branchCode || !isUuid(branchCode)) {
		throw error(400, 'Código de sede inválido');
	}

	await DriveRepository.assertBranchAccess(locals.db, locals.user, branchCode);

	const trashedFiles = await locals.db
		.selectFrom('drive_files')
		.select(['code', 'storage_path'])
		.where('branch_code', '=', branchCode)
		.where('is_trashed', '=', true)
		.execute();

	if (trashedFiles.length === 0) {
		return json({ success: true, deleted: 0 });
	}

	await locals.db
		.deleteFrom('drive_files')
		.where('branch_code', '=', branchCode)
		.where('is_trashed', '=', true)
		.execute();

	for (const file of trashedFiles) {
		if (!file.storage_path) {
			continue;
		}

		try {
			await fs.unlink(join(process.cwd(), 'static', file.storage_path));
		} catch {
			// Ignore missing files on disk.
		}
	}

	return json({ success: true, deleted: trashedFiles.length });
};

/**
 * GET /api/drive/trash?branch=<uuid>
 * Returns storage usage (non-trashed files only).
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('drive:read'))) {
		throw error(403, 'No tienes permisos para ver el Drive');
	}

	const branchCode = url.searchParams.get('branch');
	if (!branchCode || !isUuid(branchCode)) {
		throw error(400, 'Código de sede inválido');
	}

	await DriveRepository.assertBranchAccess(locals.db, locals.user, branchCode);

	const result = await locals.db
		.selectFrom('drive_files')
		.select((eb) => eb.fn.coalesce(eb.fn.sum('size'), eb.val(0)).as('total_size'))
		.where('branch_code', '=', branchCode)
		.where('is_trashed', '=', false)
		.executeTakeFirst();

	const totalSize = Number(result?.total_size ?? 0);
	return json({ used: totalSize });
};
