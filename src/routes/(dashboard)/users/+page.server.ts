import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const users = await locals.db
		.selectFrom("users")
		.select([
			"code",
			"name",
			"last_name",
			"email",
			"photo_url",
			"is_super_admin",
			"last_login",
			"created_at"
		])
		.orderBy("created_at", "desc")
		.execute();

	return {
		title: "Usuarios",
		users
	};
};
