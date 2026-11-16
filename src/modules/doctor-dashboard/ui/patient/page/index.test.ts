import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page as appPage } from '$app/state';
import { resetServerClock } from '$shared/lib/server-clock';
import {
	doctorAppointmentRow,
	TODAY_NOW
} from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import type { DoctorPatientAddressKey } from '$modules/doctor-dashboard/lib/paths';
import { DoctorPatientMemory } from '$modules/doctor-dashboard/ui/memory';
import Harness from './patient.harness.svelte';

/*
 * Wave 5.1 · screen 73's card (D-W51-73, D-W51-75): the page with the server stubbed at `fetch`, «now» the prototype's
 * Saturday 14 November 2026, 12:40 Athens. Made-up people and ids only.
 */

const NBSP = '\u00a0';
const P = '0193d000-0000-7000-8000-0000000000b1';
const REL = '0193d000-0000-7000-8000-0000000000b2';
const R = '0193d000-0000-7000-8000-0000000000b3';
const C = '0193d000-0000-7000-8000-0000000000c1';
const UP = '0193d000-0000-7000-8000-0000000000a2';
const PAST = ['0193d000-0000-7000-8000-0000000000a5', '0193d000-0000-7000-8000-0000000000a6'];

const pageOf = (items: unknown[], nextCursor: string | null = null) => ({
	items,
	nextCursor,
	total: items.length
});
const ACCOUNT = {
	key: { kind: 'account', id: P },
	person: { kind: 'ACCOUNT', patientId: P, relativeId: null },
	hasAccount: true,
	firstName: 'Ιωάννα',
	lastName: 'Καρρά',
	phone: '306977654321',
	email: 'ioanna.karra@example.gr',
	amka: '23048501234',
	afm: '098765432',
	gender: null,
	relationship: null,
	bookedBy: null,
	visits: { count: 4, firstAt: '2026-03-03T07:30:00.000Z', lastAt: '2026-10-22T08:00:00.000Z' },
	noShows: 1,
	editable: false,
	conversationId: C,
	addedAt: null,
	mergeCandidate: null,
	upcoming: pageOf([doctorAppointmentRow({ id: UP, startTime: '2026-11-16T09:00:00.000Z' })]),
	past: pageOf(
		[
			doctorAppointmentRow({
				id: PAST[0],
				status: 'completed',
				startTime: '2026-10-22T08:00:00.000Z'
			})
		],
		'next-past'
	)
};
const RELATIVE = {
	...ACCOUNT,
	key: { kind: 'relative', id: REL },
	person: { kind: 'ACCOUNT', patientId: P, relativeId: REL },
	firstName: 'Νίκος',
	lastName: 'Μαυρίδης',
	phone: null,
	email: null,
	amka: '01021512345',
	afm: null,
	gender: 'MALE',
	relationship: 'CHILD',
	visits: { count: 0, firstAt: null, lastAt: null },
	noShows: 0,
	conversationId: null,
	bookedBy: {
		firstName: 'Ελένη',
		lastName: 'Μαυρίδη',
		phone: '306941234567',
		email: 'eleni.mavridi@example.gr',
		amka: '12057801234',
		afm: '123456783'
	},
	past: pageOf([])
};
const RECORD = {
	...ACCOUNT,
	key: { kind: 'record', id: R },
	person: { kind: 'RECORD', recordId: R },
	hasAccount: false,
	firstName: 'Μαρία',
	lastName: 'Καρρά',
	email: null,
	amka: null,
	afm: null,
	editable: true,
	conversationId: C,
	addedAt: '2026-10-30T10:00:00.000Z',
	mergeCandidate: { key: { kind: 'account', id: P }, firstName: 'Ιωάννα', lastName: 'Καρρά' },
	upcoming: pageOf([]),
	past: pageOf([])
};

let reads: URL[] = [];
function serve(card: unknown, status = 200, more: unknown = pageOf([])) {
	reads = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string) => {
			const url = new URL(String(input));
			reads.push(url);
			const data = url.pathname.endsWith('/appointments') ? more : card;
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

const links = {
	back: '/doctor/patients',
	appointment: (id: string, section: string) =>
		`/doctor/appointments/${id}${section === 'past' ? '?tab=history' : ''}`,
	newAppointment: `/doctor/appointments/new?from=patient&kind=account&id=${P}`,
	conversation: (id: string) => `/doctor/messages/${id}`,
	newConversation: '/doctor/messages/new?kind=relative&id=card' as string | null,
	step: (step: string) => `/doctor/patients/record/${R}/${step}`
};

function open(patientKey: DoctorPatientAddressKey, memory: DoctorPatientMemory | null = null) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
	return render(Harness, { props: { client, patientKey, links, memory } });
}

