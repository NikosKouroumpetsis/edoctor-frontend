import { describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/svelte-query';
import { resolveSimilarDoctorsArea } from './resolvers';
import type { MarketplaceLocationSuggestion } from './types';

const { getLocationSuggestions } = vi.hoisted(() => ({ getLocationSuggestions: vi.fn() }));
vi.mock('./endpoints', () => ({
	getDoctorSuggestions: vi.fn(),
	getFacets: vi.fn(),
	getLocationSuggestions
}));

/** A query client whose `fetchQuery` simply runs the read (the application's stub). */
function queryClientStub(): QueryClient {
	return {
		fetchQuery: vi.fn(({ queryFn }: { queryFn: (context: { signal?: AbortSignal }) => unknown }) =>
			Promise.resolve(queryFn({ signal: undefined }))
		)
	} as unknown as QueryClient;
}

function suggestion(slug: string, label: string): MarketplaceLocationSuggestion {
	return {
		slug,
		type: 'municipality',
		label,
		displayName: label,
		context: null,
		hierarchy: { region: null, regionalUnit: null, municipality: null },
		latitude: 37.94,
		longitude: 23.65
	};
}

describe('search-doctors::api::marketplace resolveSimilarDoctorsArea — U-37.2 (app = web)', () => {
	it('MAJOR-2 of r1: reads the active office’s city as the location the search applies — its slug, its own words, its type', async () => {
		getLocationSuggestions.mockResolvedValue({
			items: [suggestion('dimos-peiraia', 'Πειραιάς')],
			language: 'el'
		});
		await expect(
			resolveSimilarDoctorsArea(queryClientStub(), ' Πειραιάς ', { lang: 'el' })
		).resolves.toEqual({ label: 'Πειραιάς', locationType: 'municipality', slug: 'dimos-peiraia' });
		expect(getLocationSuggestions).toHaveBeenCalledWith(
			{ query: 'Πειραιάς', lang: 'el' },
			expect.objectContaining({ fetch: undefined })
		);
	});

	it('MAJOR-2 of r1: an office without a city is no area — and nothing is asked', async () => {
		await expect(resolveSimilarDoctorsArea(queryClientStub(), '  ')).resolves.toBeNull();
		await expect(resolveSimilarDoctorsArea(queryClientStub(), undefined)).resolves.toBeNull();
		expect(getLocationSuggestions).not.toHaveBeenCalled();
	});

	it('MAJOR-2 of r1: a city no location resolves is no area, so the search shows none', async () => {
		getLocationSuggestions.mockResolvedValue({ items: [], language: 'el' });
		await expect(resolveSimilarDoctorsArea(queryClientStub(), 'Ατλαντίδα')).resolves.toBeNull();
	});
});
