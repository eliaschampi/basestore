import type { Database } from "$lib/database";
import type { PermissionKey } from "$lib/stores/permissions.ts";

/**
 * Get user permissions from database
 */
export async function getUserPermissions(db: Database, userCode: string): Promise<PermissionKey[]> {
	try {
		const permissions = await db
			.selectFrom("permissions")
			.select(["entity", "action"])
			.where("user_code", "=", userCode)
			.execute();

		return permissions.map((p: { entity: string; action: string }) => `${p.entity}:${p.action}`);
	} catch (error) {
		console.error("Error fetching user permissions:", error);
		return [];
	}
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(permissions: PermissionKey[], permissionKey: string): boolean {
	return permissions.includes(permissionKey);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
	permissions: PermissionKey[],
	...permissionKeys: string[]
): boolean {
	return permissionKeys.some((key) => permissions.includes(key));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
	permissions: PermissionKey[],
	...permissionKeys: string[]
): boolean {
	return permissionKeys.every((key) => permissions.includes(key));
}
