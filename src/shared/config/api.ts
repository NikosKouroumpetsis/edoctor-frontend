const DEFAULT_API_URL = 'http://localhost:8081/api/v1';

function stripTrailingSlash(value: string): string {
	return value.endsWith('/') ? value.slice(0, -1) : value;
}

/**
 * Resolves the marketplace API base URL for the public doctor endpoints
 * (`/api/v1/doctor/public/*`).
 *
 * Precedence:
 * 1. `PUBLIC_API_BASE_URL` when provided (deploy host, LAN IP, etc.). It is public
 *    by design: the same value is used server-side (SSR streaming load) and in the
 *    browser (TanStack Query refetch/filtering), so it must carry the `PUBLIC_` prefix.
 * 2. `http://localhost:8081/api/v1` for local development against the seed-mock server.
 *
 * The returned value never carries a trailing slash so callers can safely join paths.
 */
export function getApiBaseUrl(): string {
	const configured = import.meta.env.PUBLIC_API_BASE_URL?.trim();

	return stripTrailingSlash(configured || DEFAULT_API_URL);
}
