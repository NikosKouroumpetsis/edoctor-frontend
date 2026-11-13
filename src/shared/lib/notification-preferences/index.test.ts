import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import type { NotificationPreferencesView } from '$shared/lib/api-client';
import { ApiError } from '$shared/lib/http';
import { removePersonalQueries } from '$shared/query';
import {
	getNotificationPreferences,
	notificationPreferencesKey,
	previewNotificationPreferences,
	saveNotificationPreferences
} from '.';

afterEach(() => vi.unstubAllGlobals());

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status });

const view = (push: boolean): NotificationPreferencesView => ({
	updatedAt: null,
	sections: [
		{
			side: 'PATIENT',
			categories: [
				{
					category: 'MESSAGES',
					cells: [
						{ channel: 'EMAIL', mode: 'TOGGLE', enabled: true, scope: null },
						{ channel: 'PUSH', mode: 'TOGGLE', enabled: push, scope: null }
					]
				},
				{
					category: 'ACCOUNT',
					cells: [{ channel: 'EMAIL', mode: 'ALWAYS', enabled: true, scope: null }]
				}
			]
		}
	]
});

const client = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
const held = (given: QueryClient) =>
	given.getQueryData<NotificationPreferencesView>(notificationPreferencesKey);
const pushOf = (given: QueryClient) => held(given)?.sections[0]?.categories[0]?.cells[1]?.enabled;

describe('shared/lib/notification-preferences · the centre’s ONE read, write and place in the cache (card w45-w3)', () => {
	it('the read: `GET /notification/preferences/me` with the cookies, never kept by the browser; ONE key for every reader', async () => {
		const spy = vi.fn(async () => json(view(true)));
		vi.stubGlobal('fetch', spy);
		expect(notificationPreferencesKey).toEqual(['notification-preferences']);
		await expect(getNotificationPreferences(new AbortController().signal)).resolves.toEqual(
			view(true)
		);
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(new URL(url, 'https://api.test').pathname).toMatch(/\/notification\/preferences\/me$/u);
		expect(new URL(url, 'https://api.test').search).toBe('');
		expect(init).toMatchObject({ method: 'GET', credentials: 'include', cache: 'no-store' });
		expect(init.body).toBeUndefined();
	});

	it('the write: a `PUT` with the cells it names and nothing else; the server’s answer goes where every reader finds it', async () => {
		const spy = vi.fn(async () => json(view(false)));
		vi.stubGlobal('fetch', spy);
		const given = client();
		given.setQueryData(notificationPreferencesKey, view(true));
		await expect(
			saveNotificationPreferences(given, [
				{ category: 'MESSAGES', channel: 'PUSH', enabled: false }
			])
		).resolves.toBeUndefined();
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(new URL(url, 'https://api.test').pathname).toMatch(/\/notification\/preferences\/me$/u);
		expect(init).toMatchObject({ method: 'PUT', credentials: 'include' });
		expect(JSON.parse(String(init.body))).toEqual({
			cells: [{ category: 'MESSAGES', channel: 'PUSH', enabled: false }]
		});
		expect(held(given)).toEqual(view(false));
	});

	it('🔴 U-65.6 (the inbox’s N-4): an answer that lands after a sign-out is still marked personal — the next sign-out takes it', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => json(view(false)))
		);
		const given = client();
		await saveNotificationPreferences(given, [
			{ category: 'MESSAGES', channel: 'PUSH', enabled: false }
		]);
		expect(given.getQueryCache().find({ queryKey: notificationPreferencesKey })?.meta).toEqual({
			personal: true
		});
		removePersonalQueries(given);
		expect(held(given)).toBeUndefined();
	});

	it('(negative) a refused write — `422`, `403`, `401`, `500`, no network — rejects with the status and leaves the cache as it was', async () => {
		for (const answer of [422, 403, 401, 500, 0]) {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => {
					if (answer === 0) throw new TypeError('Failed to fetch');
					return new Response(JSON.stringify({ status: 'error', message: 'no' }), {
						status: answer
					});
				})
			);
			const given = client();
			given.setQueryData(notificationPreferencesKey, view(true));
			const error = await saveNotificationPreferences(given, [
				{ category: 'MESSAGES', channel: 'PUSH', enabled: false }
			]).catch((caught: unknown) => caught);
			expect(error, String(answer)).toBeInstanceOf(ApiError);
			expect((error as ApiError).status, String(answer)).toBe(answer);
			expect(held(given), String(answer)).toEqual(view(true));
		}
	});

	it('the preview: the cells in their new place at once, and the way back to what was read', () => {
		const given = client();
		given.setQueryData(notificationPreferencesKey, view(true));
		const undo = previewNotificationPreferences(given, [
			{ category: 'MESSAGES', channel: 'PUSH', enabled: false }
		]);
		expect(pushOf(given)).toBe(false);
		// The rest of the centre keeps its values.
		expect(held(given)?.sections[0]?.categories[0]?.cells[0]?.enabled).toBe(true);
		undo();
		expect(held(given)).toEqual(view(true));
	});

	it('(negative) the preview moves a `TOGGLE` cell only — «Πάντα», a kind or a channel the account has not stay as read; with nothing read it writes nothing', () => {
		const given = client();
		given.setQueryData(notificationPreferencesKey, view(true));
		previewNotificationPreferences(given, [
			{ category: 'ACCOUNT', channel: 'EMAIL', enabled: false },
			{ category: 'MESSAGES', channel: 'SMS', enabled: true },
			{ category: 'RATINGS', channel: 'PUSH', enabled: false }
		]);
		expect(held(given)).toEqual(view(true));

		const empty = client();
		const undo = previewNotificationPreferences(empty, [
			{ category: 'MESSAGES', channel: 'PUSH', enabled: false }
		]);
		expect(held(empty)).toBeUndefined();
		undo();
		expect(held(empty)).toBeUndefined();
	});
});
