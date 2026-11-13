import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPatientSelf } from '.';

const answer = (status: number, data?: unknown) =>
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response(JSON.stringify({ status: 'ok', data }), { status }))
	);

afterEach(() => vi.unstubAllGlobals());

describe('auth::api::session `getPatientSelf`', () => {
	// Rewrites «`w2-b5` §1δ: a member’s facts, with the sign-in address the read gives» by D-W45-10 (wave 4.5): the
	// read gives no address any more — `loginEmailMasked`, the server's own mask.
	it('🔴 D-W45-10 · U-168: a member’s facts, with the sign-in address and mobile AS THE SERVER HIDES THEM', async () => {
		answer(200, {
			id: 'p',
			firstName: ' Μαρία ',
			lastName: 'Παππά',
			tenantUserId: 'u',
			loginEmailMasked: 'm***a@example.test',
			loginPhoneMasked: '+30 69•• ••• 678',
			amkaMasked: '•••••••2345',
			afmMasked: null
		});
		// Card w45-w5 (screen 58) adds the ΑΜΚΑ / ΑΦΜ, the same way: the server's masks, `null` when none is stored.
		await expect(getPatientSelf()).resolves.toEqual({
			signedIn: true,
			hasPatientProfile: true,
			firstName: 'Μαρία',
			lastName: 'Παππά',
			accountKey: 'u',
			maskedLoginEmail: 'm***a@example.test',
			maskedLoginPhone: '+30 69•• ••• 678',
			maskedAmka: '•••••••2345',
			maskedAfm: null
		});
	});

	it('🔴 U-168 (negative, screen 58): καμία ολόκληρη τιμή ΑΜΚΑ / ΑΦΜ — a WHOLE number where a mask belongs, a mask that shows more than four digits, or the old `amka` / `afm` fields are never kept', async () => {
		answer(200, {
			id: 'p',
			firstName: 'Μαρία',
			amka: '14038800001',
			afm: '123456783',
			amkaMasked: '14038800001',
			afmMasked: '••••56783'
		});
		const facts = await getPatientSelf();
		expect(facts).toMatchObject({ maskedAmka: null, maskedAfm: null });
		expect(JSON.stringify(facts)).not.toMatch(/14038800001|123456783|56783/u);
	});

	it.each([
		['`null` from the server (no patient’s profile yet)', null],
		['no address on the account', { id: 'p', firstName: 'Μαρία', loginEmailMasked: null }],
		['the field absent', { id: 'p', firstName: 'Μαρία' }]
	])('%s: no address, and no failure', async (_label, view) => {
		answer(200, view);
		await expect(getPatientSelf()).resolves.toMatchObject({
			signedIn: true,
			maskedLoginEmail: null,
			maskedLoginPhone: null
		});
	});

	it('🔴 U-168 (negative): το web δεν κρύβει μόνο του email — a WHOLE address or mobile is never kept, and never hidden here: it is no value', async () => {
		answer(200, {
			id: 'p',
			firstName: 'Μαρία',
			// The field the server no longer sends, and whole values where a mask belongs.
			loginEmail: 'maria.private@example.test',
			loginEmailMasked: 'maria.private@example.test',
			loginPhoneMasked: '+306971234567'
		});
		const facts = await getPatientSelf();
		expect(facts).toMatchObject({ maskedLoginEmail: null, maskedLoginPhone: null });
		expect(JSON.stringify(facts)).not.toContain('maria.private');
		expect(JSON.stringify(facts)).not.toContain('6971234567');
	});

	it('(negative) what is no text, blank or far too long reads as absence — never a throw', async () => {
		answer(200, {
			id: 'p',
			firstName: 42,
			lastName: '   ',
			loginEmailMasked: `m***${'a'.repeat(200)}@example.test`,
			loginPhoneMasked: { mask: '***' }
		});
		await expect(getPatientSelf()).resolves.toMatchObject({
			firstName: null,
			lastName: null,
			maskedLoginEmail: null,
			maskedLoginPhone: null
		});
	});

	it('a guest’s `401` is an answer', async () => {
		answer(401);
		await expect(getPatientSelf()).resolves.toEqual({ signedIn: false });
	});
});
