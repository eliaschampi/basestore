import { error } from '@sveltejs/kit';
import type { SessionUser } from '$lib/auth/session';
import type { Database } from '$lib/database';

export interface DriveBranchOption {
	code: string;
	name: string;
	state: boolean;
}

interface BranchAccessRow extends DriveBranchOption {
	users: string[];
}

interface BranchScopedFile {
	code: string;
	branch_code: string;
}

export class DriveRepository {
	static async listAccessibleActiveBranches(
		db: Database,
		user: SessionUser | null
	): Promise<DriveBranchOption[]> {
		const branches = await db
			.selectFrom('branches')
			.select(['code', 'name', 'state', 'users'])
			.where('state', '=', true)
			.orderBy('name', 'asc')
			.execute();

		return this.filterBranchesByUser(branches, user).map(({ code, name, state }) => ({
			code,
			name,
			state
		}));
	}

	static async assertBranchAccess(
		db: Database,
		user: SessionUser | null,
		branchCode: string
	): Promise<void> {
		const branch = await db
			.selectFrom('branches')
			.select(['code', 'name', 'state', 'users'])
			.where('code', '=', branchCode)
			.executeTakeFirst();

		if (!branch) {
			throw error(404, 'Sede no encontrada');
		}

		if (user?.is_super_admin) {
			return;
		}

		const hasAccess = !!user?.code && branch.users.includes(user.code);
		if (!hasAccess) {
			throw error(403, 'No tienes acceso a esta sede');
		}
	}

	static async assertFileAccess(
		db: Database,
		user: SessionUser | null,
		fileCode: string
	): Promise<BranchScopedFile> {
		const file = await db
			.selectFrom('drive_files')
			.select(['code', 'branch_code'])
			.where('code', '=', fileCode)
			.executeTakeFirst();

		if (!file) {
			throw error(404, 'Archivo no encontrado');
		}

		await this.assertBranchAccess(db, user, file.branch_code);
		return file;
	}

	private static filterBranchesByUser(
		branches: BranchAccessRow[],
		user: SessionUser | null
	): BranchAccessRow[] {
		if (user?.is_super_admin) {
			return branches;
		}

		if (!user?.code) {
			return [];
		}

		return branches.filter((branch) => branch.users.includes(user.code));
	}
}
