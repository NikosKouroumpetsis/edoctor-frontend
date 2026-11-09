import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import type {
	AddressSearchDetailsResponseView,
	AddressSearchSuggestionsResponseView
} from '$shared/lib/api-client';
import { ApiError } from '$shared/lib/http';
import {
	doctorOnboardingAddressSuggestionsQuery,
	pickDoctorOnboardingAddress,
	readDoctorOnboardingAddressFailure,
	searchDoctorOnboardingAddress
} from '.';
// The mappers are `api/`'s own (review w3-w6 R2 MINOR-1): the barrel no longer gives them out.
import { mapDoctorOnboardingAddressDetails, mapDoctorOnboardingAddressSuggestions } from './map';

const TOKEN = '3b241101-e2bb-4255-8caf-4136c566a962';
const PROOF = `v1.${'a'.repeat(30)}.${'0'.repeat(64)}`;
// What a broken or forged answer may hold, typed as the contract's answer it is not (W-4: the adapter's negatives).
const suggestionsWire = (value: unknown) => value as AddressSearchSuggestionsResponseView;
const detailsWire = (value: unknown) => value as AddressSearchDetailsResponseView;

afterEach(() => vi.unstubAllGlobals());

describe('doctor-onboarding · api/address-search (contract §5 B-7, D-W3-02, D-W3-33)', () => {
	it('the suggestions: at most five, an id and a main line each, the token only as a UUIDv4', () => {
		const row = (index: number) => ({
			placeId: `ChIJplace${index}xyz`,
			mainText: `Καραΐσκου ${index}`,
			secondaryText: 'Πειραιάς, Ελλάδα'
		});
		const answer = mapDoctorOnboardingAddressSuggestions({
			sessionToken: TOKEN,
			suggestions: [1, 2, 3, 4, 5, 6, 7].map(row)
		});
		expect(answer.sessionToken).toBe(TOKEN);
		expect(answer.suggestions).toHaveLength(5);
		expect(answer.suggestions[0]).toEqual(row(1));
	});

	it('(negative) a place id the office would refuse, no main line, a token that is no UUIDv4, a broken answer — left out', () => {
		const answer = mapDoctorOnboardingAddressSuggestions(
			suggestionsWire({
				sessionToken: 'not-a-token',
				suggestions: [
					{ placeId: 'short', mainText: 'x' },
					{ placeId: 'ChIJ/../../evil', mainText: 'x' },
					{ placeId: 'ChIJvalidvalid', mainText: '  ' },
					{ placeId: 'ChIJvalidvalid', mainText: '<img src=x onerror=alert(1)>', secondaryText: 7 },
					null
				]
			})
		);
		expect(answer.sessionToken).toBeNull();
		expect(answer.suggestions).toEqual([
			{ placeId: 'ChIJvalidvalid', mainText: '<img src=x onerror=alert(1)>', secondaryText: '' }
		]);
		expect(mapDoctorOnboardingAddressSuggestions(suggestionsWire('x'))).toEqual({
			sessionToken: null,
			suggestions: []
		});
	});

	it('the details: the street line, the code and town when Google names them, the point and the proof as it came', () => {
		expect(
			mapDoctorOnboardingAddressDetails({
				placeId: 'ChIJ2d0hA0e9oRQRs',
				streetLine: 'Καραΐσκου 74',
				postalCode: '18532',
				city: null,
				latitude: 37.9,
				longitude: 23.6,
				pointProof: PROOF
			})
		).toEqual({
			placeId: 'ChIJ2d0hA0e9oRQRs',
			streetLine: 'Καραΐσκου 74',
			postalCode: '18532',
			city: null,
			latitude: 37.9,
			longitude: 23.6,
			pointProof: PROOF
		});
		expect(
			mapDoctorOnboardingAddressDetails(
				detailsWire({
					placeId: 'ChIJ2d0hA0e9oRQRs',
					latitude: 1,
					longitude: 2,
					pointProof: 'forged'
				})
			)?.pointProof
		).toBeNull();
		expect(
			mapDoctorOnboardingAddressDetails(
				detailsWire({ placeId: 'ChIJ2d0hA0e9oRQRs', latitude: 'x' })
			)
		).toBeNull();
		expect(mapDoctorOnboardingAddressDetails(null)).toBeNull();
		expect(
			mapDoctorOnboardingAddressDetails(
				detailsWire({
					placeId: 'ChIJ2d0hA0e9oRQRs',
					streetLine: ['Καραΐσκου'],
					postalCode: 18532,
					city: { name: 'Πειραιάς' },
					latitude: 37.9,
					longitude: Number.POSITIVE_INFINITY,
					pointProof: PROOF
				})
			)
		).toBeNull();
		expect(
			mapDoctorOnboardingAddressDetails(
				detailsWire({
					placeId: 'ChIJ2d0hA0e9oRQRs',
					streetLine: ['Καραΐσκου'],
					postalCode: 18532,
					city: { name: 'Πειραιάς' },
					latitude: 37.9,
					longitude: 23.6,
					pointProof: 42
				})
			)
		).toEqual({
			placeId: 'ChIJ2d0hA0e9oRQRs',
			streetLine: '',
			postalCode: null,
			city: null,
			latitude: 37.9,
			longitude: 23.6,
			pointProof: null
		});
	});

	it('D-W3-02: a new search sends no token; every next request of it carries the one the server minted', async () => {
		const bodies: unknown[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_url: string, init: RequestInit) => {
				bodies.push(JSON.parse(String(init.body)));
				return new Response(JSON.stringify({ status: 'success', data: {} }));
			})
		);
		await searchDoctorOnboardingAddress({ input: 'Καρα', sessionToken: null });
		await searchDoctorOnboardingAddress({ input: 'Καραΐσκου', sessionToken: TOKEN });
		await pickDoctorOnboardingAddress({ placeId: 'ChIJ2d0hA0e9oRQRs', sessionToken: TOKEN });
		await pickDoctorOnboardingAddress({ placeId: 'ChIJ2d0hA0e9oRQRs', sessionToken: null });
		expect(bodies).toEqual([
			{ input: 'Καρα' },
			{ input: 'Καραΐσκου', sessionToken: TOKEN },
			{ placeId: 'ChIJ2d0hA0e9oRQRs', sessionToken: TOKEN },
			{ placeId: 'ChIJ2d0hA0e9oRQRs' }
		]);
	});

	it('🔴 review w3-w6 R2 MINOR-1: the pick answers FACTS — the server’s answer goes through the mapper inside the endpoint, a forged proof is none', async () => {
		const answers: unknown[] = [
			{
				placeId: 'ChIJ2d0hA0e9oRQRs',
				streetLine: ' Καραΐσκου 74 ',
				postalCode: '18532',
				city: 'Πειραιάς',
				latitude: 37.9,
				longitude: 23.6,
				pointProof: PROOF,
				formattedAddress: 'Καραΐσκου 74, Πειραιάς 185 32, Ελλάδα'
			},
			{ placeId: 'ChIJ2d0hA0e9oRQRs', latitude: 37.9, longitude: 23.6, pointProof: 'forged' }
		];
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ status: 'success', data: answers.shift() })))
		);
		const request = { placeId: 'ChIJ2d0hA0e9oRQRs', sessionToken: TOKEN };
		expect(await pickDoctorOnboardingAddress(request)).toEqual({
			placeId: 'ChIJ2d0hA0e9oRQRs',
			streetLine: 'Καραΐσκου 74',
			postalCode: '18532',
			city: 'Πειραιάς',
			latitude: 37.9,
			longitude: 23.6,
			pointProof: PROOF
		});
		expect((await pickDoctorOnboardingAddress(request))?.pointProof).toBeNull();
	});

	it('W-4 (negative, R2 MINOR-1): a pick whose answer is no place — none, no point, a list — is none, never a throw', async () => {
		for (const data of [null, { placeId: 'ChIJ2d0hA0e9oRQRs', latitude: 'x' }, []]) {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => new Response(JSON.stringify({ status: 'success', data })))
			);
			await expect(
				pickDoctorOnboardingAddress({ placeId: 'ChIJ2d0hA0e9oRQRs', sessionToken: null })
			).resolves.toBeNull();
		}
	});

	it('the refusals: outside Greece, the rate, the service, the session', () => {
		const refusal = (status: number, message: string) => new ApiError(message, status, '/x');
		expect(readDoctorOnboardingAddressFailure(refusal(422, 'ADDRESS_OUTSIDE_GREECE'))).toBe(
			'outside-greece'
		);
		expect(readDoctorOnboardingAddressFailure(refusal(429, 'x'))).toBe('rate-limited');
		expect(readDoctorOnboardingAddressFailure(refusal(503, 'ADDRESS_SEARCH_UNAVAILABLE'))).toBe(
			'unavailable'
		);
		expect(readDoctorOnboardingAddressFailure(refusal(401, 'x'))).toBe('session');
		expect(readDoctorOnboardingAddressFailure('x')).toBe('unknown');
	});
	it('🔴 review w3-w4 R1 MINOR-2 (D-W3-35): the same words are never asked again — no return to the tab, no new connection, no staleness brings a second request', () => {
		const session = { read: () => null, epoch: () => 0, keep: () => {} };
		const options = doctorOnboardingAddressSuggestionsQuery('Καραΐσκου', session);
		expect(options.refetchOnWindowFocus).toBe(false);
		expect(options.refetchOnReconnect).toBe(false);
		expect(options.staleTime).toBe(Infinity);
		expect(options.retry).toBe(0);
		expect(options.gcTime).toBe(0);
	});

	it('🔴 review w3-w4 R1 MINOR-2 (D-W3-02): an answer that lands after a pick never brings the spent token back — it is kept with the session it was asked in', async () => {
		let release: (response: Response) => void = () => {};
		vi.stubGlobal(
			'fetch',
			vi.fn(
				() =>
					new Promise<Response>((resolve) => {
						release = resolve;
					})
			)
		);
		let epoch = 3;
		const kept: [string | null, number][] = [];
		const session = {
			read: () => TOKEN,
			epoch: () => epoch,
			keep: (token: string | null, from: number) => kept.push([token, from])
		};
		const client = new QueryClient();
		const asked = client.fetchQuery(doctorOnboardingAddressSuggestionsQuery('Καρα', session));
		await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
		epoch = 4; // the doctor picked a suggestion meanwhile
		release(
			new Response(
				JSON.stringify({ status: 'success', data: { sessionToken: TOKEN, suggestions: [] } })
			)
		);
		await asked;
		expect(kept).toEqual([[TOKEN, 3]]);
	});
});
