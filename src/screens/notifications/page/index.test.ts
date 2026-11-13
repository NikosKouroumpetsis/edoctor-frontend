import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import type { Component } from 'svelte';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { SessionStatus } from '$shared/state/session';
import {
	SAMPLE_IDS,
	sampleInboxItems,
	sampleInboxPage
} from '$modules/notifications/api/inbox/inbox.sample';
import type { NotificationsScreenData } from '../types';
import Harness from './screen.harness.svelte';

/*
 * Wave 4.5 · screen 63 (D-W45-49, D-W45-45): the `/notifications` screen — the notifications module's page with the
 * addresses THIS screen resolves: the «Προφίλ», the settings' «Ειδοποιήσεις», each choice, and what a line opens in the
 * other modules' pages. The server is stubbed; made-up people.
 */

type Call = { path: string; method: string; query: Record<string, string> };
let calls: Call[];

const json = (data: unknown) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status: 200 });

beforeEach(() => {
	calls = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const parsed = new URL(url, 'https://api.test');
			const path = parsed.pathname.replace(/^.*\/notification(?=\/)/u, '');
			calls.push({
				path,
				method: init.method ?? 'GET',
				query: Object.fromEntries(parsed.searchParams)
			});
			if (path === '/inbox/me/unread-count') return json({ unreadCount: 3 });
			return json(sampleInboxPage(sampleInboxItems()));
		})
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
	page.url = new URL('http://localhost/') as typeof page.url;
});

function draw(address: string, data: NotificationsScreenData, start: SessionStatus = 'member') {
	page.url = new URL(address, 'https://edoctor.test') as typeof page.url;
	return render(QueryHarness, {
		props: { component: Harness as unknown as Component<never>, props: { data, start } }
	});
}

const view = () => screen.getByTestId('notifications-page');
const row = (id: string) => screen.getByTestId(`notifications-row-${id}`);
const rows = () => waitFor(() => expect(view()).toHaveAttribute('data-view', 'rows'));
const hrefOf = (testId: string) => screen.getByTestId(testId).getAttribute('href');

describe('screens/notifications · «Ειδοποιήσεις», the list (D-W45-49)', () => {
	it('D-W45-49: the page of `/notifications` — its own title in the tab, `noindex`, the list inside the page’s `main` on the white surface', async () => {
		draw('/notifications', { address: { filter: null } });
		await rows();
		expect(document.title).toBe('Ειδοποιήσεις | eDoctor');
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex'
		);
		const main = screen.getByRole('main');
		expect(main).toHaveAttribute('data-testid', 'notifications-screen');
		// Card w45-w9 (D-W45-57 α): rewrites the page's height below 744 — no site's bar there, so the whole screen
		// (`min-h-page` left a band of 64 in the body's colour under a short list); the bar's height only from 744.
		expect(main).toHaveClass('min-h-dvh', 'tablet:min-h-page', 'bg-card', 'split:min-h-0');
		expect(main).not.toHaveClass('min-h-page');
		expect(main).toContainElement(view());
		// Something is new: the page opened on «Νέες» by itself.
		expect(view()).toHaveAttribute('data-filter', 'new');
	});

	it('🔴 U-65.6: the tab’s title names no notification, whatever the list holds', async () => {
		draw('/notifications?filter=all', { address: { filter: 'all' } });
		await rows();
		expect(document.title).toBe('Ειδοποιήσεις | eDoctor');
		expect(document.title).not.toMatch(/ραντεβού|Μαρία/u);
	});

	it('every address the list leads to is resolved here, in the page’s language: «←» the «Προφίλ», the gear the settings’ «Ειδοποιήσεις», each choice the same page with its word', async () => {
		draw('/notifications?filter=all', { address: { filter: 'all' } });
		await rows();
		expect(hrefOf('notifications-back')).toBe('/profile');
		expect(hrefOf('notifications-settings')).toBe('/profile/account-settings/notifications');
		expect(
			(['new', 'previous', 'all'] as const).map((choice) =>
				hrefOf(`notifications-filter-${choice}`)
			)
		).toEqual([
			'/notifications?filter=new',
			'/notifications?filter=previous',
			'/notifications?filter=all'
		]);
	});

	it('🔴 D-W45-45: στόχος ανά `target.kind` — an appointment its page (`/appointments/<id>`, screen 51), an invitation the visit’s review (`/ratings/<id>`, screen 54); 🔴 D-W45-59: a question has no page, so no link', async () => {
		draw('/notifications?filter=all', { address: { filter: 'all' } });
		await rows();
		expect(row(SAMPLE_IDS.confirmed)).toHaveAttribute(
			'href',
			`/appointments/${SAMPLE_IDS.appointment}`
		);
		expect(row(SAMPLE_IDS.invitation)).toHaveAttribute(
			'href',
			`/ratings/${SAMPLE_IDS.invitationTarget}`
		);
		expect(row(SAMPLE_IDS.published)).toHaveAttribute(
			'href',
			`/appointments/${SAMPLE_IDS.appointment}`
		);
		expect(row(SAMPLE_IDS.question)).not.toHaveAttribute('href');
		expect(document.body.innerHTML).not.toContain(SAMPLE_IDS.questionTarget);
	});

	it('in English: the same page under `/en` — its title, its addresses, and the list asked in English (`lang=en`)', async () => {
		draw('/en/notifications?filter=previous', { address: { filter: 'previous' } });
		await rows();
		expect(document.title).toBe('Notifications | eDoctor');
		expect(hrefOf('notifications-back')).toBe('/en/profile');
		expect(hrefOf('notifications-settings')).toBe('/en/profile/account-settings/notifications');
		expect(hrefOf('notifications-filter-new')).toBe('/en/notifications?filter=new');
		expect(row(SAMPLE_IDS.published)).toHaveAttribute(
			'href',
			`/en/appointments/${SAMPLE_IDS.appointment}`
		);
		const list = calls.find((call) => call.path === '/inbox/me');
		expect(list?.query).toEqual({ filter: 'previous', lang: 'en', limit: '20' });
	});

	it('🔴 U-80.1 Ε6 · rule 11: before the session is known, and for a guest, the page asks the server NOTHING and draws no person’s fact', async () => {
		const waiting = draw('/notifications', { address: { filter: null } }, 'unknown');
		await waitFor(() => expect(view()).toHaveAttribute('data-view', 'loading'));
		expect(calls).toEqual([]);
		expect(document.body).not.toHaveTextContent(/Μαρία|ραντεβού σας επιβεβαιώθηκε/u);
		waiting.unmount();

		draw('/notifications?filter=new', { address: { filter: 'new' } }, 'guest');
		await waitFor(() => expect(view()).toHaveAttribute('data-view', 'guest'));
		expect(screen.getByTestId('notifications-sign-in')).toBeInTheDocument();
		expect(calls).toEqual([]);
	});
});
