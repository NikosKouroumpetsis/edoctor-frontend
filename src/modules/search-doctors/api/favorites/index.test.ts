import { QueryClient } from '@tanstack/svelte-query';
import { describe, expect, it } from 'vitest';
import { removePersonalQueries } from '$shared/query';
import { favoritesQueryKeys, patchFavoriteIds } from '.';

describe('search-doctors::api::favorites', () => {
	it('N-4: a press’s write that arrives after a sign-out is still marked personal, so it never reaches another account', () => {
		const client = new QueryClient();
		patchFavoriteIds(client, 'd1', true);
		expect(client.getQueryCache().find({ queryKey: favoritesQueryKeys.ids() })?.meta).toEqual({
			personal: true
		});
		removePersonalQueries(client);
		expect(client.getQueryData(favoritesQueryKeys.ids())).toBeUndefined();
	});
});
