import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const db = locals.db;
	const canReadAnyEntity = locals.userPermissions.some((permission) =>
		permission.endsWith(':read')
	);
	const canViewDashboard = (await locals.can('dashboard:read')) || canReadAnyEntity;

	if (!canViewDashboard) {
		return {
			title: 'Dashboard',
			stats: {
				users: 0,
				branches: 0,
				categories: 0,
				brands: 0
			}
		};
	}

	const [usersCount, branchesCount, categoriesCount, brandsCount] = await Promise.all([
		db
			.selectFrom('users')
			.select((eb) => eb.fn.count('code').as('count'))
			.executeTakeFirst(),
		db
			.selectFrom('branches')
			.select((eb) => eb.fn.count('code').as('count'))
			.executeTakeFirst(),
		db
			.selectFrom('categories')
			.select((eb) => eb.fn.count('code').as('count'))
			.executeTakeFirst(),
		db
			.selectFrom('brands')
			.select((eb) => eb.fn.count('code').as('count'))
			.executeTakeFirst()
	]);

	return {
		title: 'Dashboard',
		stats: {
			users: Number(usersCount?.count || 0),
			branches: Number(branchesCount?.count || 0),
			categories: Number(categoriesCount?.count || 0),
			brands: Number(brandsCount?.count || 0)
		}
	};
};
