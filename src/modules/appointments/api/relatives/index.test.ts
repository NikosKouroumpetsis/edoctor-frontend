import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import {
	createBookingRelative,
	deleteRelative,
	listRelatives,
	readBookingRelativeFailure,
	readBookingRelativeInvalidIds,
	readBookingRelativeRefusedFields,
	readRelativeChangeFailure,
	relativesQuery,
	updateRelative
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

	it('🔴 review w3-w6 R1 MINOR-1 / U-65.6: the answer as the booking names it — the id, both names and (U-139.5) the relationship and gender; the ΑΜΚΑ, ΑΦΜ, mobile and email the server sends back never leave `api/`', async () => {
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
			lastName: 'Μάρκου',
			relationship: 'CHILD',
			gender: ''
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

describe('screen 55 · the person’s relatives (P-W4 §4.6)', () => {
	// Made-up values: no person's numbers.
	const relative = {
		id: 'r-1',
		patientId: 'p-1',
		firstName: ' Γιώργος ',
		lastName: 'Παππάς',
		relationship: 'CHILD',
		gender: 'MALE',
		phone: '+306900000000',
		email: ' ',
		amka: '00000000001',
		afm: null
	};
	const answering = (data: unknown, status = 200) =>
		vi.fn(async () => new Response(JSON.stringify({ status: 'ok', data }), { status }));

	// Rewrites «🔴 D-W45-10: … neither the server’s mask nor a whole value reaches the form» (card w45-w2) by D-W45-14
	// (card w45-w5): the server's MASK now reaches the form, as its hint — a whole value still never does.
	it('🔴 D-W45-14 · U-168: every relative for the form (the optional fields `null` when blank), with the cookies — its ΑΜΚΑ / ΑΦΜ ONLY as the server’s masks; a whole value an older server still sent is dropped', async () => {
		const spy = answering([
			{ ...relative, amkaMasked: '•••••••0001', afmMasked: '•••••6789', afm: '123456789' },
			{ id: 'r-2', firstName: '', lastName: 'Χωρίς' }
		]);
		vi.stubGlobal('fetch', spy);
		expect(await listRelatives('p/1')).toEqual([
			{
				relativeId: 'r-1',
				firstName: 'Γιώργος',
				lastName: 'Παππάς',
				relationship: 'CHILD',
				gender: 'MALE',
				phone: '+306900000000',
				email: null,
				amkaMasked: '•••••••0001',
				afmMasked: '•••••6789'
			}
		]);
		expect(JSON.stringify(await listRelatives('p/1'))).not.toMatch(/00000000001|123456789/u);
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('/patient/p%2F1/relatives');
		expect(init).toMatchObject({ method: 'GET', credentials: 'include' });
		expect(relativesQuery('p-1')).toMatchObject({
			queryKey: ['appointments', 'relatives', 'p-1'],
			meta: { personal: true }
		});
	});

	it('W-4 (negative): an answer that is no list is none; a relationship or gender that is no text reads empty', async () => {
		for (const data of [null, {}, 'x', 7]) {
			vi.stubGlobal('fetch', answering(data));
			await expect(listRelatives('p-1')).resolves.toEqual([]);
		}
		vi.stubGlobal('fetch', answering([{ ...relative, relationship: 7, gender: null }]));
		expect((await listRelatives('p-1'))[0]).toMatchObject({ relationship: '', gender: '' });
	});

	it('D-78: the change sends only what changed (a cleared field `null`), both ids encoded; the deletion sends no body', async () => {
		const spy = answering(relative);
		vi.stubGlobal('fetch', spy);
		await expect(
			updateRelative('p-1', 'r/1', { phone: null, firstName: 'Γιώργος' })
		).resolves.toMatchObject({
			relativeId: 'r-1'
		});
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('/patient/p-1/relatives/r%2F1');
		expect(init).toMatchObject({ method: 'PATCH', credentials: 'include' });
		expect(JSON.parse(String(init.body))).toEqual({ phone: null, firstName: 'Γιώργος' });
		const removal = answering(relative);
		vi.stubGlobal('fetch', removal);
		await expect(deleteRelative('p-1', 'r-1')).resolves.toBeUndefined();
		const [, removed] = removal.mock.calls[0] as unknown as [string, RequestInit];
		expect(removed).toMatchObject({ method: 'DELETE' });
		expect(removed.body).toBeUndefined();
	});

	it('a change’s refusals: a relative that is not the person’s any more (403 / 404), then the create’s reasons', () => {
		expect(readRelativeChangeFailure(new ApiError('Forbidden', 403, '/x'))).toBe('forbidden');
		expect(readRelativeChangeFailure(new ApiError('Not found', 404, '/x'))).toBe('forbidden');
		expect(readRelativeChangeFailure(new ApiError('slow', 429, '/x'))).toBe('rate-limited');
		expect(readRelativeChangeFailure(new ApiError('firstName', 422, '/x'))).toBe('invalid');
		expect(readRelativeChangeFailure(new Error('offline'))).toBe('unknown');
		// (negative) the create keeps its own reading: its 403 means another thing.
		expect(readBookingRelativeFailure(new ApiError('Forbidden', 403, '/x'))).toBe('unknown');
	});
});
