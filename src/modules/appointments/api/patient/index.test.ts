import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PatientSelfResponseView } from '$shared/lib/api-client';
import { ApiError } from '$shared/lib/http';
import {
	bookingPatientQuery,
	mapBookingPatient,
	mapBookingRelative,
	readBookingProfileFailure,
	updateBookingPatientProfile,
	updatePatientIdentifiers
} from '.';

const view = (overrides: Partial<NonNullable<PatientSelfResponseView>> = {}) =>
	({
		id: 'p-1',
		userId: 'u-1',
		tenantUserId: 't-1',
		amkaMasked: null,
		afmMasked: null,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
		firstName: 'Ελένη',
		lastName: 'Παππά',
		loginPhoneVerified: true,
		loginPhoneMasked: '+30 69•• ••• 412',
		relatives: [],
		...overrides
	}) as PatientSelfResponseView;

afterEach(() => vi.unstubAllGlobals());

describe('the person as the booking reads them (GET /patient/me)', () => {
	it('maps the id, the names, the phone’s state and mask, and the relatives that can be named', () => {
		const facts = mapBookingPatient(
			view({
				relatives: [
					{
						id: 'r-1',
						firstName: ' Πέτρος ',
						lastName: 'Μάρκου',
						relationship: 'CHILD',
						gender: 'MALE'
					},
					{ id: 'r-2', firstName: '', lastName: 'Χωρίς' }
				] as never
			})
		);
		expect(facts).toEqual({
			patientId: 'p-1',
			firstName: 'Ελένη',
			lastName: 'Παππά',
			phoneVerified: true,
			phoneMasked: '+30 69•• ••• 412',
			relatives: [
				{
					relativeId: 'r-1',
					firstName: 'Πέτρος',
					lastName: 'Μάρκου',
					relationship: 'CHILD',
					gender: 'MALE'
				}
			]
		});
	});

	it('🔴 U-139.5 (negative): a relative without its relationship or gender — an old row, a number — reads empty, never a throw', () => {
		const facts = mapBookingRelative({
			id: 'r-1',
			firstName: 'Άννα',
			lastName: 'Παππά',
			relationship: 7,
			gender: undefined
		} as never);
		expect(facts).toEqual([
			{ relativeId: 'r-1', firstName: 'Άννα', lastName: 'Παππά', relationship: '', gender: '' }
		]);
	});

	it('(negative) a session without a patient profile is `null`; a blank name is none; an unmasked number never stays (D-47)', () => {
		expect(mapBookingPatient(null)).toBeNull();
		const facts = mapBookingPatient(
			view({ firstName: '  ', loginPhoneVerified: false, loginPhoneMasked: '+306912345412' })
		);
		expect(facts).toMatchObject({ firstName: null, phoneVerified: false, phoneMasked: null });
	});

	it('W-4 (negative): what is no text or no list reads as none — an id, a mask or a relative’s id sent as a number — never a throw', () => {
		expect(mapBookingPatient(view({ id: 7 as never }))).toBeNull();
		expect(
			mapBookingPatient(
				view({
					loginPhoneMasked: 412 as never,
					relatives: { id: 'r-1' } as never
				})
			)
		).toMatchObject({ phoneMasked: null, relatives: [] });
		expect(
			mapBookingPatient(
				view({ relatives: [{ id: 9, firstName: 'Πέτρος', lastName: 'Μάρκου' }] as never })
			)?.relatives
		).toEqual([]);
	});

	it('🔴 U-65.6: the read is personal (a sign-out removes it)', () => {
		expect(bookingPatientQuery().meta).toEqual({ personal: true });
		expect(bookingPatientQuery().queryKey).toEqual(['appointments', 'patient']);
	});

	it('the name or the date of birth travel alone, as a `PATCH` with the cookies', async () => {
		const spy = vi.fn(
			async () => new Response(JSON.stringify({ status: 'ok', data: {} }), { status: 200 })
		);
		vi.stubGlobal('fetch', spy);
		await expect(
			updateBookingPatientProfile({ firstName: 'Ελένη', lastName: 'Παππά' })
		).resolves.toBeUndefined();
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('/patient/me/profile');
		expect(init).toMatchObject({ method: 'PATCH', credentials: 'include' });
		expect(JSON.parse(String(init.body))).toEqual({ firstName: 'Ελένη', lastName: 'Παππά' });
	});

	it('🔴 review w3-w6 R2 MINOR-1 / U-65.6: the answer — the whole patient with the ΑΜΚΑ / ΑΦΜ of them and of every relative — never leaves `api/`', async () => {
		// Made-up values: no person's numbers.
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(
						JSON.stringify({
							status: 'ok',
							// D-W45-10 (wave 4.5): the contract answers masks now; an older server's whole values, sent beside
							// them, are still read by nobody.
							data: {
								...view({ amkaMasked: '•••••••0002', afmMasked: '•••••0000' }),
								amka: '00000000002',
								afm: '000000000',
								loginEmail: 'patient@example.test',
								relatives: [
									{
										id: 'r-1',
										firstName: 'Πέτρος',
										lastName: 'Μάρκου',
										amka: '00000000001',
										afm: '000000001'
									}
								]
							}
						}),
						{ status: 200 }
					)
			)
		);
		await expect(updateBookingPatientProfile({ firstName: 'Ελένη' })).resolves.toBeUndefined();
	});

	it('W-4 (negative): an answer of any shape — none, a list, a text, a number — is still nothing and never a throw; a refusal is still one', async () => {
		for (const data of [null, [], 'x', 7]) {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => new Response(JSON.stringify({ status: 'ok', data }), { status: 200 }))
			);
			await expect(updateBookingPatientProfile({ firstName: 'Ελένη' })).resolves.toBeUndefined();
		}
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ errorCode: 'EC000' }), { status: 422 }))
		);
		await expect(updateBookingPatientProfile({ firstName: 'Ελένη' })).rejects.toBeInstanceOf(
			ApiError
		);
	});

	it('the profile write’s refusals: the `422` naming `dateOfBirth`, the session, a field, else', () => {
		const refusal = (status: number, message: string) =>
			new ApiError(message, status, '/patient/me/profile', 'EC000');
		expect(
			readBookingProfileFailure(refusal(422, 'dateOfBirth is not a valid date of birth.'))
		).toBe('birth-date');
		expect(readBookingProfileFailure(refusal(401, 'Unauthorized'))).toBe('session');
		expect(readBookingProfileFailure(refusal(422, 'firstName too long'))).toBe('invalid');
		expect(readBookingProfileFailure(refusal(503, 'down'))).toBe('unknown');
		expect(readBookingProfileFailure(new Error('offline'))).toBe('unknown');
	});
});

