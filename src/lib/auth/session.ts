import type { Cookies } from '@sveltejs/kit';
import { generateToken, verifyToken } from './jwt';
import type { Database } from '$lib/database';
import type { Users } from '$lib/database/types';

export interface Session {
	user: Users;
	token: string;
	expiresAt: number;
}

const SESSION_COOKIE_NAME = 'faztore_session';

const cookieConfig = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: process.env.NODE_ENV === 'production',
	maxAge: 60 * 60 * 24 * 7 // 7 days
};

/**
 * Create a new session for a user
 */
export async function createSession(
	db: Database,
	userCode: string,
	cookies: Cookies
): Promise<Session | null> {
	try {
		// Get user from database
		const user = await db
			.selectFrom('users')
			.selectAll()
			.where('code', '=', userCode)
			.executeTakeFirst();

		if (!user) {
			console.error('User not found:', userCode);
			return null;
		}

		// Generate JWT token
		const token = generateToken({ userCode: user.code, email: user.email });
		const payload = verifyToken(token);

		if (!payload) {
			console.error('Failed to generate session token:', userCode);
			return null;
		}

		// Set session cookie
		cookies.set(SESSION_COOKIE_NAME, token, cookieConfig);

		// Update last login
		await db
			.updateTable('users')
			.set({ last_login: new Date() })
			.where('code', '=', userCode)
			.execute();

		return {
			user,
			token,
			expiresAt: payload.exp! * 1000
		};
	} catch (error) {
		console.error('Error creating session:', error);
		return null;
	}
}

/**
 * Get current session from cookies
 */
export async function getSession(db: Database, cookies: Cookies): Promise<Session | null> {
	try {
		const token = cookies.get(SESSION_COOKIE_NAME);
		if (!token) {
			return null;
		}

		// Verify token
		const payload = verifyToken(token);
		if (!payload) {
			destroySession(cookies);
			return null;
		}

		// Get fresh user data
		const user = await db
			.selectFrom('users')
			.selectAll()
			.where('code', '=', payload.userCode)
			.executeTakeFirst();

		if (!user) {
			destroySession(cookies);
			return null;
		}

		return {
			user,
			token,
			expiresAt: payload.exp! * 1000
		};
	} catch (error) {
		console.error('Error getting session:', error);
		destroySession(cookies);
		return null;
	}
}

/**
 * Destroy current session
 */
export function destroySession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

/**
 * Refresh session with new token
 */
export async function refreshSession(db: Database, cookies: Cookies): Promise<Session | null> {
	const currentSession = await getSession(db, cookies);
	if (!currentSession) {
		return null;
	}

	return createSession(db, currentSession.user.code, cookies);
}
