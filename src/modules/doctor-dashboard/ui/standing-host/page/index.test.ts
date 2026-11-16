import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import type { Component } from 'svelte';
import type { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { doctorModeStorageKey } from '$shared/config/env';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { DoctorStanding } from '$shared/state/doctor-standing';
import type { Session, SessionStatus } from '$shared/state/session';
import Harness from './standing-host.harness.svelte';

/*
 * Wave 5.1 · screens 64 / 65 (D-W51-10, D-W51-11, D-W51-19): the ONE read of the account's doctor standing, the device's
 * memory of it, the memory of the mode on the home, and the switch with its transition. The server is stubbed.
 */
type Call = { path: string; method: string; body?: unknown };
let calls: Call[];
let dashboard: Record<string, unknown>;
let modeAnswer: number;

const view = (patch: Record<string, unknown> = {}) => ({
	registration: 'COMPLETED',
	licences: {
		marketplace: { status: 'ACTIVE', endsAt: '2027-10-01T21:00:00.000Z' },
		payments: { status: 'NONE', endsAt: null }
	},
	licensed: true,
	notice: null,
	lastMode: 'PATIENT',
	card: { firstName: 'Ελένη', lastName: 'Παππά', specialtyName: 'Καρδιολόγος' },
	...patch
});

beforeEach(() => {
	calls = [];
	dashboard = view();
	modeAnswer = 200;
	window.localStorage.clear();
	delete document.documentElement.dataset.doctorMode;
	(page as { url: URL }).url = new URL('http://localhost/profile');
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			const path = new URL(url).pathname.replace(/^\/api\/v\d+/u, '');
			const body = init.body ? JSON.parse(String(init.body)) : undefined;
			calls.push({ path, method, body });
			if (method === 'PUT') {
				if (modeAnswer !== 200) {
					return new Response(
						JSON.stringify({ errorCode: 'EC403', errorMessage: 'DOCTOR_MODE_NOT_ALLOWED' }),
						{
							status: modeAnswer
						}
					);
				}
				dashboard = { ...dashboard, lastMode: (body as { mode: string }).mode };
			}
			return new Response(JSON.stringify({ status: 'success', message: '', data: dashboard }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		})
	);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	(page as { url: URL }).url = new URL('http://localhost/');
});

type Handle = {
	session: Session;
	client: QueryClient;
	answer: (next: SessionStatus) => void;
	standing: () => DoctorStanding | undefined;
	expired: () => number;
};

function draw(start: SessionStatus) {
	let handle: Handle | undefined;
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { start, onReady: (found: Handle) => (handle = found) }
		}
	});
	return () => handle as Handle;
}

const reads = () => calls.filter((call) => call.path === '/doctor/me/dashboard');

