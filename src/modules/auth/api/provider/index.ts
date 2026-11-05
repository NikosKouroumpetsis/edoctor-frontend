import { getApiBaseUrl, getTenantSlug } from '$shared/config';
import type { AuthLegalAcceptance, AuthProvider } from '$modules/auth/types';

/**
 * The address a provider's sign-in starts at (`P-B-backend.md` §8.3, `19-login/proto-notes.md` §Backend): a whole-page
 * visit, no script of Google or Apple on our pages. `redirectUrl` is an absolute address of this site (the API's own
 * list checks it), `legalAcceptance` one JSON string.
 */
export function providerStartUrl(
	provider: AuthProvider,
	{ redirectUrl, legalAcceptance }: { redirectUrl: string; legalAcceptance: AuthLegalAcceptance }
): string {
	const search = new URLSearchParams({
		tenantSlug: getTenantSlug(),
		redirectUrl,
		legalAcceptance: JSON.stringify(legalAcceptance)
	});
	return `${getApiBaseUrl()}/auth/register/${provider}?${search.toString()}`;
}

/** The whole page goes to the provider's start; it comes back to the `redirectUrl`. */
export function leaveFor(url: string) {
	window.location.assign(url);
}