const card = () => screen.getByTestId('doctor-patient');
const ready = () => waitFor(() => expect(card()).toHaveAttribute('data-state', 'ready'));
const text = (id: string) => screen.getByTestId(id).textContent?.replace(/\s+/gu, ' ').trim();

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true, now: TODAY_NOW });
	resetServerClock();
	appPage.state = {};
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	appPage.state = {};
});

describe('screen 73’s card (D-W51-75)', () => {
	it('an account: the initials, the name, «4 επισκέψεις · 1 φορά δεν ήρθε · πρώτη 3 Μαρτίου 2026»; «Κλήση» · «Μήνυμα» · «Νέο ραντεβού»; «Επόμενα» each a link to its 68', async () => {
		serve(ACCOUNT);
		open({ kind: 'account', id: P });
		await ready();
		expect(reads[0]?.pathname).toMatch(
			new RegExp(`/appointment/doctor/patients/account/${P}$`, 'u')
		);
		expect(screen.getByTestId('doctor-patient-head')).toHaveTextContent('ΙΚ');
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ιωάννα Καρρά');
		expect(text('doctor-patient-stats')).toBe(
			'4 επισκέψεις · 1 φορά δεν ήρθε · πρώτη 3 Μαρτίου 2026'
		);
		expect(screen.getByTestId('doctor-patient-call')).toHaveAttribute('href', 'tel:+306977654321');
		expect(screen.getByTestId('doctor-patient-message')).toHaveAttribute(
			'href',
			`/doctor/messages/${C}`
		);
		expect(screen.getByTestId('doctor-patient-new')).toHaveAttribute('href', links.newAppointment);
		const upcoming = screen.getByTestId('doctor-patient-upcoming');
		expect(within(upcoming).getByRole('heading', { level: 2 })).toHaveTextContent(
			'Επόμενα ραντεβού'
		);
		const row = screen.getByTestId(`doctor-patient-upcoming-row-${UP}`);
		expect(row).toHaveAttribute('href', `/doctor/appointments/${UP}`);
		expect(row).toHaveTextContent('Δευτέρα 16 Νοεμβρίου · 11:00');
		expect(row).toHaveTextContent('Επίσκεψη · 30 λεπτά · Κηφισίας 120');
		expect(row).toHaveTextContent('Επιβεβαιωμένο');
		expect(screen.getByTestId(`doctor-patient-past-row-${PAST[0]}`)).toHaveAttribute(
			'href',
			`/doctor/appointments/${PAST[0]}?tab=history`
		);
		expect(screen.queryByTestId('doctor-patient-edit')).toBeNull();
		expect(screen.queryByTestId('doctor-patient-merge-box')).toBeNull();
	});

	it('🔴 U-182.7: the card shows ΑΜΚΑ, ΑΦΜ, the mobile and the email WHOLE — and «only the patient changes them»', async () => {
		serve(ACCOUNT);
		open({ kind: 'account', id: P });
		await ready();
		const details = screen.getByTestId('doctor-patient-details');
		expect(within(details).getByRole('heading', { level: 2 })).toHaveTextContent('Στοιχεία');
		expect(text('doctor-patient-row-phone')).toBe(
			`Κινητό +30${NBSP}697${NBSP}765${NBSP}4321`.replace(/\s+/gu, ' ')
		);
		expect(text('doctor-patient-row-email')).toBe('Email ioanna.karra@example.gr');
		expect(text('doctor-patient-row-amka')).toBe('ΑΜΚΑ 23048501234');
		expect(text('doctor-patient-row-afm')).toBe('ΑΦΜ 098765432');
		expect(details).not.toHaveTextContent(/\*|•/u);
		expect(screen.getByTestId('doctor-patient-note')).toHaveTextContent(
			'Τα στοιχεία τα αλλάζει μόνο ο ίδιος ο ασθενής, από τον λογαριασμό του.'
		);
	});

	it('«Νέο ραντεβού» opens screen 72 with the patient chosen, one step on (`doctorAppointment` depth 1)', async () => {
		serve(ACCOUNT);
		open({ kind: 'account', id: P });
		await ready();
		await userEvent.click(screen.getByTestId('doctor-patient-new'));
		expect(vi.mocked(goto)).toHaveBeenCalledWith(links.newAppointment, {
			state: { doctorAppointment: { depth: 1 } }
		});
	});

	it('σελίδες: «Περισσότερα» of «Προηγούμενα» reads the next page from the card’s cursor, then hides at the end', async () => {
		serve(
			ACCOUNT,
			200,
			pageOf([
				doctorAppointmentRow({
					id: PAST[1],
					status: 'no_show',
					startTime: '2026-07-02T09:00:00.000Z'
				})
			])
		);
		open({ kind: 'account', id: P });
		await ready();
		expect(screen.queryByTestId('doctor-patient-upcoming-more')).toBeNull();
		await userEvent.click(screen.getByTestId('doctor-patient-past-more'));
		await waitFor(() =>
			expect(screen.getByTestId(`doctor-patient-past-row-${PAST[1]}`)).toHaveTextContent('Δεν ήρθε')
		);
		const more = reads.find((url) => url.pathname.endsWith('/appointments'));
		expect(Object.fromEntries(more?.searchParams ?? [])).toEqual({
			section: 'past',
			limit: '10',
			cursor: 'next-past'
		});
		await waitFor(() => expect(screen.queryByTestId('doctor-patient-past-more')).toBeNull());
	});

	// Rewrites «no «Μήνυμα» without a conversation» (step 9, U-193.1 until step 10) → D-W51-87: the doctor writes first.
	it('a relative: «Πρώτη επίσκεψη σε εσάς», the tag «Το κλείνει: …»; «Ασθενής» (ΑΜΚΑ, Φύλο) and the holder WHOLE; «Κλήση» calls the holder; 🔴 U-193.1: «Μήνυμα» without a conversation starts one; «Κανένα ακόμη.»', async () => {
		serve(RELATIVE);
		open({ kind: 'relative', id: REL });
		await ready();
		expect(text('doctor-patient-stats')).toBe('Πρώτη επίσκεψη σε εσάς');
		expect(screen.getByTestId('doctor-patient-tag-booked-by')).toHaveTextContent(
			'Το κλείνει: Ελένη Μαυρίδη (γονέας)'
		);
		expect(
			within(screen.getByTestId('doctor-patient-details')).getAllByRole('heading')[0]
		).toHaveTextContent('Ασθενής');
		expect(text('doctor-patient-row-amka')).toBe('ΑΜΚΑ 01021512345');
		expect(text('doctor-patient-row-gender')).toBe('Φύλο Άνδρας');
		expect(screen.queryByTestId('doctor-patient-row-phone')).toBeNull();
		expect(screen.getByTestId('doctor-patient-booker')).toHaveTextContent(
			'Το κλείνει: Ελένη Μαυρίδη (γονέας)'
		);
		expect(text('doctor-patient-booker-row-email')).toBe('Email eleni.mavridi@example.gr');
		expect(text('doctor-patient-booker-row-afm')).toBe('ΑΦΜ 123456783');
		expect(screen.getByTestId('doctor-patient-call')).toHaveAttribute('href', 'tel:+306941234567');
		expect(screen.getByTestId('doctor-patient-message')).toHaveAttribute(
			'href',
			'/doctor/messages/new?kind=relative&id=card'
		);
		expect(screen.getByTestId('doctor-patient-note')).toHaveTextContent(
			'Τα στοιχεία αλλάζουν μόνο από τον λογαριασμό eDoctor που κλείνει τα ραντεβού.'
		);
		expect(screen.getByTestId('doctor-patient-past')).toHaveTextContent('Κανένα ακόμη.');
		expect(card()).not.toHaveTextContent('Ημερομηνία γέννησης');
	});

	it('a record (D-W51-71 / 76): «Χωρίς λογαριασμό eDoctor», no «Μήνυμα» whatever the answer says, «Δεν έχει δοθεί» muted, «Τον προσθέσατε εσείς στις …» and «Επεξεργασία» one step on', async () => {
		serve(RECORD);
		open({ kind: 'record', id: R });
		await ready();
		expect(screen.getByTestId('doctor-patient-tag-no-account')).toHaveTextContent(
			'Χωρίς λογαριασμό eDoctor'
		);
		expect(screen.queryByTestId('doctor-patient-message')).toBeNull();
		expect(text('doctor-patient-row-amka')).toBe('ΑΜΚΑ Δεν έχει δοθεί');
		const missing = [...screen.getByTestId('doctor-patient-row-amka').querySelectorAll('p')].at(-1);
		expect(missing?.className).toContain('text-muted-foreground');
		expect(screen.getByTestId('doctor-patient-note')).toHaveTextContent(
			'Τον προσθέσατε εσείς στις 30 Οκτωβρίου 2026. Τα στοιχεία τα βλέπετε και τα αλλάζετε μόνο εσείς.'
		);
		const edit = screen.getByTestId('doctor-patient-edit');
		expect(edit).toHaveAttribute('href', `/doctor/patients/record/${R}/edit`);
		await userEvent.click(edit);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/doctor/patients/record/${R}/edit`, {
			state: { doctorPatient: { depth: 1 } }
		});
	});

	it('🔴 U-198.2: η ένωση μόνο στον γιατρό, οθόνη επιβεβαίωσης — «Ίσως είναι ο ίδιος με τον λογαριασμό …» and «Ένωση» opens a SCREEN one step on (no dialog, no write here)', async () => {
		serve(RECORD);
		open({ kind: 'record', id: R });
		await ready();
		const box = screen.getByTestId('doctor-patient-merge-box');
		expect(box).toHaveTextContent('Ίσως είναι ο ίδιος με τον λογαριασμό Ιωάννα Καρρά.');
		const merge = screen.getByTestId('doctor-patient-merge');
		expect(merge).toHaveAttribute('href', `/doctor/patients/record/${R}/merge`);
		const writes = () =>
			vi
				.mocked(fetch)
				.mock.calls.filter((call) => (call[1] as RequestInit | undefined)?.method === 'POST');
		await userEvent.click(merge);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/doctor/patients/record/${R}/merge`, {
			state: { doctorPatient: { depth: 1 } }
		});
		expect(writes()).toHaveLength(0);
		expect(document.querySelector('[role="dialog"]')).toBeNull();
	});

	it('D-W51-76: what «Στοιχεία ασθενή» just saved on THIS card — «Αποθηκεύτηκε.»; another card’s says nothing', async () => {
		const memory = new DoctorPatientMemory();
		memory.remember(`record:${R}`, 'saved');
		serve(RECORD);
		const view = open({ kind: 'record', id: R }, memory);
		await ready();
		expect(screen.getByTestId('doctor-patient-done')).toHaveTextContent('Αποθηκεύτηκε.');
		view.unmount();
		serve(ACCOUNT);
		open({ kind: 'account', id: P }, memory);
		await ready();
		expect(screen.queryByTestId('doctor-patient-done')).toBeNull();
	});

	it('🔴 D-W51-63: another doctor’s patient and one that does not exist read the same «δεν βρέθηκε», with the way to the list; a failed read «Δοκιμάστε ξανά»', async () => {
		serve(null, 404);
		const view = open({ kind: 'account', id: P });
		await waitFor(() => expect(card()).toHaveAttribute('data-state', 'missing'));
		expect(screen.getByTestId('doctor-patient-missing')).toHaveTextContent(
			'Ο ασθενής δεν βρέθηκε στους ασθενείς σας.'
		);
		view.unmount();
		serve(null, 500);
		open({ kind: 'account', id: P });
		// One retry of a read that is not a final refusal (the module's queries), then the failure.
		await waitFor(() => expect(card()).toHaveAttribute('data-state', 'failed'), { timeout: 4000 });
		expect(screen.getByTestId('doctor-patient-failed')).toHaveTextContent('Δοκιμάστε ξανά');
	});

	it('(negative, U-65.6) every word of the card is text, never HTML', async () => {
		serve({ ...RECORD, firstName: '<img src=x onerror=alert(1)>', lastName: '<b>x</b>' });
		open({ kind: 'record', id: R });
		await waitFor(() => expect(card()).toHaveAttribute('data-state', 'ready'));
		expect(card().querySelector('img, b')).toBeNull();
	});
});

