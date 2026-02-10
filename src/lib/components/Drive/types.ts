import type { DriveFileType } from '$lib/utils/drive';

export interface DriveFileItem {
	code: string;
	name: string;
	type: DriveFileType;
	size: number;
	tag: string | null;
	mime_type: string | null;
	storage_path: string | null;
	branch_code: string;
	parent_code: string | null;
	user_code: string;
	is_trashed: boolean;
	created_at: string;
	updated_at: string;
}
