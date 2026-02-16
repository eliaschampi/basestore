import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { DriveRepository } from '$lib/server/repositories/drive.repository';

/**
 * DELETE /api/drive/trash?scope=<scope>
 * Permanently delete all trashed files from a scope context.
 */
export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('drive:delete'))) {
		throw error(403, 'No tienes permisos para vaciar la papelera');
	}

	const scopeContext = await DriveRepository.resolveScopeContext(locals.user, {
		scope: url.searchParams.get('scope')
	});

	let trashedQuery = locals.db
		.selectFrom('drive_files')
		.select(['code', 'storage_path'])
		.where('scope', '=', scopeContext.scope)
		.where('is_trashed', '=', true);

	if (scopeContext.scope === 'user_private' && scopeContext.ownerUserCode) {
		trashedQuery = trashedQuery.where('user_code', '=', scopeContext.ownerUserCode);
	}

	const trashedFiles = await trashedQuery.execute();

	if (trashedFiles.length === 0) {
		return json({ success: true, deleted: 0 });
	}

	let deleteQuery = locals.db
		.deleteFrom('drive_files')
		.where('scope', '=', scopeContext.scope)
		.where('is_trashed', '=', true);

	if (scopeContext.scope === 'user_private' && scopeContext.ownerUserCode) {
		deleteQuery = deleteQuery.where('user_code', '=', scopeContext.ownerUserCode);
	}

	await deleteQuery.execute();

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
 * GET /api/drive/trash?scope=<scope>
 * Returns storage usage (non-trashed files only) for the scope context.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!(await locals.can('drive:read'))) {
		throw error(403, 'No tienes permisos para ver el Drive');
	}

	const scopeContext = await DriveRepository.resolveScopeContext(locals.user, {
		scope: url.searchParams.get('scope')
	});

	let usageQuery = locals.db
		.selectFrom('drive_files')
		.select((eb) => eb.fn.coalesce(eb.fn.sum('size'), eb.val(0)).as('total_size'))
		.where('scope', '=', scopeContext.scope)
		.where('is_trashed', '=', false);

	if (scopeContext.scope === 'user_private' && scopeContext.ownerUserCode) {
		usageQuery = usageQuery.where('user_code', '=', scopeContext.ownerUserCode);
	}

	const result = await usageQuery.executeTakeFirst();
	const totalSize = Number(result?.total_size ?? 0);
	return json({ used: totalSize });
};
