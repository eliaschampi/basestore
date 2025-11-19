import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends("categories:load");

	if (!(await locals.can("categories:read"))) {
		return { categories: [], title: "Categorías" };
	}

	try {
		const categories = await locals.db
			.selectFrom("categories")
			.selectAll()
			.orderBy("name", "asc")
			.execute();
		return { categories, title: "Categorías" };
	} catch {
		return { categories: [], title: "Categorías" };
	}
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can("categories:create"))) {
			return fail(403, { error: "No tienes permisos para crear categorías" });
		}

		const formData = await request.formData();
		const name = formData.get("name") as string;
		const description = formData.get("description") as string;

		if (!name?.trim()) {
			return fail(400, { error: "El nombre es obligatorio" });
		}

		try {
			await locals.db
				.insertInto("categories")
				.values({
					name: name.trim(),
					description: description?.trim() || null
				})
				.execute();
			return { success: true, type: "success" };
		} catch (error) {
			const message = error instanceof Error ? error.message : "Error creando categoría";
			return fail(400, { error: message });
		}
	},

	update: async ({ locals, request }) => {
		if (!(await locals.can("categories:update"))) {
			return fail(403, { error: "No tienes permisos para actualizar categorías" });
		}

		const formData = await request.formData();
		const categoryCode = formData.get("code") as string;
		const name = formData.get("name") as string;
		const description = formData.get("description") as string;

		if (!name?.trim()) {
			return fail(400, { error: "El nombre es obligatorio" });
		}

		try {
			await locals.db
				.updateTable("categories")
				.set({
					name: name.trim(),
					description: description?.trim() || null,
					updated_at: new Date()
				})
				.where("code", "=", categoryCode)
				.execute();
			return { success: true, type: "success" };
		} catch (error) {
			const message = error instanceof Error ? error.message : "Error actualizando categoría";
			return fail(400, { error: message });
		}
	},

	delete: async ({ locals, request }) => {
		if (!(await locals.can("categories:delete"))) {
			return fail(403, { error: "No tienes permisos para eliminar categorías" });
		}

		const formData = await request.formData();
		const categoryCode = formData.get("code") as string;

		try {
			await locals.db.deleteFrom("categories").where("code", "=", categoryCode).execute();
			return { success: true, type: "success" };
		} catch (error) {
			const message = error instanceof Error ? error.message : "Error eliminando categoría";
			return fail(400, { error: message });
		}
	}
};
