import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPatientSelf } from '.';

const answer = (status: number, data?: unknown) =>
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response(JSON.stringify({ status: 'ok', data }), { status }))
	);

afterEach(() => vi.unstubAllGlobals());

describe('auth::api::session `getPatientSelf`', () => {
	it('`w2-b5` §1δ: a member’s facts, with the sign-in address the read gives', async () => {
		answer(200, { id: 'p', firstName: 'Μαρία', tenantUserId: 'u', loginEmail: 'm@example.test' });
		await expect(getPatientSelf()).resolves.toEqual({
			signedIn: true,
			hasPatientProfile: true,
			firstName: 'Μαρία',
			accountKey: 'u',
			loginEmail: 'm@example.test'
		});
	});

	it.each([
		['`null` from the server (no patient’s profile yet)', null],
		['no address on the account', { id: 'p', firstName: 'Μαρία', loginEmail: null }],
		['the field absent', { id: 'p', firstName: 'Μαρία' }]
	])('%s: no address, and no failure', async (_label, view) => {
		answer(200, view);
		await expect(getPatientSelf()).resolves.toMatchObject({ signedIn: true, loginEmail: null });
	});

	it('a guest’s `401` is an answer', async () => {
		answer(401);
		await expect(getPatientSelf()).resolves.toEqual({ signedIn: false });
	});
});
