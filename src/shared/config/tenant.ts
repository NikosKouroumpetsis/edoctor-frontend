import { env } from '$env/dynamic/public';

const DEFAULT_TENANT_SLUG = 'edoctor-seed-main';

/**
 * The tenant every sign-in request names (the application's `getTenantSlug`, the same default): `PUBLIC_TENANT_SLUG`
 * read at runtime, trimmed and lower-cased; without it the tenant of the seeded server.
 */
export function getTenantSlug(): string {
	const configured = env.PUBLIC_TENANT_SLUG?.trim().toLowerCase();
	return configured || DEFAULT_TENANT_SLUG;
}
