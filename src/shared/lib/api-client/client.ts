import createClient from 'openapi-fetch';

import type { paths } from '$generated/api/schema';
import { getApiBaseUrl } from '$shared/config';
import { ApiError } from '$shared/lib/http';

/**
 * Typed `openapi-fetch` client for the public doctor marketplace contract.
 *
 * This is a generic building block that mirrors `$shared/lib/http`: it centralizes
 * the base URL, the SSR `fetch` injection seam, and the response envelope/error
 * guard for the generated OpenAPI paths. `openapi-fetch` performs no runtime
 * validation, so the boundary guard here is what keeps external responses honest.
 */

/**
 * Base URL for the openapi-fetch client.
 *
 * The generated contract declares `servers[0].url = "/api/v1/doctor"` and its
 * operation paths are relative (e.g. `/public/doctors`). The frontend's
 * `getApiBaseUrl()` already returns the `{origin}/api/v1` prefix, so appending
 * `/doctor` yields request URLs identical to the ones the hand-written
 * `$shared/lib/http` client currently produces (`{origin}/api/v1/doctor` +
 * `/public/doctors`). Keep this reconciliation exact — no endpoint may move.
 */
export function getDoctorApiBaseUrl(): string {
	return `${getApiBaseUrl()}/doctor`;
}

/**
 * Creates a typed marketplace client. Pass SvelteKit's `fetch` from an SSR load
 * so the response is inlined into the streamed document; omit it in the browser
 * to fall back to the global `fetch`.
 */
export function createDoctorApiClient(fetchImpl?: typeof fetch) {
	return createClient<paths>({
		baseUrl: getDoctorApiBaseUrl(),
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
