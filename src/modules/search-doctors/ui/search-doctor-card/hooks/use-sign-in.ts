import type { Pathname } from '$app/types';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/**
 * A guest's heart and «Συνδεθείτε για κόστος» on a card (U-20, S-31.4, U-27.4): the sign-in page, pushed — the page
 * beneath it stays in the history (the results with their query). The web has no session yet. MINOR-6 (U-29): the
 * home's and the results' ONE way there.
 */
export function useSignIn(locale: () => SupportedLocale): () => void {
	return () => void goto(resolve(localizeHref('/login', { locale: locale() }) as Pathname));
}
