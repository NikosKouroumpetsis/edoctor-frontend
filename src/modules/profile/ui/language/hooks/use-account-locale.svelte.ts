import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import {
	accountLocaleQuery,
	updateAccountLocale,
	type AccountLocale
} from '$modules/profile/api/user';

/** How long a change of language waits for the account's write before it goes on without it. */
const WRITE_WAIT_MS = 3000;

/**
 * 🔴 D-W45-06: keeps the account's message language (`User.locale`) equal to the language a signed-in person picks on
 * this screen — the application's rule (`modules/profile/ui/locale/hooks/use-sync`): it writes ONLY when the stored one
 * differs (a write that changes nothing is a `422`), and an account with no profile yet gets one with the language. The
 * stored language is read as the section opens (personal: gone at a sign-out), so a choice finds it ready.
 */
export function useAccountLocale(options: { enabled: () => boolean }) {
	const client = useQueryClient();
	createQuery(() => ({ ...accountLocaleQuery(), enabled: browser && options.enabled() }));

	async function write(locale: AccountLocale) {
		const stored = await client.fetchQuery(accountLocaleQuery());
		if (stored.locale === locale) return;
		await updateAccountLocale(locale);
		client.setQueryData(accountLocaleQuery().queryKey, { locale });
	}

	return {
		/**
		 * Resolves once the language is written, refused or lost — or after the wait — and NEVER rejects: the language of
		 * the screen is the device's and changes all the same; the account's is tried again at the next change.
		 */
		keep(locale: AccountLocale): Promise<void> {
			if (!options.enabled()) return Promise.resolve();
			return new Promise((resolve) => {
				const timer = setTimeout(resolve, WRITE_WAIT_MS);
				void write(locale)
					.catch(() => undefined)
					.finally(() => {
						clearTimeout(timer);
						resolve();
					});
			});
		}
	};
}
