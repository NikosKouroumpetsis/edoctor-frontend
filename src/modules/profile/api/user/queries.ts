import { queryOptions } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { profileQueryKeys } from '$modules/profile/api/keys';
import { getAccountProfile } from './endpoints';
import { mapAccountLocale, mapAccountPerson } from './map';

/**
 * 🔴 U-65.6 / U-169: the account's language, read in the browser only and gone at a sign-out (`personalQueryMeta`); the
 * cache keeps the `locale` alone, nothing else of the profile.
 */
export function accountLocaleQuery() {
	return queryOptions({
		queryKey: profileQueryKeys.accountLocale(),
		queryFn: async ({ signal }) => mapAccountLocale(await getAccountProfile(signal)),
		meta: personalQueryMeta
	});
}

/**
 * Wave 4.5 · screen 58: the gender and the date of birth of «Προσωπικά στοιχεία», read in the browser only and gone at a
 * sign-out (`personalQueryMeta`); the cache keeps those two alone (🔴 U-169).
 */
export function accountPersonQuery() {
	return queryOptions({
		queryKey: profileQueryKeys.accountPerson(),
		queryFn: async ({ signal }) => mapAccountPerson(await getAccountProfile(signal)),
		meta: personalQueryMeta
	});
}
