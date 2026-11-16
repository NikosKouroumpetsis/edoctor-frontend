import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { page as appPage } from '$app/state';
import { DoctorPatientMemory } from '$modules/doctor-dashboard/ui/memory';
import Harness from './merge.harness.svelte';

/* Wave 5.1 · screen 73's join (U-198.2, D-W51-67): the server stubbed at `fetch`. Made-up people only. */

const R = '0193d000-0000-7000-8000-0000000000b3';
const P = '0193d000-0000-7000-8000-0000000000b1';
const empty = { items: [], nextCursor: null, total: 0 };
const recordCard = (patch: Record<string, unknown> = {}) => ({
	key: { kind: 'record', id: R },
	person: { kind: 'RECORD', recordId: R },
	hasAccount: false,
	firstName: 'Μαρία',
	lastName: 'Καρρά',
	phone: '306977654321',
	email: null,
	amka: null,
	afm: null,
	gender: null,
	relationship: null,
	bookedBy: null,
	visits: { count: 0, firstAt: null, lastAt: null },
	noShows: 0,
	editable: true,
	conversationId: null,
	addedAt: '2026-10-30T10:00:00.000Z',
	mergeCandidate: { key: { kind: 'account', id: P }, firstName: 'Ιωάννα', lastName: 'Καρρά' },
	upcoming: empty,
	past: empty,
	...patch
});

type Call = { url: URL; method: string; body: unknown };
let calls: Call[] = [];
function serve(card: unknown, write: { status: number } = { status: 200 }) {
	calls = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init?: RequestInit) => {
			const method = init?.method ?? 'GET';
			calls.push({
				url: new URL(String(input)),
				method,
				body: init?.body ? JSON.parse(String(init.body)) : null
			});
			const status = method === 'POST' ? write.status : 200;
			const data = method === 'POST' ? { key: { kind: 'account', id: P } } : card;
			return new Response(
				JSON.stringify(
					status < 400
						? { status: 'success', message: '', data }
						: { status: 'error', message: 'x' }
				),
				{ status }
			);
		})
	);
}

const links = { card: `/doctor/patients/record/${R}` };
function open(memory = new DoctorPatientMemory()) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
	render(Harness, { props: { client, recordId: R, links, memory } });
	return { memory };
}
const posts = () => calls.filter((call) => call.method === 'POST');

beforeEach(() => {
	appPage.state = {};
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	appPage.state = {};
});

describe('🔴 U-198.2: η ένωση μόνο στον γιατρό, οθόνη επιβεβαίωσης', () => {
	it('a screen of its own (never a dialog): «Ένωση με λογαριασμό», the three lines, «Άκυρο» / «Ένωση» — nothing written before the press', async () => {
		serve(recordCard());
		open();
		await waitFor(() => expect(screen.getByTestId('doctor-merge')).toBeInTheDocument());
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ένωση με λογαριασμό');
		expect(screen.getByTestId('doctor-merge-line-1')).toHaveTextContent(
			'Η καρτέλα «Μαρία Καρρά» και ο λογαριασμός «Ιωάννα Καρρά» γίνονται μία καρτέλα, με όλα τα ραντεβού.'
		);
		expect(screen.getByTestId('doctor-merge-line-2')).toHaveTextContent(
			'Η εφαρμογή του ασθενή δεν αλλάζει: τα ραντεβού που κλείσατε εσείς δεν εμφανίζονται εκεί.'
		);
		expect(screen.getByTestId('doctor-merge-line-3')).toHaveTextContent('Η ένωση δεν αναιρείται.');
		expect(screen.getByTestId('doctor-merge-cancel')).toHaveTextContent('Άκυρο');
		expect(screen.getByTestId('doctor-merge-save')).toHaveTextContent('Ένωση');
		expect(document.querySelector('[role="dialog"]')).toBeNull();
		expect(posts()).toHaveLength(0);
	});

	it('«Ένωση»: ONE `POST …/merge` to the account the server named; then back ONE step to the card, which says «Οι καρτέλες ενώθηκαν.»', async () => {
		appPage.state = { doctorPatient: { depth: 1 } };
		const go = vi.spyOn(history, 'go').mockImplementation(() => {});
		serve(recordCard());
		const { memory } = open();
		await waitFor(() => expect(screen.getByTestId('doctor-merge')).toBeInTheDocument());
		await userEvent.click(screen.getByTestId('doctor-merge-save'));
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		expect(posts()).toHaveLength(1);
		expect(posts()[0]?.url.pathname).toMatch(
			new RegExp(`/appointment/doctor/patients/record/${R}/merge$`, 'u')
		);
		expect(posts()[0]?.body).toEqual({ patientId: P });
		expect(memory.doneOf(`record:${R}`)).toBe('merged');
	});

	it('«Άκυρο» goes back without a write', async () => {
		appPage.state = { doctorPatient: { depth: 1 } };
		const go = vi.spyOn(history, 'go').mockImplementation(() => {});
		serve(recordCard());
		open();
		await waitFor(() => expect(screen.getByTestId('doctor-merge')).toBeInTheDocument());
		await userEvent.click(screen.getByTestId('doctor-merge-cancel'));
		expect(go).toHaveBeenCalledWith(-1);
		expect(posts()).toHaveLength(0);
	});

	it('D-W51-67 (negative): a 409 — «δεν είναι πια δυνατή», the question stays; a record with no candidate (or joined) offers no join at all', async () => {
		serve(recordCard(), { status: 409 });
		open();
		await waitFor(() => expect(screen.getByTestId('doctor-merge')).toBeInTheDocument());
		await userEvent.click(screen.getByTestId('doctor-merge-save'));
		await waitFor(() =>
			expect(
				screen.getByText('Η ένωση δεν είναι πια δυνατή για αυτόν τον ασθενή.')
			).toBeInTheDocument()
		);
	});

	it('(negative) without the server’s candidate there is no question to answer', async () => {
		serve(recordCard({ mergeCandidate: null }));
		open();
		await waitFor(() => expect(screen.getByTestId('doctor-merge-closed')).toBeInTheDocument());
		expect(screen.queryByTestId('doctor-merge-save')).toBeInTheDocument();
		expect(screen.getByTestId('doctor-merge-save')).toHaveTextContent('Πίσω');
		await userEvent.click(screen.getByTestId('doctor-merge-save'));
		expect(posts()).toHaveLength(0);
	});
});
