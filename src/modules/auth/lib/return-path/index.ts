import { signInActions, type SignInAction } from '$shared/state/session';
import type { AuthLoginParams, AuthProvider } from '$modules/auth/types';

const MAX_PATH_LENGTH = 512;
const providers: readonly AuthProvider[] = ['google', 'apple'];
// The sign-in itself, in either language: a member never stays on it, so it is no way back (N-1).
const LOGIN_PATH = /^(?:\/(?:en|el))?\/login\/?$/u;

/**
 * 🔴 The way back of `/login?next=` (Π4): a path of this site only, so no address can send a signed-in visitor away.
 * `/…`, never `//…`, `/\…`, a scheme or a control character; anything else is no way back at all (open redirect).
 */
export function readSafeNext(value: string | null | undefined): string | null {
	if (!value || value.length > MAX_PATH_LENGTH) return null;
	if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
	// eslint-disable-next-line no-control-regex -- the point of the check: a tab or a line break hides a second slash
	if (/[\u0000-\u001f\u007f\\]/u.test(value)) return null;
	try {
		// What a browser would make of it must stay on the same origin, and on the same path.
		const probe = new URL(value, 'https://edoctor.invalid');
		if (probe.origin !== 'https://edoctor.invalid') return null;
		// S-2: the dots are cleaned away by the parser: `/.//evil.com` comes out as `//evil.com`, another host.
		if (probe.pathname.startsWith('//') || LOGIN_PATH.test(probe.pathname)) return null;
		return `${probe.pathname}${probe.search}${probe.hash}`;
	} catch {
		return null;
	}
}

/** `do` is a closed list, never free text. */
export function readSignInAction(value: string | null | undefined): SignInAction | null {
	return signInActions.find((action) => action === value) ?? null;
}

// The actions that WRITE when they go on: the doctor's «Ξεκινήστε» starts a sign-up (`POST /doctor/onboarding/start`).
const WRITING_ACTIONS: readonly SignInAction[] = ['doctor'];

/**
 * 🔴 D-W3-37 (security web MAJOR-1): the action the `/login` page hands on, from the address (`do=`) and from what THIS
 * tab wrote before it left for a provider (`takePendingReturn`). One that writes goes on only from the tab's own return —
 * never from an address alone, which anyone can send; the others only show again what was asked (a toast, a window).
 */
export function readResumedAction(
	fromAddress: SignInAction | null,
	fromTab: SignInAction | null
): SignInAction | null {
	const action = fromAddress ?? fromTab;
	if (action && WRITING_ACTIONS.includes(action) && fromTab !== action) return null;
	return action;
}

/** `error` and `via` name a provider from a closed list, never free text. */
export function readProvider(value: string | null | undefined): AuthProvider | null {
	return providers.find((provider) => provider === value) ?? null;
}

/** The `/login` address's parts, each checked (the route's `load`). */
export function readLoginParams(search: URLSearchParams): AuthLoginParams {
	return {
		next: readSafeNext(search.get('next')),
		action: readSignInAction(search.get('do')),
		error: readProvider(search.get('error')),
		via: readProvider(search.get('via'))
	};
}

/** `/login?next=…&do=…` on `loginPath` (already in the page's language), only with what passes the checks. */
export function buildLoginHref(
	loginPath: string,
	{
		next,
		action,
		via
	}: { next?: string | null; action?: SignInAction | null; via?: AuthProvider | null }
): string {
	const search = new URLSearchParams();
	const safeNext = readSafeNext(next);
	if (safeNext) search.set('next', safeNext);
	if (action) search.set('do', action);
	if (via) search.set('via', via);
	const query = search.toString();
	return query ? `${loginPath}?${query}` : loginPath;
}

/** A pending return as the tab keeps it (only the action and the path, no personal fact): checked when read back. */
export function sanitizeStoredReturn(
	value: unknown
): { next: string | null; action: SignInAction | null } | null {
	if (!value || typeof value !== 'object') return null;
	const candidate = value as { next?: unknown; action?: unknown };
	const next = typeof candidate.next === 'string' ? readSafeNext(candidate.next) : null;
	const action = typeof candidate.action === 'string' ? readSignInAction(candidate.action) : null;
	return next || action ? { next, action } : null;
}
