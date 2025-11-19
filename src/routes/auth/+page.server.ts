import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyPassword } from '$lib/auth/password';
import { createSession } from '$lib/auth/session';

export const load: PageServerLoad = async () => {
	return {
		title: 'Iniciar Sesión'
	};
};

export const actions: Actions = {
	login: async ({ request, locals, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString();
		const password = formData.get('password')?.toString();

		// Validate input
		if (!email || !password) {
			return fail(400, {
				error: 'Email y contraseña son requeridos'
			});
		}

		if (!email.includes('@')) {
			return fail(400, {
				error: 'Email inválido'
			});
		}

		if (password.length < 6) {
			return fail(400, {
				error: 'La contraseña debe tener al menos 6 caracteres'
			});
		}

		try {
			// Find user by email
			const user = await locals.db
				.selectFrom('users')
				.selectAll()
				.where('email', '=', email)
				.executeTakeFirst();

			if (!user) {
				return fail(401, {
					error: 'Credenciales inválidas'
				});
			}

			// Verify password
			const isValidPassword = await verifyPassword(password, user.password_hash);

			if (!isValidPassword) {
				return fail(401, {
					error: 'Credenciales inválidas'
				});
			}

			// Create session
			const session = await createSession(locals.db, user.code, cookies);

			if (!session) {
				return fail(500, {
					error: 'Error al crear la sesión'
				});
			}

			// Redirect to dashboard
			throw redirect(303, '/');
		} catch (error) {
			if (error instanceof Response) {
				throw error;
			}

			console.error('Login error:', error);
			return fail(500, {
				error: 'Error al iniciar sesión'
			});
		}
	}
};
