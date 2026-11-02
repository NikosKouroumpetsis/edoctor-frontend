import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import SearchResults from './index.svelte';

// The page as the SERVER draws it: `browser` off, so the read is off (the app's `enabled: browser`).
vi.mock('$app/environment', () => ({
	browser: false,
	dev: false,
	building: false,
	version: 'test'
}));
const { fetchSearchResults } = vi.hoisted(() => ({ fetchSearchResults: vi.fn() }));
vi.mock('$modules/search-doctors/api/marketplace/search-source', () => ({ fetchSearchResults }));
const { fetchFilterFacets } = vi.hoisted(() => ({ fetchFilterFacets: vi.fn() }));
vi.mock('$modules/search-doctors/api/marketplace/facets-source', () => ({ fetchFilterFacets }));

const CARDIOLOGY =
	'what=Καρδιολόγος&whatKind=professional&whatId=p1&whatSlug=kardiologos&whatLabel=Καρδιολόγος';

afterEach(() => {
	cleanup();
	(page as { url: URL }).url = new URL('http://localhost/doctors');
});

describe('search-doctors::ui::search-results (the server’s drawing)', () => {
	it('§7.7 (NIT-9 of r1): without the server’s first page (its read failed) the server draws the skeletons — the browser asks at once', () => {
		(page as { url: URL }).url = new URL(`http://localhost/doctors?${CARDIOLOGY}`);
		render(QueryHarness, {
			props: { component: SearchResults, props: { data: { firstPage: null, serverNow: null } } }
		});
		expect(screen.getByTestId('results-page')).toHaveAttribute('data-view', 'loading');
		expect(document.querySelectorAll('[data-slot="results-card-skeleton"]')).toHaveLength(4);
		// (negative) never the error the hydration would replace, and nothing read on the server
		expect(screen.queryByTestId('results-error')).toBeNull();
		expect(fetchSearchResults).not.toHaveBeenCalled();
	});
});