describe('the doctor standing’s host (D-W51-10, D-W51-19)', () => {
	it('D-W51-10: a member’s standing is read ONCE, in the browser; the page reads the kind and the mode', async () => {
		draw('member');
		await waitFor(() => expect(screen.getByTestId('standing-known')).toHaveTextContent('known'));
		expect(screen.getByTestId('standing-kind')).toHaveTextContent('doctor');
		expect(reads()).toHaveLength(1);
	});

	it('(negative) a guest, and a session not known yet, ask the server NOTHING', async () => {
		draw('guest');
		draw('unknown');
		await new Promise((done) => setTimeout(done, 20));
		expect(calls).toEqual([]);
	});

	it('D-W51-19: the answer is remembered on this device — the kind and the mode only — and marks `<html data-doctor-mode>` for a licence of the marketplace; a sign-out forgets both', async () => {
		const handle = draw('member');
		await waitFor(() => expect(document.documentElement.dataset.doctorMode).toBe('doctor'));
		expect(JSON.parse(window.localStorage.getItem(doctorModeStorageKey) ?? '')).toEqual({
			v: 1,
			kind: 'doctor',
			lastMode: 'PATIENT'
		});
		expect(window.localStorage.getItem(doctorModeStorageKey)).not.toContain('Ελένη');
		await handle().session.signOut();
		await waitFor(() => expect(window.localStorage.getItem(doctorModeStorageKey)).toBeNull());
		expect(document.documentElement.dataset.doctorMode).toBeUndefined();
	});

	it('U-183.5 (negative): a registration under review is no doctor mode — nothing marked, its kind remembered', async () => {
		dashboard = view({
			licensed: false,
			licences: {
				marketplace: { status: 'NONE', endsAt: null },
				payments: { status: 'NONE', endsAt: null }
			}
		});
		draw('member');
		await waitFor(() => expect(screen.getByTestId('standing-kind')).toHaveTextContent('pending'));
		expect(document.documentElement.dataset.doctorMode).toBeUndefined();
		expect(JSON.parse(window.localStorage.getItem(doctorModeStorageKey) ?? '').kind).toBe(
			'pending'
		);
	});

	it('64 «Η μνήμη»: on the home a doctor who left in the doctor’s mode opens «Σήμερα» again — once, in the page’s place', async () => {
		dashboard = view({ lastMode: 'DOCTOR' });
		(page as { url: URL }).url = new URL('http://localhost/');
		draw('member');
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith('/doctor', { replaceState: true })
		);
		expect(vi.mocked(goto)).toHaveBeenCalledTimes(1);
	});

	it.each([
		['a doctor’s profile', 'http://localhost/doctors/dr-x', 'DOCTOR'],
		['a search from a link', 'http://localhost/?q=x', 'DOCTOR'],
		['the patient’s mode on the home', 'http://localhost/', 'PATIENT']
	])('64 «Η μνήμη» (negative): %s stays the patient’s', async (_name, address, lastMode) => {
		dashboard = view({ lastMode });
		(page as { url: URL }).url = new URL(address);
		const handle = draw('member');
		await waitFor(() => expect(handle().standing()?.known).toBe(true));
		await new Promise((done) => setTimeout(done, 20));
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('D-W51-11 · U-185.3: «Λειτουργία γιατρού» — the transition, the mode kept on the server, then «Σήμερα»', async () => {
		const handle = draw('member');
		await waitFor(() => expect(handle().standing()?.known).toBe(true));
		const switching = handle().standing()?.switchTo('DOCTOR');
		expect(await screen.findByTestId('doctor-mode-transition')).toHaveTextContent(
			'Μετάβαση στη λειτουργία γιατρού'
		);
		expect(await switching).toBe(true);
		expect(calls.find((call) => call.method === 'PUT')).toEqual({
			path: '/doctor/me/dashboard/mode',
			method: 'PUT',
			body: { mode: 'DOCTOR' }
		});
		expect(vi.mocked(goto)).toHaveBeenCalledWith('/doctor');
		await waitFor(() => expect(screen.queryByTestId('doctor-mode-transition')).toBeNull());
		expect(handle().standing()?.lastMode).toBe('DOCTOR');
	});

	it('«Λειτουργία ασθενή»: the other way, the patient’s home', async () => {
		dashboard = view({ lastMode: 'DOCTOR' });
		const handle = draw('member');
		await waitFor(() => expect(handle().standing()?.known).toBe(true));
		const switching = handle().standing()?.switchTo('PATIENT');
		expect(await screen.findByTestId('doctor-mode-transition')).toHaveTextContent(
			'Μετάβαση στη λειτουργία ασθενή'
		);
		expect(await switching).toBe(true);
		expect(vi.mocked(goto)).toHaveBeenCalledWith('/');
	});

	it('D-W51-11 (negative): a switch the server refuses moves nobody, counts a failure and reads the standing again; a `401` opens the sign-in', async () => {
		const handle = draw('member');
		await waitFor(() => expect(handle().standing()?.known).toBe(true));
		modeAnswer = 403;
		expect(await handle().standing()?.switchTo('DOCTOR')).toBe(false);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		expect(handle().standing()?.switchFailures).toBe(1);
		await waitFor(() => expect(reads().length).toBeGreaterThanOrEqual(2));
		modeAnswer = 401;
		expect(await handle().standing()?.switchTo('DOCTOR')).toBe(false);
		expect(handle().expired()).toBe(1);
		expect(handle().standing()?.switchFailures).toBe(1);
	});
});
