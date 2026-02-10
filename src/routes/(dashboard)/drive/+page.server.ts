import type { PageServerLoad } from './$types';
import { DriveRepository } from '$lib/server/repositories/drive.repository';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('drive:load');

	if (!(await locals.can('drive:read'))) {
		return { title: 'Drive', branches: [] };
	}

	try {
		const branches = await DriveRepository.listAccessibleActiveBranches(locals.db, locals.user);
		return { title: 'Drive', branches };
	} catch {
		return { title: 'Drive', branches: [] };
	}
};
