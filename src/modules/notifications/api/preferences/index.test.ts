import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { notificationPreferencesKey } from '$shared/lib/notification-preferences';
import {
	mapNotificationPreferences,
	notificationPreferencesQuery,
	readNotificationPreferenceFailure,
	saveNotificationPreference
} from '.';
import { samplePreferencesView } from './preferences.sample';

afterEach(() => vi.unstubAllGlobals());

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status });

const client = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

describe('modules/notifications/api/preferences · the account’s centre (`GET` / `PUT /notification/preferences/me`, D-132)', () => {
	it('the read maps the server’s answer to facts: its sides, their kinds and each kind’s channels, in the server’s order', () => {
		const facts = mapNotificationPreferences(samplePreferencesView({ withDoctor: true }));
		expect(facts.sections.map((section) => section.side)).toEqual(['PATIENT', 'DOCTOR']);
		expect(facts.sections[0]?.categories.map((entry) => entry.category)).toEqual([
			'APPOINTMENT_UPDATES',
			'REMINDERS',
			'RATINGS',
			'QUESTIONS',
			'MESSAGES',
			'ACCOUNT'
		]);
		expect(facts.sections[0]?.categories[0]?.cells).toEqual([
			{ channel: 'EMAIL', mode: 'ALWAYS', enabled: true, scope: null },
			{ channel: 'PUSH', mode: 'TOGGLE', enabled: true, scope: null },
			{ channel: 'SMS', mode: 'SET_BY_DOCTOR', enabled: null, scope: null }
		]);
		expect(facts.sections[0]?.categories[1]?.cells[2]).toEqual({
			channel: 'SMS',
			mode: 'TOGGLE',
			enabled: true,
			scope: 'WHEN_DOCTOR_OFFERS'
		});
		// Nothing of the answer but the centre: no date, no key of its own.
		expect(Object.keys(facts)).toEqual(['sections']);
	});

	it('the query: the site’s ONE read of the centre (the shared key), personal, its facts read out of the answer', async () => {
		const spy = vi.fn(async () => json(samplePreferencesView()));
		vi.stubGlobal('fetch', spy);
		const query = notificationPreferencesQuery();
		// 🔴 Card w45-w3: one reader, not a second — the inbox's «Ρυθμίσεις μηνυμάτων» reads the same place.
		expect(query.queryKey).toBe(notificationPreferencesKey);
		expect(query.meta).toEqual({ personal: true });
		const answer = await (query.queryFn as (context: { signal: AbortSignal }) => Promise<unknown>)({
			signal: new AbortController().signal
		});
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('/notification/preferences/me');
		expect(init).toMatchObject({ method: 'GET', credentials: 'include' });
		const select = query.select as (view: unknown) => unknown;
		expect(select(answer)).toEqual(mapNotificationPreferences(samplePreferencesView()));
	});

	it('W-4 / 🔴 U-65.6 (negative): an answer that is no centre reads as an empty one — never a throw', () => {
		for (const view of [
			null,
			undefined,
			7,
			'sections',
			[],
			{},
			{ sections: null },
			{ sections: 'PATIENT' },
			{ sections: { side: 'PATIENT' } }
		]) {
			expect(mapNotificationPreferences(view), JSON.stringify(view)).toEqual({ sections: [] });
		}
	});

	it('W-4 / 🔴 U-65.6 (negative): a side, a kind, a channel or a mode the contract does not name is left out — with markup, a prototype’s key or a very long word in its place too', () => {
		const long = 'A'.repeat(4096);
		const facts = mapNotificationPreferences({
			sections: [
				{ side: 'ADMIN', categories: [{ category: 'MESSAGES', cells: [] }] },
				{ side: '<img src=x onerror=alert(1)>', categories: [] },
				null,
				7,
				{
					side: 'PATIENT',
					categories: [
						{
							category: 'PROMOTIONS',
							cells: [{ channel: 'EMAIL', mode: 'TOGGLE', enabled: true }]
						},
						{ category: '<script>alert(1)</script>', cells: [] },
						{ category: 'toString', cells: [] },
						{ category: '__proto__', cells: [] },
						{ category: long, cells: [] },
						{ category: 7, cells: [] },
						null,
						{
							category: 'MESSAGES',
							cells: [
								{ channel: 'FAX', mode: 'TOGGLE', enabled: true, scope: null },
								{ channel: 'EMAIL', mode: 'SOMETIMES', enabled: true, scope: null },
								{ channel: 'constructor', mode: 'TOGGLE', enabled: true, scope: null },
								{ channel: ['PUSH'], mode: 'TOGGLE', enabled: true, scope: null },
								null,
								'PUSH',
								// A switch that is no boolean is undecided; a scope that is no word of the contract is none.
								{ channel: 'PUSH', mode: 'TOGGLE', enabled: 'true', scope: '<b>x</b>' },
								{ channel: 'SMS', mode: 'TOGGLE', enabled: 1, scope: long }
							]
						},
						{ category: 'ACCOUNT', cells: 'EMAIL' }
					]
				}
			]
		});
		expect(facts).toEqual({
			sections: [
				{
					side: 'PATIENT',
					categories: [
						{
							category: 'MESSAGES',
							cells: [
								{ channel: 'PUSH', mode: 'TOGGLE', enabled: null, scope: null },
								{ channel: 'SMS', mode: 'TOGGLE', enabled: null, scope: null }
							]
						},
						{ category: 'ACCOUNT', cells: [] }
					]
				}
			]
		});
		expect(JSON.stringify(facts)).not.toMatch(/script|onerror|AAAA|PROMOTIONS|FAX/u);
	});

	it('🔴 D-W45-24: κάθε πάτημα διακόπτη = μία εγγραφή — a `PUT` with the cookies and ONE cell (`category`, `channel`, `enabled`), nothing else of the change', async () => {
		const spy = vi.fn(async () => json(samplePreferencesView({ set: { 'REMINDERS:SMS': false } })));
		vi.stubGlobal('fetch', spy);
		const given = client();
		const change = {
			category: 'REMINDERS',
			channel: 'SMS',
			enabled: false,
			// (negative) whatever else the caller's object carries never travels.
			writes: 3,
			note: 'κάτι'
		} as const;
		await expect(saveNotificationPreference(given, change)).resolves.toBeUndefined();
		expect(spy).toHaveBeenCalledTimes(1);
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('/notification/preferences/me');
		expect(init).toMatchObject({ method: 'PUT', credentials: 'include' });
		expect(JSON.parse(String(init.body))).toEqual({
			cells: [{ category: 'REMINDERS', channel: 'SMS', enabled: false }]
		});
		// The answer is the shared cache's: the page behind and the inbox's sheet read it at once.
		const select = notificationPreferencesQuery().select as (view: unknown) => unknown;
		expect(select(given.getQueryData(notificationPreferencesKey))).toEqual(
			mapNotificationPreferences(samplePreferencesView({ set: { 'REMINDERS:SMS': false } }))
		);
	});

	it('(negative) a refused write rejects and writes no cache: `422` (a cell that is no switch), `403`, `500`, no network — told the same way; a `401` is the session’s end (U-84)', async () => {
		const refusal = (status: number) =>
			vi.fn(async () => {
				if (status === 0) throw new TypeError('Failed to fetch');
				return new Response(JSON.stringify({ status: 'error', message: 'no' }), { status });
			});
		for (const [status, reason] of [
			[422, 'unknown'],
			[403, 'unknown'],
			[429, 'unknown'],
			[500, 'unknown'],
			[0, 'unknown'],
			[401, 'session']
		] as const) {
			vi.stubGlobal('fetch', refusal(status));
			const given = client();
			const error = await saveNotificationPreference(given, {
				category: 'ACCOUNT',
				channel: 'EMAIL',
				enabled: false
			}).catch((caught: unknown) => caught);
			expect(error, String(status)).toBeInstanceOf(ApiError);
			expect(readNotificationPreferenceFailure(error), String(status)).toBe(reason);
			expect(given.getQueryData(notificationPreferencesKey), String(status)).toBeUndefined();
		}
		expect(readNotificationPreferenceFailure(new Error('x'))).toBe('unknown');
		expect(readNotificationPreferenceFailure(undefined)).toBe('unknown');
	});
});
