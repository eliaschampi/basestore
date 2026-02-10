import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	detectFileType,
	isAllowedMimeType,
	MAX_FILE_SIZE,
	normalizeDriveName,
	validateDriveName
} from '$lib/utils/drive';
import { isUuid } from '$lib/utils/validation';
import { DriveRepository } from '$lib/server/repositories/drive.repository';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';

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

function getSafeExtension(originalName: string): string {
	const cleaned = extname(originalName)
		.toLowerCase()
		.replace(/[^a-z0-9.]/g, '');
	if (!cleaned || cleaned === '.') {
		return '.bin';
	}
	return cleaned.slice(0, 10);
}

/**
 * POST /api/drive/upload — File upload
 * multipart/form-data:
 *  - file: File
 *  - branch_code: UUID
 *  - parent_code?: UUID
 *  - name?: string
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!(await locals.can('drive:create'))) {
		throw error(403, 'No tienes permisos para subir archivos');
	}

	if (!locals.user) {
		throw error(401, 'No autorizado');
	}

	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	const branchCode = (formData.get('branch_code') as string | null)?.trim() ?? '';
	const parentCodeRaw = (formData.get('parent_code') as string | null)?.trim() ?? '';
	const customNameRaw = (formData.get('name') as string | null)?.trim() ?? '';

	if (!file || !(file instanceof File)) {
		throw error(400, 'No se recibió ningún archivo');
	}

	if (file.size > MAX_FILE_SIZE) {
		throw error(400, `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024}MB`);
	}

	if (file.size === 0) {
		throw error(400, 'El archivo está vacío');
	}

	if (!branchCode || !isUuid(branchCode)) {
		throw error(400, 'Código de sede inválido');
	}

	await DriveRepository.assertBranchAccess(locals.db, locals.user, branchCode);

	const mimeType = file.type || 'application/octet-stream';
	if (!isAllowedMimeType(mimeType)) {
		throw error(400, 'Tipo de archivo no permitido');
	}

	const parentCode = parentCodeRaw && parentCodeRaw !== 'null' ? parentCodeRaw : null;
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

	const finalName = normalizeDriveName(customNameRaw || file.name);
	const nameError = validateDriveName(finalName);
	if (nameError) {
		throw error(400, nameError);
	}

	const fileType = detectFileType(mimeType);
	const ext = getSafeExtension(file.name);
	const fileId = randomUUID();

	const storagePath = `uploads/drive/${branchCode}/${fileId}${ext}`;
	const fullPath = join(process.cwd(), 'static', storagePath);
	const branchDir = join(process.cwd(), 'static', 'uploads', 'drive', branchCode);

	await fs.mkdir(branchDir, { recursive: true });
	await fs.writeFile(fullPath, Buffer.from(await file.arrayBuffer()));

	try {
		const driveFile = await locals.db
			.insertInto('drive_files')
			.values({
				name: finalName,
				type: fileType,
				size: file.size,
				storage_path: storagePath,
				mime_type: mimeType,
				branch_code: branchCode,
				user_code: locals.user.code,
				parent_code: parentCode
			})
			.returning(DRIVE_COLUMNS)
			.executeTakeFirstOrThrow();

		return json({ file: driveFile }, { status: 201 });
	} catch (caught) {
		try {
			await fs.unlink(fullPath);
		} catch {
			// If cleanup fails, request still fails with DB message.
		}

		const dbError = caught as { code?: string };
		if (dbError.code === '23505') {
			throw error(409, 'Ya existe un archivo con ese nombre en esta carpeta');
		}

		throw error(500, 'No se pudo registrar el archivo');
	}
};
