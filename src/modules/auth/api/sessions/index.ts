import { queryOptions } from '@tanstack/svelte-query';
import type { AccountSessionsView, ApiRequestBody } from '$shared/lib/api-client';
import { ApiError, httpSessionGet, httpSessionPost } from '$shared/lib/http';
import { isUuid } from '$shared/lib/ids';
import { personalQueryMeta } from '$shared/query';
import { authQueryKeys } from '$modules/auth/api/session';

const SESSIONS_PATH = '/auth/sessions/me';
// The server lists at most the 50 newest (`w45-b3`); a longer answer is cut there.
const SESSIONS_MAX = 50;

/** The three closed vocabularies a device is told in (D-W45-35); anything else the server may say is `OTHER`. */
export const sessionDeviceKinds = ['APP', 'WEB'] as const;
export const sessionDeviceSystems = [
	'IOS',
	'IPADOS',
	'ANDROID',
	'MACOS',
	'WINDOWS',
	'LINUX'
] as const;
export const sessionDeviceBrowsers = ['CHROME', 'SAFARI', 'FIREFOX', 'EDGE'] as const;

export type SessionDeviceKind = (typeof sessionDeviceKinds)[number] | 'OTHER';
export type SessionDeviceSystem = (typeof sessionDeviceSystems)[number] | 'OTHER';
export type SessionDeviceBrowser = (typeof sessionDeviceBrowsers)[number] | 'OTHER';

/**
 * Wave 4.5 · screen 59 (D-W45-35, D-W45-40): one device the account is signed in from — its stable id (the only
 * identifier of a session the page ever holds; it travels in the path of «Αποσύνδεση» alone), whether it is THIS one,
 * when it was last active (an instant, `null` for one the server did not tell) and the three words of the device.
 * Never a User-Agent, an address or a token.
 */
export type AccountSessionFacts = {
	sessionId: string;
	current: boolean;
	lastActiveAt: number | null;
	kind: SessionDeviceKind;
	os: SessionDeviceSystem;
	browser: SessionDeviceBrowser | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const wordOf = <Word extends string>(words: readonly Word[], value: unknown): Word | 'OTHER' =>
	words.find((word) => word === value) ?? 'OTHER';

function mapSession(entry: Record<string, unknown>): AccountSessionFacts | null {
	const { sessionId } = entry;
	if (typeof sessionId !== 'string' || !isUuid(sessionId)) return null;
	const instant = typeof entry.lastActiveAt === 'string' ? Date.parse(entry.lastActiveAt) : NaN;
	return {
		sessionId,
		current: entry.current === true,
		lastActiveAt: Number.isFinite(instant) ? instant : null,
		kind: wordOf(sessionDeviceKinds, entry.kind),
		os: wordOf(sessionDeviceSystems, entry.os),
		browser:
			entry.browser === null || entry.browser === undefined
				? null
				: wordOf(sessionDeviceBrowsers, entry.browser)
	};
}

/**
 * The server's answer as the page's facts. 🔴 U-65.6: read at the boundary — an answer with no list is no answer
 * (`null`); an entry whose id is not the server's (a UUID), or told twice, is dropped; a word outside a vocabulary is
 * `OTHER`, never the word itself; one device at most is THIS one, and it comes first (D-W45-40).
 */
export function mapAccountSessions(answer: unknown): AccountSessionFacts[] | null {
	if (!isRecord(answer) || !Array.isArray(answer.sessions)) return null;
	const seen = new Set<string>();
	const sessions = answer.sessions
		.slice(0, SESSIONS_MAX)
		.filter(isRecord)
		.flatMap((entry) => {
			const session = mapSession(entry);
			if (!session || seen.has(session.sessionId)) return [];
			seen.add(session.sessionId);
			return [session];
		});
	const here = sessions.findIndex((session) => session.current);
	return [
		...sessions.filter((_, index) => index === here),
		...sessions
			.filter((_, index) => index !== here)
			.map((session) => ({ ...session, current: false }))
	];
}

/**
 * The account's live sessions (`GET /auth/sessions/me`), read in the browser for a member; 🔴 U-65.6: personal, gone
 * at a sign-out. An answer the page cannot read is a failed read.
 */
export function accountSessionsQuery() {
	return queryOptions({
		queryKey: authQueryKeys.accountSessions(),
		queryFn: async ({ signal }) => {
			const sessions = mapAccountSessions(
				await httpSessionGet<AccountSessionsView>(SESSIONS_PATH, { signal })
			);
			if (!sessions) throw new Error('The sessions could not be read');
			return sessions;
		},
		meta: personalQueryMeta
	});
}

/**
 * «Αποσύνδεση» of ANOTHER device (`POST /auth/sessions/me/:sessionId/end`, D-W45-33): the body is empty by contract and
 * the id — the server's own, checked again here — is in the request's path alone. Nothing of the answer leaves `api/`.
 */
export async function endAccountSession(sessionId: string): Promise<void> {
	if (!isUuid(sessionId)) throw new ApiError('Not a session id', 404, SESSIONS_PATH);
	const body: ApiRequestBody<'endMySession'> = {};
	await httpSessionPost<unknown>(`${SESSIONS_PATH}/${encodeURIComponent(sessionId)}/end`, { body });
}

/**
 * Why a device was not signed out (the server's table, `w45-b3`): it is signed in no more — unknown, another account's,
 * already over, all answered the same (`gone`: the list is read again, with no word of failure) — it is THIS device
 * (`current`), too many tries, the session — else «it did not go through».
 */
export type SessionEndFailure = 'gone' | 'current' | 'rate-limited' | 'session' | 'unknown';

const SESSION_REFUSED_ERROR_CODE = 'EC401';
const CURRENT_SESSION = /SESSION_END_REFUSED:CURRENT_SESSION\b/u;

/** A refused end, by the server's own code. Only `EC401`, the session gate's refusal, means the session is gone. */
export function readSessionEndFailure(error: unknown): SessionEndFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	if (error.status === 401 && error.errorCode === SESSION_REFUSED_ERROR_CODE) return 'session';
	if (error.status === 404) return 'gone';
	if (error.status === 403 && CURRENT_SESSION.test(error.message)) return 'current';
	if (error.status === 429) return 'rate-limited';
	return 'unknown';
}
