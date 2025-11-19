import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends("branches:load");

	if (!(await locals.can("branches:read"))) {
		return { branches: [], users: [], title: "Sedes" };
	}

	try {
		const branches = await locals.db
			.selectFrom("branches")
			.selectAll()
			.orderBy("created_at", "desc")
			.execute();

		const users = await locals.db
			.selectFrom("users")
			.select(["code", "name", "last_name", "email"])
			.execute();

		return { branches, users, title: "Sedes" };
	} catch {
		return { branches: [], users: [], title: "Sedes" };
	}
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		if (!(await locals.can("branches:create"))) {
			return fail(403, { error: "No tienes permisos para crear sedes" });
		}

		const formData = await request.formData();
		const name = formData.get("name") as string;
		const state = formData.get("state") === "on";
		const selectedUsers = formData.getAll("selectedUsers") as string[];

		if (!name?.trim()) {
			return fail(400, { error: "El nombre es obligatorio" });
		}

		if (selectedUsers.length === 0) {
			return fail(400, { error: "Debe seleccionar al menos un usuario" });
		}

		try {
			await locals.db
				.insertInto("branches")
				.values({ name: name.trim(), state, users: selectedUsers })
				.execute();
			return { success: true, type: "success" };
		} catch (error) {
			const message = error instanceof Error ? error.message : "Error creando sede";
			return fail(400, { error: message });
		}
	},

	update: async ({ locals, request }) => {
		if (!(await locals.can("branches:update"))) {
			return fail(403, { error: "No tienes permisos para actualizar sedes" });
		}

		const formData = await request.formData();
		const branchCode = formData.get("code") as string;
		const name = formData.get("name") as string;
		const state = formData.get("state") === "on";
		const selectedUsers = formData.getAll("selectedUsers") as string[];

		if (!name?.trim()) {
			return fail(400, { error: "El nombre es obligatorio" });
		}

		if (selectedUsers.length === 0) {
			return fail(400, { error: "Debe seleccionar al menos un usuario" });
		}

		try {
			await locals.db
				.updateTable("branches")
				.set({ name: name.trim(), state, users: selectedUsers })
				.where("code", "=", branchCode)
				.execute();
			return { success: true, type: "success" };
		} catch (error) {
			const message = error instanceof Error ? error.message : "Error actualizando sede";
			return fail(400, { error: message });
		}
	},

	delete: async ({ locals, request }) => {
		if (!(await locals.can("branches:delete"))) {
			return fail(403, { error: "No tienes permisos para eliminar sedes" });
		}

		const formData = await request.formData();
		const branchCode = formData.get("code") as string;

		try {
			await locals.db.deleteFrom("branches").where("code", "=", branchCode).execute();
			return { success: true, type: "success" };
		} catch (error) {
			const message = error instanceof Error ? error.message : "Error eliminando sede";
			return fail(400, { error: message });
		}
	}
};
