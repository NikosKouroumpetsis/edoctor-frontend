import createClient from 'openapi-fetch';

import type { paths } from '$generated/api/schema';
import { getApiBaseUrl } from '$shared/config';
import { ApiError } from '$shared/lib/http';

/**
 * Typed `openapi-fetch` client for the backend's OpenAPI contract.
 *
 * This is a generic building block that mirrors `$shared/lib/http`: it centralizes
 * the base URL, the SSR `fetch` injection seam, and the response envelope/error
 * guard for the generated OpenAPI paths. `openapi-fetch` performs no runtime
 * validation, so the boundary guard here is what keeps external responses honest.
 */

/**
 * Creates the typed API client. The contract declares `servers[0].url = "/api/v1"`
 * and every operation path carries its module segment (e.g. `/doctor/public/doctors`),
 * so the base URL is exactly `getApiBaseUrl()` and request URLs stay identical to the
 * hand-written `$shared/lib/http` client — no endpoint may move. Pass SvelteKit's
 * `fetch` from an SSR load so the response is inlined into the streamed document;
 * omit it in the browser to fall back to the global `fetch`.
 */
export function createApiClient(fetchImpl?: typeof fetch) {
	return createClient<paths>({
		baseUrl: getApiBaseUrl(),
		fetch: fetchImpl,
		headers: { Accept: 'application/json' }
	});
}

/**
 * Every marketplace endpoint wraps its payload in `{ status, message, data }`.
 * `unwrapEnvelope` reproduces the `$shared/lib/http` boundary contract for
 * openapi-fetch results: it enforces a successful response and a well-formed
 * envelope, throwing `ApiError` otherwise, and returns the inner `data` payload.
 */
export function unwrapEnvelope<T>(
	result: { data?: { data: T }; error?: unknown; response: Response },
	url: string
): T {
	if (!result.response.ok) {
		throw new ApiError(
			`Request failed with status ${result.response.status}`,
			result.response.status,
			url
		);
	}

	const envelope = result.data;

	if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) {
		throw new ApiError('Response was not a valid API envelope', result.response.status, url);
	}

	return envelope.data;
}
