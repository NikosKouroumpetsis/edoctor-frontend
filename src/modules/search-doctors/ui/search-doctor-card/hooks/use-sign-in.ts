import type { Pathname } from '$app/types';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional, type SignInRequest } from '$shared/state/session';

/**
 * A guest's heart and «Συνδεθείτε για κόστος» on a card (U-20, S-31.4, U-27.4): 🔴 U-80.1 the sign-in opens over the
 * page, and what asked for it goes on after it (Ε4). The home's and the results' ONE way there (MINOR-6, U-29). Outside
 * the auth host (a slice alone) the sign-in page, pushed: the page beneath it stays in the history.
 */
export function useSignIn(locale: () => SupportedLocale): (request?: SignInRequest) => void {
	const session = getSessionOptional();
	return (request) => {
		if (session) session.requireSignIn(request);
		else void goto(resolve(localizeHref('/login', { locale: locale() }) as Pathname));
	};
}