describe('🔴 D-W51-73 · πρότυπο pt-back: «‹» goes back where the card was opened from', () => {
	it('opened one step on (from the 68’s name, from the list below 1128): «‹» is the history’s step back — and shows from 1128 too', async () => {
		appPage.state = { doctorPatient: { depth: 1 } };
		const go = vi.spyOn(history, 'go').mockImplementation(() => {});
		serve(ACCOUNT);
		open({ kind: 'account', id: P });
		await ready();
		const back = screen.getByTestId('doctor-patient-back');
		expect(back.className).not.toContain('laptop:hidden');
		await userEvent.click(back);
		expect(go).toHaveBeenCalledWith(-1);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('opened from a link alone: «‹» goes to the list in place (never out of the site); from 1128 the list beside it is the way, «‹» hides', async () => {
		const go = vi.spyOn(history, 'go').mockImplementation(() => {});
		serve(ACCOUNT);
		open({ kind: 'account', id: P });
		await ready();
		const back = screen.getByTestId('doctor-patient-back');
		expect(back).toHaveAttribute('href', '/doctor/patients');
		expect(back.className).toContain('laptop:hidden');
		await userEvent.click(back);
		expect(go).not.toHaveBeenCalled();
		expect(vi.mocked(goto)).toHaveBeenCalledWith('/doctor/patients', { replaceState: true });
	});
});
