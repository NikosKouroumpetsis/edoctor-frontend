import { getApiBaseUrl } from '$shared/config';

// Local, dependency-free placeholder served from `static/`. Used when the backend card
// has no image (every seeded doctor currently lacks one) so cards never render broken.
const PLACEHOLDER_IMAGE = '/doctor-placeholder.svg';

export type HttpQueryValue = string | number | boolean | undefined | null | (string | number)[];

export type HttpQueryParams = Record<string, HttpQueryValue>;

export type HttpGetOptions = {
	params?: HttpQueryParams;
	signal?: AbortSignal;
	/**
	 * Fetch implementation. The SSR streaming `load` passes SvelteKit's own `fetch` so the
	 * response is inlined into the streamed document (no client refetch) and promise
	 * rejection is handled by SvelteKit. Defaults to the global `fetch` in the browser.
	 */
	fetch?: typeof fetch;
};

/**
 * Backend response envelope shared by every `/api/v1/doctor/public/*` endpoint.
 */
export type ApiEnvelope<T> = {
	status: string;
	message?: string;
	data: T;
};

export class ApiError extends Error {
	readonly status: number;
	readonly url: string;

	constructor(message: string, status: number, url: string) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.url = url;
	}
}

/**
 * Authentication header seam. The public marketplace endpoints are anonymous today,
 * so this returns no headers. When a session token is introduced, return it here and
 * every API call picks it up without further changes.
 */
export function getAuthHeader(): Record<string, string> {
	return {};
}

/**
 * Resolves a media URL coming from the backend into something the image layer can render.
 *
 * - `null`/empty -> a neutral placeholder so cards never render a broken image.
 * - relative path -> joined onto the API origin (the host serving the relative asset).
 * - absolute URL -> returned untouched.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
	const trimmed = url?.trim();

	if (!trimmed) {
		return PLACEHOLDER_IMAGE;
	}

	if (/^https?:\/\//u.test(trimmed)) {
		return trimmed;
	}

	const origin = getApiOrigin();
	const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

	return `${origin}${normalizedPath}`;
}

function getApiOrigin(): string {
	const baseUrl = getApiBaseUrl();

	try {
		return new URL(baseUrl).origin;
	} catch {
		// Base URL without a parseable origin (should not happen with configured defaults).
		return baseUrl;
	}
}

function appendQueryParams(searchParams: URLSearchParams, params: HttpQueryParams) {
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null) {
			continue;
		}

		if (Array.isArray(value)) {
			for (const entry of value) {
				searchParams.append(key, String(entry));
			}
			continue;
		}

		searchParams.append(key, String(value));
	}
}

function buildUrl(path: string, params?: HttpQueryParams): string {
	const baseUrl = getApiBaseUrl();
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	const searchParams = new URLSearchParams();

	if (params) {
		appendQueryParams(searchParams, params);
	}

	const query = searchParams.toString();

	return `${baseUrl}${normalizedPath}${query ? `?${query}` : ''}`;
}

export async function httpGet<T>(path: string, options: HttpGetOptions = {}): Promise<T> {
	const url = buildUrl(path, options.params);
	const fetchImpl = options.fetch ?? fetch;

	let response: Response;

	try {
		response = await fetchImpl(url, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				...getAuthHeader()
			},
			signal: options.signal
		});
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'Network request failed';
		throw new ApiError(reason, 0, url);
	}

	if (!response.ok) {
		throw new ApiError(`Request failed with status ${response.status}`, response.status, url);
	}

	let envelope: ApiEnvelope<T>;

	try {
		envelope = (await response.json()) as ApiEnvelope<T>;
	} catch {
		throw new ApiError('Response was not valid JSON', response.status, url);
	}

	return envelope.data;
}
