import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DoctorPublicMarketplaceLocationSuggestionsResponseView } from '$shared/lib/api-client';
import { getDoctorOnboardingTown, mapDoctorOnboardingTown } from '.';

// The catalogue's answer as far as the town reads it, or broken: typed as the contract's answer it is not.
const wire = (value: unknown) => value as DoctorPublicMarketplaceLocationSuggestionsResponseView;

afterEach(() => vi.unstubAllGlobals());

describe('doctor-onboarding · api/town (B-8, D-W3-12: our own catalogue, no Google)', () => {
	it('the first place’s point; none, or one no map of Greece shows, is none', () => {
		expect(
			mapDoctorOnboardingTown(wire({ items: [{ latitude: 37.94, longitude: 23.64 }] }))
		).toEqual({
			latitude: 37.94,
			longitude: 23.64
		});
		expect(mapDoctorOnboardingTown(wire({ items: [] }))).toBeNull();
		expect(
			mapDoctorOnboardingTown(wire({ items: [{ latitude: 51.5, longitude: -0.1 }] }))
		).toBeNull();
		expect(mapDoctorOnboardingTown(null)).toBeNull();
		expect(mapDoctorOnboardingTown(wire({ items: 'Πειραιάς' }))).toBeNull();
		expect(mapDoctorOnboardingTown(wire({ items: [null] }))).toBeNull();
		expect(
			mapDoctorOnboardingTown(wire({ items: [{ latitude: '37.9', longitude: 23.6 }] }))
		).toBeNull();
	});

	it('a public read, without the cookies: the town, one place, the language', async () => {
		const calls: { url: string; init: RequestInit }[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string, init: RequestInit) => {
				calls.push({ url, init });
				return new Response(JSON.stringify({ status: 'success', data: { items: [] } }));
			})
		);
		await getDoctorOnboardingTown({ town: 'Πειραιάς', locale: 'el' });
		const url = new URL(calls[0].url);
		expect(url.pathname).toMatch(/\/doctor\/public\/locations\/suggestions$/u);
		expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'Πειραιάς', limit: '1', lang: 'el' });
		expect(calls[0].init.credentials).toBe('omit');
	});
});
