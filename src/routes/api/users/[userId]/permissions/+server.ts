import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbInstance as db } from '$lib/config/server';

// GET - Fetch user permissions
export const GET: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user) {
		throw error(401, 'No autorizado');
	}

	const { userId } = params;

	try {
		// Fetch permissions for the user
		const permissions = await db
			.selectFrom('permissions')
			.selectAll()
			.where('user_code', '=', userId)
			.execute();

		return json({ permissions });
	} catch (err) {
		console.error('Error fetching permissions:', err);
		throw error(500, 'Error al obtener permisos');
	}
};

// POST - Update user permissions
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();
	if (!session?.user) {
		throw error(401, 'No autorizado');
	}

	const { userId } = params;

	try {
		const { permissions } = await request.json();

		// Delete existing permissions
		await db.deleteFrom('permissions').where('user_code', '=', userId).execute();

		// Insert new permissions
		if (permissions && permissions.length > 0) {
			const permissionsToInsert = permissions.map((p: { entity: string; user_action: string }) => ({
				user_code: userId,
				entity: p.entity,
				action: p.user_action
			}));

			await db.insertInto('permissions').values(permissionsToInsert).execute();
		}

		return json({
			success: true,
			count: permissions?.length || 0
		});
	} catch (err) {
		console.error('Error updating permissions:', err);
		throw error(500, 'Error al actualizar permisos');
	}
};
