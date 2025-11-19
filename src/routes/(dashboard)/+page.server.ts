import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const db = locals.db;

	// Get statistics
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
