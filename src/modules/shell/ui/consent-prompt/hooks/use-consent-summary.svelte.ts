import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { consentSummaryLine } from '$modules/shell/lib/consent';
import { useConsentTools } from './use-consent-tools.svelte';

/**
 * 🔴 D-W45-28: the line of the row «Εργαλεία τρίτων και cookies» (screen 62), from the same catalogue and the same
 * decision as the cookie card. `null` until it can be said truthfully: the browser's storage not read yet, or a stored
 * decision whose catalogue has not answered (no decision at all needs no catalogue: «Μόνο τα απαραίτητα»). `enabled`:
 * the row is on the page — off it, nothing is asked of the server and nothing is said.
 */
export function useConsentSummary(locale: () => SupportedLocale, enabled: () => boolean) {
	const consent = useConsentTools({ enabled });
	const line = $derived.by(() => {
		if (!enabled() || !consent.read) return null;
		if (consent.snapshot && !consent.registry) return null;
		return consentSummaryLine(consent.tools, consent.snapshot, locale());
	});
	return {
		get line() {
			return line;
		}
	};
}
