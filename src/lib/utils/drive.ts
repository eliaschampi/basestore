/**
 * Drive utility helpers and constants
 */

/** Supported drive file types */
export type DriveFileType = 'dir' | 'img' | 'vid' | 'aud' | 'doc' | 'zip' | 'otr';

/** Maximum upload file size: 50MB */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Max file/folder name length */
export const MAX_DRIVE_NAME_LENGTH = 160;

/** Allowed MIME types for upload */
export const ALLOWED_MIME_TYPES: Record<string, DriveFileType> = {
	// Images
	'image/jpeg': 'img',
	'image/png': 'img',
	'image/gif': 'img',
	'image/webp': 'img',
	'image/svg+xml': 'img',
	'image/avif': 'img',
	// Video
	'video/mp4': 'vid',
	'video/webm': 'vid',
	'video/quicktime': 'vid',
	// Audio
	'audio/mpeg': 'aud',
	'audio/wav': 'aud',
	'audio/ogg': 'aud',
	'audio/webm': 'aud',
	// Documents
	'application/pdf': 'doc',
	'application/msword': 'doc',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
	'text/plain': 'doc',
	// Archives
	'application/zip': 'zip',
	'application/x-rar-compressed': 'zip',
	'application/x-7z-compressed': 'zip'
};

const FORBIDDEN_NAME_CHARS = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);

const TAG_HASH_REGEX = /^[a-f0-9]{6}$/i;

/**
 * Detect DriveFileType from MIME type
 */
export function detectFileType(mimeType: string): DriveFileType {
	return ALLOWED_MIME_TYPES[mimeType] || 'otr';
}

/**
 * Check if MIME type is allowed for upload
 */
export function isAllowedMimeType(mimeType: string): boolean {
	return mimeType in ALLOWED_MIME_TYPES;
}

/**
 * Normalize file/folder names
 */
export function normalizeDriveName(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}

/**
 * Validate file/folder names. Returns null if valid.
 */
export function validateDriveName(value: string): string | null {
	const normalized = normalizeDriveName(value);

	if (!normalized) {
		return 'El nombre es obligatorio';
	}

	if (normalized.length > MAX_DRIVE_NAME_LENGTH) {
		return `El nombre no puede superar ${MAX_DRIVE_NAME_LENGTH} caracteres`;
	}

	if (normalized === '.' || normalized === '..') {
		return 'Nombre de archivo inválido';
	}

	if (hasInvalidDriveNameChars(normalized)) {
		return 'El nombre contiene caracteres inválidos';
	}

	return null;
}

/**
 * Validate drive tag hash
 */
export function isValidTagHash(value: string): boolean {
	return TAG_HASH_REGEX.test(value);
}

function hasInvalidDriveNameChars(value: string): boolean {
	for (const char of value) {
		if (FORBIDDEN_NAME_CHARS.has(char)) {
			return true;
		}

		if (char.charCodeAt(0) < 32) {
			return true;
		}
	}

	return false;
}

/**
 * Get the Lucide icon name for a file type
 */
export function getFileIcon(type: DriveFileType): string {
	const icons: Record<DriveFileType, string> = {
		dir: 'folder',
		img: 'image',
		vid: 'video',
		aud: 'music',
		doc: 'fileText',
		zip: 'file',
		otr: 'file'
	};
	return icons[type];
}

/**
 * Get semantic Lumi color for a file type
 */
export function getFileColor(type: DriveFileType): string {
	const colors: Record<DriveFileType, string> = {
		dir: 'primary',
		img: 'success',
		vid: 'danger',
		aud: 'warning',
		doc: 'info',
		zip: 'secondary',
		otr: 'muted'
	};
	return colors[type];
}

/**
 * Format bytes into human-readable size
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
	return `${size} ${units[i]}`;
}

/**
 * Tag options for Drive
 * `hash` is what gets stored in DB, `color` comes from Lumi tokens.
 */
export const TAG_OPTIONS = [
	{ color: 'var(--lumi-color-secondary)', hash: 'fb7185', name: 'Favoritos' },
	{ color: 'var(--lumi-color-success)', hash: '47b57c', name: 'Destacados' },
	{ color: 'var(--lumi-color-warning)', hash: 'faa75f', name: 'Trabajo' },
	{ color: 'var(--lumi-color-info)', hash: '42a5f5', name: 'Personal' }
] as const;

/**
 * Sidebar menu options for Drive navigation
 */
export const DRIVE_MENU_OPTIONS = {
	main: [
		{ name: 'Recientes', value: 'recent', icon: 'clock' },
		{ name: 'Archivos pesados', value: 'heavy', icon: 'hardDrive' }
	],
	trash: [{ name: 'Papelera', value: 'trash', icon: 'trash' }]
} as const;

/** Interface for breadcrumb items in Drive navigation */
export interface DriveBreadcrumb {
	label: string;
	code: string | null;
}
