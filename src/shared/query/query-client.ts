import { browser } from '$app/environment';
import { QueryClient } from '@tanstack/svelte-query';

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser,
				staleTime: 30_000,
				gcTime: 5 * 60_000,
				retry: 1
			},
			mutations: {
				retry: 0
			}
		}
	});
}

/**
 * What a read of one person's own facts wears (`meta`), so a sign-out leaves none of it in the tab, whichever module
 * owns the read: the session never needs to know them by name.
 */
export const personalQueryMeta = { personal: true } as const;

/** Forgets every read marked `personalQueryMeta`. */
export function removePersonalQueries(client: QueryClient) {
	client.removeQueries({ predicate: (query) => query.meta?.personal === true });
}

/**
 * Another account in this tab, with no guest in between: the same reads, shown right now by what is on the screen, have
 * another owner. Their answers go at once, and those on the screen ask again for the new one. A removal would not do: a
 * read still being watched keeps showing what it had.
 */
export function resetPersonalQueries(client: QueryClient) {
	return client.resetQueries({ predicate: (query) => query.meta?.personal === true });
}