describe('wave 4.5 · screen 58: the person’s own ΑΜΚΑ / ΑΦΜ (`PUT /patient/me`, D-W45-10)', () => {
	const answering = (data: unknown) =>
		vi.fn(async () => new Response(JSON.stringify({ status: 'success', data }), { status: 200 }));

	it('a new number travels alone; «Αφαίρεση» is `null`; the other number is left out (untouched)', async () => {
		const spy = answering(view({ amkaMasked: '•••••••2345' }));
		vi.stubGlobal('fetch', spy);
		await expect(updatePatientIdentifiers({ amka: '01019012345' })).resolves.toBeUndefined();
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(new URL(url, 'https://api.test').pathname).toMatch(/\/patient\/me$/u);
		// 🔴 U-65.6: the number travels in the body alone — never in the address.
		expect(url).not.toContain('01019012345');
		expect(init).toMatchObject({ method: 'PUT', credentials: 'include' });
		expect(JSON.parse(String(init.body))).toEqual({ amka: '01019012345' });

		const removal = answering(view());
		vi.stubGlobal('fetch', removal);
		await updatePatientIdentifiers({ afm: null });
		expect(
			JSON.parse(String((removal.mock.calls[0] as unknown as [string, RequestInit])[1].body))
		).toEqual({ afm: null });
	});

	it('🔴 U-168: the answer — the patient with its masks — never leaves `api/`', async () => {
		vi.stubGlobal('fetch', answering(view({ amkaMasked: '•••••••2345', afmMasked: '•••••6783' })));
		expect(await updatePatientIdentifiers({ amka: '01019012345' })).toBeUndefined();
	});
});
