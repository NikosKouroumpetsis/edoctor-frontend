import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import {
	createBookingRelative,
	readBookingRelativeFailure,
	readBookingRelativeInvalidIds,
	readBookingRelativeRefusedFields
} from '.';

afterEach(() => vi.unstubAllGlobals());

describe('a new relative (record §3.3)', () => {
	const form = {
		firstName: 'Πέτρος',
		lastName: 'Μάρκου',
		relationship: 'CHILD',
		gender: 'MALE',
		phone: null,
		email: null,
		amka: null,
		afm: null
	} as const;
	const answering = (data: unknown) =>
		vi.fn(async () => new Response(JSON.stringify({ status: 'ok', data }), { status: 201 }));

	it('posts the form to the person’s own relatives, with the cookies; the id travels encoded', async () => {
		const spy = answering({ id: 'r-9', firstName: 'Πέτρος', lastName: 'Μάρκου' });
		vi.stubGlobal('fetch', spy);
		await createBookingRelative('p/1', form);
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('/patient/p%2F1/relatives');
		expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
	});

	it('🔴 review w3-w6 R1 MINOR-1 / U-65.6: the answer as the booking names it — the id and both names; the ΑΜΚΑ, ΑΦΜ, mobile and email the server sends back never leave `api/`', async () => {
		// Made-up values: no person's numbers.
		vi.stubGlobal(
			'fetch',
			answering({
				id: 'r-9',
				firstName: ' Πέτρος ',
				lastName: 'Μάρκου',
				amka: '00000000001',
				afm: '000000000',
				phone: '6900000000',
				email: 'relative@example.test',
				relationship: 'CHILD'
			})
		);
		expect(await createBookingRelative('p-1', form)).toEqual({
			relativeId: 'r-9',
			firstName: 'Πέτρος',
			lastName: 'Μάρκου'
		});
	});

	it('W-4 (negative, MINOR-1): an answer without an id or a name is none, never a throw', async () => {
		vi.stubGlobal('fetch', answering({ id: 'r-9' }));
		await expect(createBookingRelative('p-1', form)).resolves.toBeNull();
		vi.stubGlobal('fetch', answering(null));
		await expect(createBookingRelative('p-1', form)).resolves.toBeNull();
	});

	it('A-4: the limit of 20 by its marker; then too many writes, the session, a field', () => {
		expect(
			readBookingRelativeFailure(
				new ApiError('Invalid: PATIENT_RELATIVES_LIMIT_REACHED', 422, '/x')
			)
		).toBe('limit');
		expect(readBookingRelativeFailure(new ApiError('slow down', 429, '/x'))).toBe('rate-limited');
		expect(readBookingRelativeFailure(new ApiError('no', 401, '/x'))).toBe('session');
		expect(readBookingRelativeFailure(new ApiError('firstName', 422, '/x'))).toBe('invalid');
		expect(readBookingRelativeFailure(new Error('x'))).toBe('unknown');
	});

	it('W8-Σ2: the fields a refusal was for, by the server’s own words — the names’ rule (no field named) is both names, the phone’s rule the phone, a named field itself; nothing for the limit, the rate, the session or a lost request', () => {
		const refusal = (message: string, status = 422) =>
			new ApiError(message, status, '/patient/p/relatives');
		expect(
			readBookingRelativeRefusedFields(
				refusal('Entity Validation Error: Το πεδίο μπορεί να περιέχει μόνο γράμματα.')
			)
		).toEqual(['firstName', 'lastName']);
		expect(
			readBookingRelativeRefusedFields(
				refusal('Entity Validation Error: Μη έγκυρος κωδικός χώρας για το τηλέφωνο.')
			)
		).toEqual(['phone']);
		expect(
			readBookingRelativeRefusedFields(
				refusal(
					'Entity Validation Error: amka has an invalid date prefix., afm is not a valid Greek tax identification number.'
				)
			)
		).toEqual(['amka', 'afm']);
		expect(
			readBookingRelativeRefusedFields(
				refusal('Entity Validation Error: "email" must be a valid email')
			)
		).toEqual(['email']);
		expect(
			readBookingRelativeRefusedFields(refusal('Entity Validation Error: lastName is required.'))
		).toEqual(['lastName']);
		// W8 Delta 2 (NIT-2): the schema's own `422` names no field — nothing is marked, the general words say it.
		expect(
			readBookingRelativeRefusedFields(
				refusal('Validation failed fields: must NOT have more than 100 characters')
			)
		).toEqual([]);
		expect(
			readBookingRelativeRefusedFields(
				refusal('Too many relatives: PATIENT_RELATIVES_LIMIT_REACHED')
			)
		).toEqual([]);
		expect(readBookingRelativeRefusedFields(refusal('lastName', 429))).toEqual([]);
		expect(readBookingRelativeRefusedFields(refusal('lastName', 401))).toEqual([]);
		expect(readBookingRelativeRefusedFields(refusal('lastName', 500))).toEqual([]);
		expect(readBookingRelativeRefusedFields(new Error('lastName'))).toEqual([]);
		expect(readBookingRelativeRefusedFields(refusal('Entity Validation Error: lastNames'))).toEqual(
			[]
		);
	});

	it('U-121.3: a ΑΜΚΑ / ΑΦΜ of the right length the server found invalid, by its words — the date, the check digit — never its length', () => {
		const refusal = (message: string, status = 422) =>
			new ApiError(message, status, '/patient/p/relatives');
		expect(
			readBookingRelativeInvalidIds(
				refusal(
					'Entity Validation Error: amka has an invalid date prefix., afm is not a valid Greek tax identification number.'
				)
			)
		).toEqual(['amka', 'afm']);
		expect(
			readBookingRelativeInvalidIds(
				refusal('Entity Validation Error: amka has an invalid date prefix.')
			)
		).toEqual(['amka']);
		expect(
			readBookingRelativeInvalidIds(
				refusal('Entity Validation Error: afm is not a valid Greek tax identification number.')
			)
		).toEqual(['afm']);
	});

	it('U-121.3 (negative): the length’s words, another field, another status or a lost request are no invalid ΑΜΚΑ / ΑΦΜ', () => {
		const refusal = (message: string, status = 422) =>
			new ApiError(message, status, '/patient/p/relatives');
		for (const message of [
			'Entity Validation Error: amka must be exactly 11 digits.',
			'Entity Validation Error: afm must be exactly 9 digits.',
			'Entity Validation Error: Το πεδίο μπορεί να περιέχει μόνο γράμματα.',
			'Entity Validation Error: xamka has an invalid date prefix.',
			'Too many relatives: PATIENT_RELATIVES_LIMIT_REACHED'
		]) {
			expect(readBookingRelativeInvalidIds(refusal(message)), message).toEqual([]);
		}
		const words = 'amka has an invalid date prefix.';
		expect(readBookingRelativeInvalidIds(refusal(words, 429))).toEqual([]);
		expect(readBookingRelativeInvalidIds(refusal(words, 401))).toEqual([]);
		expect(readBookingRelativeInvalidIds(refusal(words, 500))).toEqual([]);
		expect(readBookingRelativeInvalidIds(new Error(words))).toEqual([]);
	});
});
