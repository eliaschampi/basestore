import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyPassword } from '$lib/auth/password';
import { createSession } from '$lib/auth/session';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_BLOCK_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 10;
const DUMMY_BCRYPT_HASH = '$2a$10$7EqJtq98hPqEX7fNZaFWoOeN3rYQe4S1Qe7YQDdyCjTiMQuu2fo6e';

interface LoginAttemptState {
	firstAttemptAt: number;
	failedCount: number;
	blockedUntil: number;
}

const loginAttempts = new Map<string, LoginAttemptState>();

function getClientIp(request: Request): string {
	const forwardedFor = request.headers.get('x-forwarded-for');
	if (forwardedFor) {
		return forwardedFor.split(',')[0]?.trim() || 'unknown';
	}

	return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function getLoginAttemptKey(request: Request, email: string): string {
	return `${getClientIp(request)}:${email}`;
}

function cleanupLoginAttempts(now: number): void {
	if (loginAttempts.size < 2000) return;

	for (const [key, value] of loginAttempts) {
		if (value.blockedUntil < now - LOGIN_BLOCK_MS && value.firstAttemptAt < now - LOGIN_WINDOW_MS) {
			loginAttempts.delete(key);
		}
	}
}

function getAttemptState(key: string, now: number): LoginAttemptState {
	const existing = loginAttempts.get(key);
	if (!existing || now - existing.firstAttemptAt > LOGIN_WINDOW_MS) {
		const nextState: LoginAttemptState = {
			firstAttemptAt: now,
			failedCount: 0,
			blockedUntil: 0
		};
		loginAttempts.set(key, nextState);
		return nextState;
	}

	return existing;
}

function registerFailedAttempt(key: string, now: number): LoginAttemptState {
	const attemptState = getAttemptState(key, now);
	attemptState.failedCount += 1;

	if (attemptState.failedCount >= MAX_LOGIN_ATTEMPTS) {
		attemptState.blockedUntil = now + LOGIN_BLOCK_MS;
	}

	loginAttempts.set(key, attemptState);
	return attemptState;
}

function clearLoginAttempts(key: string): void {
	loginAttempts.delete(key);
}

export const load: PageServerLoad = async () => {
	return {
		title: 'Iniciar Sesión'
	};
};

export const actions: Actions = {
	login: async ({ request, locals, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const password = formData.get('password')?.toString();
		const now = Date.now();

		cleanupLoginAttempts(now);

		// Validate input
		if (!email || !password) {
			return fail(400, {
				error: 'Email y contraseña son requeridos'
			});
		}

		if (!EMAIL_REGEX.test(email)) {
			return fail(400, {
				error: 'Email inválido'
			});
		}

		if (password.length < 6) {
			return fail(400, {
				error: 'La contraseña debe tener al menos 6 caracteres'
			});
		}

		const attemptKey = getLoginAttemptKey(request, email);
		const attemptState = getAttemptState(attemptKey, now);
		if (attemptState.blockedUntil > now) {
			return fail(429, {
				error: 'Demasiados intentos fallidos. Intenta nuevamente más tarde.'
			});
		}

		// Find user by email
		const user = await locals.db
			.selectFrom('users')
			.select(['code', 'email', 'password_hash'])
			.where('email', '=', email)
			.executeTakeFirst();

		if (!user) {
			// Keep a similar timing profile to avoid user enumeration.
			await verifyPassword(password, DUMMY_BCRYPT_HASH);
			registerFailedAttempt(attemptKey, now);
			return fail(401, {
				error: 'Credenciales inválidas'
			});
		}

		// Verify password
		const isValidPassword = await verifyPassword(password, user.password_hash);

		if (!isValidPassword) {
			registerFailedAttempt(attemptKey, now);
			return fail(401, {
				error: 'Credenciales inválidas'
			});
		}

		clearLoginAttempts(attemptKey);

		// Create session
		const session = await createSession(locals.db, user.code, cookies);

		if (!session) {
			return fail(500, {
				error: 'Error al crear la sesión'
			});
		}

		// Redirect to dashboard
		throw redirect(303, '/');
	}
};
