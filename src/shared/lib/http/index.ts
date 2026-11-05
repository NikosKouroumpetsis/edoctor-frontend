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
	/** Extra headers of this read (a device's own key, never in the address). */
	headers?: Record<string, string>;
	/**
	 * `omit` unless named: a public read never carries the cookies, not even when SvelteKit's `fetch` would forward the
	 * browser's to an API on the page's hostname (U-34.4: what the server draws is the guest's, U-80.1 Ε6).
	 */
	credentials?: RequestCredentials;
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
	/** The backend's own code of a refusal (`EC011`, `USER_LOCKED`), read only by the session's calls. */
	readonly errorCode?: string;

	constructor(message: string, status: number, url: string, errorCode?: string) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.url = url;
		this.errorCode = errorCode;
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

/** The whole JSON envelope of a GET (`status`, `data` and, when the endpoint sends one, `meta`). */
async function readEnvelope<T>(
	path: string,
	options: HttpGetOptions
): Promise<ApiEnvelope<T> & { meta?: unknown }> {
	const url = buildUrl(path, options.params);
	const fetchImpl = options.fetch ?? fetch;

	let response: Response;

	try {
		response = await fetchImpl(url, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				...getAuthHeader(),
				...options.headers
			},
			credentials: options.credentials ?? 'omit',
			signal: options.signal
		});
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'Network request failed';
		throw new ApiError(reason, 0, url);
	}

	if (!response.ok) {
		throw new ApiError(`Request failed with status ${response.status}`, response.status, url);
	}

	try {
		return (await response.json()) as ApiEnvelope<T> & { meta?: unknown };
	} catch {
		throw new ApiError('Response was not valid JSON', response.status, url);
	}
}

export async function httpGet<T>(path: string, options: HttpGetOptions = {}): Promise<T> {
	return (await readEnvelope<T>(path, options)).data;
}

/**
 * A GET whose envelope also carries `meta` (a list's total, the filter it applied: the public articles, U-57.3);
 * `meta` is `null` when the endpoint sends none (an older backend).
 */
export async function httpGetWithMeta<T>(
	path: string,
	options: HttpGetOptions = {}
): Promise<{ data: T; meta: unknown }> {
	const envelope = await readEnvelope<T>(path, options);
	return { data: envelope.data, meta: envelope.meta ?? null };
}

export type HttpSessionOptions = {
	/** Query parameters of a read. */
	params?: HttpQueryParams;
	/** The JSON body of a write. */
	body?: unknown;
	signal?: AbortSignal;
};

/** The `{ errorCode, errorMessage }` a refusal carries, when it carries it. */
async function readRefusal(response: Response): Promise<{ code?: string; message?: string }> {
	try {
		const body = (await response.json()) as { errorCode?: unknown; errorMessage?: unknown };
		return {
			code: typeof body?.errorCode === 'string' ? body.errorCode : undefined,
			message: typeof body?.errorMessage === 'string' ? body.errorMessage.trim() : undefined
		};
	} catch {
		return {};
	}
}

/**
 * 🔴 U-80.1 Ε6: the ONE way a request of the browser carries the API's cookies (`credentials: 'include'`), only for
 * the session and for what is personal (`httpSessionGet`, `Post`, `Put`, `Delete`, `File`); every public read stays
 * anonymous, on the page's server too (`readEnvelope`, `credentials: 'omit'`). So these calls are made from the browser.
 */
async function sessionRequest<T>(
	method: 'GET' | 'POST' | 'PUT' | 'DELETE',
	path: string,
	options: HttpSessionOptions
): Promise<T> {
	const url = buildUrl(path, options.params);
	// A `PUT` or a `DELETE` that names everything in its address sends no body at all (the API refuses one, U-65.6).
	const sendsBody = method === 'POST' || options.body !== undefined;
	let response: Response;

	try {
		response = await fetch(url, {
			method,
			credentials: 'include',
			headers: {
				Accept: 'application/json',
				...(sendsBody ? { 'Content-Type': 'application/json' } : {})
			},
			...(sendsBody ? { body: JSON.stringify(options.body ?? {}) } : {}),
			signal: options.signal
		});
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'Network request failed';
		throw new ApiError(reason, 0, url);
	}

	if (!response.ok) {
		const refusal = await readRefusal(response);
		throw new ApiError(
			refusal.message || `Request failed with status ${response.status}`,
			response.status,
			url,
			refusal.code
		);
	}

	// `204`: done, and nothing to read.
	if (response.status === 204) return undefined as T;

	try {
		return ((await response.json()) as ApiEnvelope<T>).data;
	} catch {
		throw new ApiError('Response was not valid JSON', response.status, url);
	}
}

export function httpSessionGet<T>(path: string, options: HttpSessionOptions = {}): Promise<T> {
	return sessionRequest<T>('GET', path, options);
}

export function httpSessionPost<T>(path: string, options: HttpSessionOptions = {}): Promise<T> {
	return sessionRequest<T>('POST', path, options);
}

export function httpSessionPut<T>(path: string, options: HttpSessionOptions = {}): Promise<T> {
	return sessionRequest<T>('PUT', path, options);
}

export function httpSessionDelete<T = void>(
	path: string,
	options: HttpSessionOptions = {}
): Promise<T> {
	return sessionRequest<T>('DELETE', path, options);
}

/**
 * A file the session may read (U-84.5, the copy of a conversation): what comes back is kept as a `Blob` for the caller to
 * hand over, never read as JSON. A refusal carries its status and its code, as every session call's does.
 */
export async function httpSessionFile(path: string, signal?: AbortSignal): Promise<Blob> {
	const url = buildUrl(path);
	let response: Response;

	try {
		response = await fetch(url, { method: 'GET', credentials: 'include', signal });
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'Network request failed';
		throw new ApiError(reason, 0, url);
	}

	if (!response.ok) {
		const refusal = await readRefusal(response);
		throw new ApiError(
			refusal.message || `Request failed with status ${response.status}`,
			response.status,
			url,
			refusal.code
		);
	}

	return response.blob();
}

/**
 * A public write that names nobody (U-78, a device's vote): JSON in and out, never the site's cookies, the device's
 * own key in a header and so never in an address. A refusal carries its status, as a session's does.
 */
export async function httpPublicPut<T>(
	path: string,
	options: { body: unknown; headers?: Record<string, string>; signal?: AbortSignal }
): Promise<T> {
	const url = buildUrl(path);
	let response: Response;

	try {
		response = await fetch(url, {
			method: 'PUT',
			credentials: 'omit',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...options.headers
			},
			body: JSON.stringify(options.body),
			signal: options.signal
		});
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'Network request failed';
		throw new ApiError(reason, 0, url);
	}

	if (!response.ok) {
		const refusal = await readRefusal(response);
		throw new ApiError(
			refusal.message || `Request failed with status ${response.status}`,
			response.status,
			url,
			refusal.code
		);
	}

	try {
		return ((await response.json()) as ApiEnvelope<T>).data;
	} catch {
		throw new ApiError('Response was not valid JSON', response.status, url);
	}
}
