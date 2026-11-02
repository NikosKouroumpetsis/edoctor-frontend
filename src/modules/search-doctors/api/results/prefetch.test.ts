import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';

// The read the prefetch starts: a stand-in, never the network.
const { fetchSearchResults } = vi.hoisted(() => ({ fetchSearchResults: vi.fn() }));
vi.mock('$modules/search-doctors/api/marketplace/search-source', () => ({ fetchSearchResults }));

import { readFreshDeviceLocation } from '$shared/state/device-location';
import { readResultsPress } from '$modules/search-doctors/lib/results-scope';
import { prefetchSearchResults as prefetchPress } from './prefetch';

/**
 * 🔴 U-32.1: the api reads ahead the press it is given; the pages read it off the address they go to with the
 * results' readers (`readResultsPress`). The guards below read the two together, as the pages do.
 */
const prefetchSearchResults = (client: QueryClient, href: string, lang: string, current?: URL) =>
	prefetchPress(client, readResultsPress(href, readFreshDeviceLocation(), current), lang);

const CARDIOLOGY =
	'what=Καρδιολόγος&whatKind=professional&whatId=p1&whatSlug=kardiologos&whatLabel=Καρδιολόγος';
const shown = (search: string) => new URL(`http://localhost/doctors?${search}`);

describe('search-doctors::api::results::prefetchSearchResults', () => {
	// A block, not an arrow's value: a function returned by `beforeEach` is run as the test's teardown.
	beforeEach(() => {
		fetchSearchResults.mockReset();
		fetchSearchResults.mockResolvedValue({
			total: 0,
			totalIsLowerBound: false,
			items: [],
			nextCursor: null,
			hasNextPage: false
		});
	});

	it('D-103 (NIT-r2-2): a press to the address already shown asks nothing — the page’s own read holds that key', () => {
		const client = new QueryClient();
		prefetchSearchResults(
			client,
			`/doctors?${CARDIOLOGY}&gender=FEMALE`,
			'el',
			shown(`${CARDIOLOGY}&gender=FEMALE`)
		);
		// The same search written in another order (or an old link's coordinates, dropped by the readers) is the same.
		prefetchSearchResults(
			client,
			`/doctors?gender=FEMALE&${CARDIOLOGY}`,
			'el',
			shown(`${CARDIOLOGY}&gender=FEMALE&whereLat=37.9&whereLng=23.6`)
		);
		expect(fetchSearchResults).not.toHaveBeenCalled();
		expect(client.getQueryCache().getAll()).toHaveLength(0);
	});

	it('D-103 (negative, NIT-r2-2): another address is asked at the press as before — a new filter, or the results from another page', () => {
		const client = new QueryClient();
		prefetchSearchResults(client, `/doctors?${CARDIOLOGY}&gender=FEMALE`, 'el', shown(CARDIOLOGY));
		expect(fetchSearchResults).toHaveBeenCalledTimes(1);
		expect(fetchSearchResults.mock.calls[0][1].filters).toMatchObject({ gender: 'FEMALE' });
		expect(fetchSearchResults.mock.calls[0][3]).toEqual({ cursor: undefined, limit: 5 });
		// The home (`/`) has no results on screen: the default search is asked as well.
		prefetchSearchResults(client, '/doctors', 'el', new URL('http://localhost/'));
		expect(fetchSearchResults).toHaveBeenCalledTimes(2);
	});
});
