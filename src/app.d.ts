// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Database } from "$lib/database";
import type { Session } from "$lib/auth/session";
import type { Users } from "$lib/database/types";
import type { PermissionKey } from "$lib/stores/permissions.ts";

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}

		interface Locals {
			db: Database;
			session: Session | null;
			user: Users | null;
			userPermissions: PermissionKey[];
			can: (permissionKey: string) => Promise<boolean>;
		}

		interface PageData {
			user?: Users | null;
			userPermissions?: PermissionKey[];
		}

		// interface PageState {}
		// interface Platform {}
	}
}

export {};
