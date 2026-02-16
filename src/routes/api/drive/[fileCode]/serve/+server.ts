import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { isUuid } from '$lib/utils/validation';
import { DriveRepository } from '$lib/server/repositories/drive.repository';

/**
 * GET /api/drive/[fileCode]/serve
 * Serves drive files for previews and downloads.
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	if (!(await locals.can('drive:read'))) {
		throw error(403, 'No tienes permisos para ver archivos');
	}

	const { fileCode } = params;
	if (!fileCode || !isUuid(fileCode)) {
		throw error(400, 'Código de archivo inválido');
	}

	const file = await locals.db
		.selectFrom('drive_files')
		.select(['code', 'scope', 'user_code', 'storage_path', 'mime_type', 'name', 'type'])
		.where('code', '=', fileCode)
		.executeTakeFirst();

	if (!file || !file.storage_path) {
		throw error(404, 'Archivo no encontrado');
	}

	await DriveRepository.assertFileRecordAccess(locals.user, file);

	if (file.type === 'dir') {
		throw error(400, 'No se puede servir un directorio');
	}

	const download = url.searchParams.get('download') === 'true';
	const fullPath = join(process.cwd(), 'static', file.storage_path);

	try {
		const fileBuffer = await fs.readFile(fullPath);
		const contentType = file.mime_type || 'application/octet-stream';
		const safeName = encodeURIComponent(file.name);

		return new Response(fileBuffer, {
			headers: {
				'Content-Type': contentType,
				'Content-Length': fileBuffer.length.toString(),
				'Cache-Control': 'private, max-age=3600',
				'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${safeName}"`
			}
		});
	} catch {
		throw error(404, 'Archivo no encontrado en el almacenamiento');
	}
};
