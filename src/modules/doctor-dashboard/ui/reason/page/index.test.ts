import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page as appPage } from '$app/state';
import { resetServerClock } from '$shared/lib/server-clock';
import { Session } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import {
	doctorAppointmentDetailRow,
	doctorRequestForRelativeRow,
	TODAY_NOW
} from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import type { DoctorReasonStep } from '$modules/doctor-dashboard/lib/paths';
import { projectRoot } from '../../../../../../tests/architecture/source-scan';
import Harness from './reason.harness.svelte';

/*
 * Wave 5.1 · screen 69 «Απόρριψη αιτήματος» / «Ακύρωση ραντεβού» (D-W51-46 … 49, card w51-w5): the page with the server
 * stubbed at `fetch` (the module's precedent), «now» the prototype's Saturday 14 November 2026, 12:40 Athens. Made-up
 * people and numbers.
 */

type Detail = ReturnType<typeof doctorAppointmentDetailRow>;

const REQUEST = '0193d000-0000-7000-8000-0000000000a1';
const KEPT = '0193d000-0000-7000-8000-0000000000a2';
const NBSP = '\u00a0';

let calls: { method: string; url: URL; body: unknown }[] = [];
let answer: {
	read: Detail | null;
	status?: number;
	/** What the server reads AFTER a write was refused (the state changed meanwhile). */
	reread?: Detail;
	write?: { status: number; body?: Detail; error?: boolean; wait?: Promise<void> };
};

const envelope = (data: unknown, status = 200) =>
	new Response(
		status < 400
			? JSON.stringify({ status: 'success', message: '', data })
			: JSON.stringify({ status: 'error', message: 'refused' }),
		{ status }
	);

function serve(next: typeof answer) {
	answer = next;
	calls = [];
	let wrote = false;
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : null });
			if (method === 'POST') {
				wrote = true;
				const write = answer.write ?? { status: 200 };
				if (write.wait) await write.wait;
				if (write.error) throw new TypeError('Failed to fetch');
				return envelope(write.body ?? answer.read, write.status);
			}
			if (method === 'GET' && !url.pathname.endsWith('/appointment/appointments')) {
				return envelope(wrote && answer.reread ? answer.reread : answer.read, answer.status ?? 200);
			}
			return envelope({ items: [], nextCursor: null, total: 0 });
		})
	);
}

const hrefOf = (id: string) => `/doctor/appointments/${id}?tab=requests`;
const timeHrefOf = (id: string) => `/doctor/appointments/${id}/time?tab=requests`;

function open(
	step: DoctorReasonStep = 'reject',
	appointmentId = REQUEST,
	options: { session?: Session } = {}
) {
	const toasts = new ToastState();
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
	const view = render(Harness, {
		props: {
			toasts,
			client,
			appointmentId,
			step,
			links: { appointment: hrefOf(appointmentId), time: timeHrefOf(appointmentId) },
			session: options.session ?? null
		}
	});
	return { toasts, client, view };
}

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const form = () => screen.getByTestId('doctor-reason');
const ready = () => waitFor(() => expect(form()).toBeInTheDocument());
const submit = () => screen.getByTestId('doctor-reason-submit');
const reasons = () => within(screen.getByTestId('doctor-reason-reasons')).getAllByRole('radio');
const message = () => screen.getByTestId('doctor-reason-message') as HTMLTextAreaElement;
const posts = () => calls.filter((call) => call.method === 'POST');
const reads = (id: string) =>
	calls.filter((call) => call.method === 'GET' && call.url.pathname.endsWith(id));
const kept = (patch: Parameters<typeof doctorAppointmentDetailRow>[0] = {}) =>
	doctorAppointmentDetailRow({ actions: { canCancel: true }, ...patch });

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

describe('🔴 the guards of the contract (card w51-w5)', () => {
	it('🔴 U-102: απόρριψη / ακύρωση γιατρού = οθόνη, όχι φύλλο — a section of its page on the shared step screen; the slice imports no window, sheet or drawer', async () => {
		serve({ read: doctorRequestForRelativeRow() });
		open();
		await ready();
		expect(form()).toHaveAttribute('data-slot', 'step-screen');
		expect(form()).toHaveAttribute('data-placement', 'centred');
		expect(form().tagName).toBe('SECTION');
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Απόρριψη αιτήματος');
		expect(
			document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal]')
		).toBeNull();
		const slice = join(projectRoot, 'src/modules/doctor-dashboard/ui/reason');
		const sources: string[] = [];
		const walk = (folder: string) => {
			for (const entry of readdirSync(folder)) {
				const path = join(folder, entry);
				if (statSync(path).isDirectory()) walk(path);
				else if (!/\.test\.ts$|harness\.svelte$/u.test(entry)) sources.push(path);
			}
		};
		walk(slice);
		expect(sources.length).toBeGreaterThan(3);
		for (const path of sources) {
			expect(readFileSync(path, 'utf8'), relative(projectRoot, path)).not.toMatch(
				/action-dialog|info-dialog|modal-screen|primitives\/(?:sheet|drawer|dialog)|bottom-sheet|role="dialog"/u
			);
		}
	});

	it('🔴 D-W51-47: το κουμπί ανοίγει μόνο με λόγο — locked with none chosen (nothing sent), open once one is', async () => {
		serve({ read: doctorRequestForRelativeRow() });
		open();
		await ready();
		expect(reasons().map((row) => row.getAttribute('aria-checked'))).toEqual([
			'false',
			'false',
			'false',
			'false'
		]);
		expect(submit()).toBeDisabled();
		await user().type(message(), 'Λυπάμαι.');
		expect(submit()).toBeDisabled();
		await user().click(submit());
		expect(posts()).toHaveLength(0);
		await user().click(reasons()[1]);
		expect(reasons()[1]).toHaveAttribute('aria-checked', 'true');
		expect(submit()).toBeEnabled();
	});

	it('🔴 U-65.6 / D-W51-34: μήνυμα ως 500 — the field’s bound is the contract’s 500, a paste of 501 is cut to 500 and «500/500», 500 travel', async () => {
		serve({ read: doctorRequestForRelativeRow() });
		open();
		await ready();
		expect(message()).toHaveAttribute('maxlength', '500');
		expect(screen.getByText('0/500')).toBeInTheDocument();
		await fireEvent.input(message(), { target: { value: 'α'.repeat(501) } });
		expect(message().value).toHaveLength(500);
		expect(screen.getByText('500/500')).toBeInTheDocument();
		await user().click(reasons()[0]);
		await user().click(submit());
		await waitFor(() => expect(posts()).toHaveLength(1));
		expect((posts()[0].body as { message: string }).message).toHaveLength(500);
	});
});

describe('screen 69 · the refusal of a request (88 §69, `sw.js:446-480`)', () => {
	// Rewrites «… and no «Θέλετε απλώς άλλη ώρα;» in step 5»: D-W51-51 (step 6) brings it, card w51-w6 §3.
	it('the box «Το αίτημα», «Θέλετε απλώς άλλη ώρα;» to screen 70, the four reasons of the server in its order, the words, what will happen, «Να μείνει»', async () => {
		serve({ read: doctorRequestForRelativeRow() });
		open();
		await ready();
		const box = screen.getByTestId('doctor-reason-context');
		expect(box).toHaveTextContent('Το αίτημα');
		expect(box).toHaveTextContent('Σάββατο 14 Νοεμβρίου · 17:30');
		expect(box).toHaveTextContent('Νίκος Μαυρίδης · Επίσκεψη · 30 λεπτά');
		expect(box).toHaveTextContent('Πατησίων 45');
		expect(box).toHaveTextContent('ΝΜ');
		expect(screen.queryByTestId('doctor-reason-soon')).toBeNull();
		const offer = screen.getByTestId('doctor-reason-offer');
		expect(offer).toHaveTextContent('Θέλετε απλώς άλλη ώρα;');
		expect(offer).toHaveTextContent('Αλλάξτε την ώρα και το ραντεβού επιβεβαιώνεται.');
		expect(screen.getByTestId('doctor-reason-offer-time')).toHaveAttribute(
			'href',
			timeHrefOf(REQUEST)
		);
		expect(screen.getByText('Επιλέξτε τον λόγο')).toBeInTheDocument();
		expect(reasons().map((row) => row.textContent?.trim())).toEqual([
			'Δεν είμαι διαθέσιμος/η',
			'Η ώρα είναι πιασμένη',
			'Χρειάζεται άλλη υπηρεσία',
			'Άλλος λόγος'
		]);
		expect(screen.getByLabelText('Μήνυμα προς τον ασθενή (προαιρετικό)')).toHaveAttribute(
			'placeholder',
			'Ό,τι θέλετε να ξέρει'
		);
		expect(
			within(screen.getByTestId('doctor-reason-then'))
				.getAllByRole('listitem')
				.map((item) => item.textContent)
		).toEqual([
			'Ο ασθενής ενημερώνεται αμέσως και βλέπει τον λόγο και το μήνυμά σας.',
			'Η ώρα ελευθερώνεται για άλλους ασθενείς.',
			'Η απόρριψη δεν αναιρείται.'
		]);
		expect(screen.getByTestId('doctor-reason-keep')).toHaveTextContent('Να μείνει');
		expect(submit()).toHaveTextContent('Απόρριψη αιτήματος');
		// The red button of the prototype (`.a-cta`): the 53's own accent.
		expect(submit().className).toContain('bg-accent');
	});

	it('🔴 D-W51-48: success ⇒ ONE POST with the reason and the words, the answer IS the detail, the lists read again, the toast, back to the 68 in place', async () => {
		const rejected = {
			...doctorRequestForRelativeRow(),
			status: 'rejected',
			rejectedBy: 'DOCTOR',
			rejectedAt: '2026-11-14T10:41:00.000Z',
			rejectReasonCode: 'SLOT_TAKEN',
			rejectReasonText: 'Αυτή την ώρα έχω ήδη άλλον ασθενή.',
			actions: { canConfirm: false, canReject: false, canReschedule: false, canCancel: false }
		} as unknown as Detail;
		serve({ read: doctorRequestForRelativeRow(), write: { status: 200, body: rejected } });
		const { toasts, client } = open();
		const invalidate = vi.spyOn(client, 'invalidateQueries');
		await ready();
		await user().click(reasons()[1]);
		await user().type(message(), '  Αυτή την ώρα έχω ήδη άλλον ασθενή.  ');
		await user().click(submit());
		await waitFor(() =>
			expect(toasts.current?.message).toBe('Το αίτημα απορρίφθηκε. Ο ασθενής ενημερώνεται.')
		);
		expect(posts()).toHaveLength(1);
		expect(posts()[0].url.pathname).toMatch(new RegExp(`/${REQUEST}/reject$`, 'u'));
		expect(posts()[0].body).toEqual({
			reasonCode: 'SLOT_TAKEN',
			message: 'Αυτή την ώρα έχω ήδη άλλον ασθενή.'
		});
		expect(client.getQueryData(doctorDashboardQueryKeys.detail(REQUEST))).toMatchObject({
			status: 'rejected',
			rejectReasonCode: 'SLOT_TAKEN'
		});
		expect(invalidate).toHaveBeenCalledWith({ queryKey: doctorDashboardQueryKeys.appointments() });
		// Opened from a card or a link (no step behind it): the 68 takes its place in the history.
		expect(vi.mocked(goto)).toHaveBeenCalledWith(hrefOf(REQUEST), { replaceState: true });
		// The screen stays as it was while it leaves (never «δεν γίνεται πια» for what it just did).
		expect(form()).toBeInTheDocument();
		expect(screen.queryByTestId('doctor-reason-closed')).toBeNull();
	});

	it('🔴 U-200.1 · D-W51-91: a refusal asks the doctor’s side of the notifications again (the server read «Νέο αίτημα» itself), so his dot goes out without a reload — never the patient’s side', async () => {
		const rejected = {
			...doctorRequestForRelativeRow(),
			status: 'rejected',
			actions: { canConfirm: false, canReject: false, canReschedule: false, canCancel: false }
		} as unknown as Detail;
		serve({ read: doctorRequestForRelativeRow(), write: { status: 200, body: rejected } });
		const { toasts, client } = open();
		client.setQueryData(['notifications', 'inbox', 'doctor', 'unread'], 1);
		client.setQueryData(['notifications', 'inbox', 'patient', 'unread'], 2);
		await ready();
		await user().click(reasons()[1]);
		await user().click(submit());
		await waitFor(() => expect(toasts.current?.message).toBeTruthy());
		const stale = (side: string) =>
			client.getQueryState(['notifications', 'inbox', side, 'unread'])?.isInvalidated;
		expect(stale('doctor')).toBe(true);
		expect(stale('patient')).toBe(false);
	});

	it('opened from the 68 (one step behind it): the done action goes back that step; blank words are not sent', async () => {
		appPage.state = { doctorAppointment: { depth: 1 } };
		const go = vi.spyOn(history, 'go').mockImplementation(() => {});
		serve({ read: doctorRequestForRelativeRow(), write: { status: 200 } });
		open();
		await ready();
		await user().click(reasons()[3]);
		await user().type(message(), '   ');
		await user().click(submit());
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		expect(posts()[0].body).toEqual({ reasonCode: 'OTHER' });
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('«‹» and «Να μείνει» write nothing and go back to the 68 of the same appointment, its pill kept', async () => {
		serve({ read: doctorRequestForRelativeRow() });
		open();
		await ready();
		const back = screen.getByTestId('doctor-reason-back');
		expect(back).toHaveAttribute('href', hrefOf(REQUEST));
		expect(back).toHaveAccessibleName('Πίσω');
		await user().click(screen.getByTestId('doctor-reason-keep'));
		expect(vi.mocked(goto)).toHaveBeenCalledWith(hrefOf(REQUEST), { replaceState: true });
		expect(posts()).toHaveLength(0);
	});

	it('«‹» goes back the one step it was opened with', async () => {
		appPage.state = { doctorAppointment: { depth: 1 } };
		const go = vi.spyOn(history, 'go').mockImplementation(() => {});
		serve({ read: doctorRequestForRelativeRow() });
		open();
		await ready();
		await user().click(screen.getByTestId('doctor-reason-back'));
		expect(go).toHaveBeenCalledWith(-1);
		expect(posts()).toHaveLength(0);
	});
});

describe('screen 69 · the cancellation of a kept appointment', () => {
	it('«Είναι κοντά»: within a day on the server’s clock «Το ραντεβού είναι σε 20 λεπτά.» and the booker’s mobile to call; the three reasons', async () => {
		serve({ read: kept({ startTime: new Date(TODAY_NOW + 20 * 60_000).toISOString() }) });
		open('cancel', KEPT);
		await ready();
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ακύρωση ραντεβού');
		expect(screen.getByTestId('doctor-reason-context')).toHaveTextContent('Το ραντεβού');
		const soon = screen.getByTestId('doctor-reason-soon');
		expect(soon).toHaveAttribute('data-tone', 'warm');
		expect(soon).toHaveTextContent('Το ραντεβού είναι σε 20 λεπτά.');
		expect(soon).toHaveTextContent('Αν μπορείτε, τηλεφωνήστε και στον ασθενή:');
		const call = screen.getByTestId('doctor-reason-call');
		expect(call).toHaveAttribute('href', 'tel:+306977654321');
		// U-182.7: the whole number, its groups joined by no-break spaces (jest-dom's text match would fold them).
		expect(call.textContent?.trim()).toBe(['+30', '697', '765', '4321'].join(NBSP));
		expect(reasons().map((row) => row.textContent?.trim())).toEqual([
			'Δεν είμαι διαθέσιμος/η',
			'Έκτακτο περιστατικό',
			'Άλλος λόγος'
		]);
		expect(screen.getByTestId('doctor-reason-then')).toHaveTextContent('Η ακύρωση δεν αναιρείται.');
		expect(submit()).toHaveTextContent('Ακύρωση ραντεβού');
	});

	it('(negative) «είναι κοντά» never for one 2 days away, never for a refusal; without a mobile the sentence alone', async () => {
		serve({ read: kept() });
		const far = open('cancel', KEPT);
		await ready();
		expect(screen.queryByTestId('doctor-reason-soon')).toBeNull();
		far.view.unmount();
		const near = new Date(TODAY_NOW + 5 * 60 * 60_000).toISOString();
		serve({
			read: kept({
				startTime: near,
				patientSnapshot: {
					id: 'x',
					tenantUserId: null,
					firstName: 'Ιωάννα',
					lastName: 'Καρρά',
					phoneE164: null,
					email: null,
					amka: null,
					afm: null
				}
			})
		});
		const quiet = open('cancel', KEPT);
		await ready();
		expect(screen.getByTestId('doctor-reason-soon')).toHaveTextContent(
			'Το ραντεβού είναι σε 5 ώρες.'
		);
		expect(screen.queryByTestId('doctor-reason-call')).toBeNull();
		expect(screen.getByTestId('doctor-reason-soon')).not.toHaveTextContent('τηλεφωνήστε');
		quiet.view.unmount();
		serve({ read: { ...doctorRequestForRelativeRow(), startTime: near } as Detail });
		open('reject');
		await ready();
		expect(screen.queryByTestId('doctor-reason-soon')).toBeNull();
	});

	it('success ⇒ POST …/cancel with `reasonText`; the toast «Το ραντεβού ακυρώθηκε. Ο ασθενής ενημερώνεται.»', async () => {
		serve({ read: kept(), write: { status: 200 } });
		const { toasts } = open('cancel', KEPT);
		await ready();
		await user().click(reasons()[1]);
		await user().type(message(), 'Έκτακτο χειρουργείο.');
		await user().click(submit());
		await waitFor(() =>
			expect(toasts.current?.message).toBe('Το ραντεβού ακυρώθηκε. Ο ασθενής ενημερώνεται.')
		);
		expect(posts()[0].url.pathname).toMatch(new RegExp(`/${KEPT}/cancel$`, 'u'));
		expect(posts()[0].body).toEqual({
			reasonCode: 'EMERGENCY',
			reasonText: 'Έκτακτο χειρουργείο.'
		});
	});
});

describe('screen 69 · the hard moments (D-W51-48)', () => {
	it('🔴 409: the state changed meanwhile — its words, the appointment read again, and «δεν γίνεται πια» with ONE way back, no form', async () => {
		const expired = {
			...doctorRequestForRelativeRow(),
			status: 'expired',
			actions: { canConfirm: false, canReject: false, canReschedule: false, canCancel: false }
		} as unknown as Detail;
		serve({ read: doctorRequestForRelativeRow(), reread: expired, write: { status: 409 } });
		open();
		await ready();
		const before = reads(REQUEST).length;
		await user().click(reasons()[0]);
		await user().click(submit());
		await waitFor(() => expect(screen.getByTestId('doctor-reason-closed')).toBeInTheDocument());
		expect(reads(REQUEST).length).toBeGreaterThan(before);
		expect(screen.getByTestId('doctor-reason-closed-text')).toHaveTextContent(
			'Το ραντεβού άλλαξε στο μεταξύ, οπότε δεν έγινε τίποτα. Δείτε πώς είναι τώρα.'
		);
		expect(screen.getByTestId('doctor-reason-closed-text')).toHaveAttribute('role', 'alert');
		expect(screen.queryByTestId('doctor-reason-reasons')).toBeNull();
		expect(screen.queryByTestId('doctor-reason-keep')).toBeNull();
		const back = screen.getByTestId('doctor-reason-submit');
		expect(back).toHaveTextContent('Πίσω στο ραντεβού');
		await user().click(back);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(hrefOf(REQUEST), { replaceState: true });
		expect(posts()).toHaveLength(1);
	});

	it('422 / a lost request: its words, and the reason and the words STAY; too many writes «Πολλές προσπάθειες…»', async () => {
		serve({ read: doctorRequestForRelativeRow(), write: { status: 422 } });
		const first = open();
		await ready();
		await user().click(reasons()[2]);
		await user().type(message(), 'Χρειάζεται καρδιολόγος.');
		await user().click(submit());
		await waitFor(() =>
			expect(screen.getByTestId('doctor-reason-failure')).toHaveTextContent(
				'Η απόρριψη δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
			)
		);
		expect(reasons()[2]).toHaveAttribute('aria-checked', 'true');
		expect(message().value).toBe('Χρειάζεται καρδιολόγος.');
		await waitFor(() => expect(submit()).toBeEnabled());
		first.view.unmount();
		serve({ read: doctorRequestForRelativeRow(), write: { status: 200, error: true } });
		const second = open();
		await ready();
		await user().click(reasons()[0]);
		await user().click(submit());
		await waitFor(() => expect(screen.getByTestId('doctor-reason-failure')).toBeInTheDocument());
		expect(form()).toBeInTheDocument();
		second.view.unmount();
		serve({ read: doctorRequestForRelativeRow(), write: { status: 429 } });
		open();
		await ready();
		await user().click(reasons()[0]);
		await user().click(submit());
		await waitFor(() =>
			expect(screen.getByTestId('doctor-reason-failure')).toHaveTextContent(
				'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
			)
		);
	});

	it('🔴 no second press: while one is on its way the button waits and a second press sends nothing', async () => {
		let release = () => {};
		const wait = new Promise<void>((resolve) => (release = resolve));
		serve({ read: doctorRequestForRelativeRow(), write: { status: 200, wait } });
		open();
		await ready();
		await user().click(reasons()[0]);
		await user().click(submit());
		await waitFor(() => expect(submit()).toHaveAttribute('aria-busy', 'true'));
		await fireEvent.click(submit());
		await fireEvent.click(submit());
		release();
		await waitFor(() => expect(vi.mocked(goto)).toHaveBeenCalled());
		expect(posts()).toHaveLength(1);
	});

	it('🔴 U-84: a `401` opens the sign-in over the screen; the reason stays', async () => {
		serve({ read: doctorRequestForRelativeRow(), write: { status: 401 } });
		const expire = vi.fn();
		const session = new Session({
			status: () => 'member',
			member: () => ({ firstName: 'Α' }),
			signOut: vi.fn(async () => true),
			expire
		});
		open('reject', REQUEST, { session });
		await ready();
		await user().click(reasons()[0]);
		await user().click(submit());
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
		expect(reasons()[0]).toHaveAttribute('aria-checked', 'true');
		expect(screen.queryByTestId('doctor-reason-failure')).toBeNull();
	});

	it('τελικό: opened on a closed one (a cold link, a request already refused, a request at «cancel») — «δεν γίνεται πια», no form, nothing to send', async () => {
		const refused = {
			...doctorRequestForRelativeRow(),
			status: 'rejected',
			rejectedBy: 'DOCTOR',
			actions: { canConfirm: false, canReject: false, canReschedule: false, canCancel: false }
		} as unknown as Detail;
		serve({ read: refused });
		const first = open();
		await waitFor(() => expect(screen.getByTestId('doctor-reason-closed')).toBeInTheDocument());
		expect(screen.getByTestId('doctor-reason-closed-text')).toHaveTextContent(
			'Το αίτημα δεν μπορεί πια να απορριφθεί.'
		);
		expect(screen.queryByTestId('doctor-reason-reasons')).toBeNull();
		expect(screen.queryByRole('textbox')).toBeNull();
		first.view.unmount();
		// A request is refused, never canceled (`sw.js:438`), though the server would take it.
		serve({ read: doctorRequestForRelativeRow() });
		const second = open('cancel');
		await waitFor(() => expect(screen.getByTestId('doctor-reason-closed')).toBeInTheDocument());
		expect(screen.getByTestId('doctor-reason-closed-text')).toHaveTextContent(
			'Το ραντεβού δεν μπορεί πια να ακυρωθεί.'
		);
		second.view.unmount();
		serve({ read: kept({ status: 'completed', actions: { canCancel: false } }) });
		open('cancel', KEPT);
		await waitFor(() => expect(screen.getByTestId('doctor-reason-closed')).toBeInTheDocument());
		expect(posts()).toHaveLength(0);
	});

	it('🔴 D-W51-06 (negative): another doctor’s appointment (`403`) and one that does not exist (`404`) read the same «δεν βρέθηκε», no person’s word', async () => {
		for (const status of [403, 404]) {
			serve({ read: null, status });
			const view = open();
			await waitFor(() => expect(screen.getByTestId('doctor-reason-missing')).toBeInTheDocument());
			expect(screen.getByTestId('doctor-reason-missing')).toHaveTextContent(
				'Δεν βρήκαμε αυτό το ραντεβού'
			);
			expect(document.body.textContent).not.toMatch(/Μαυρίδ|Καρρά/u);
			expect(screen.queryByTestId('doctor-reason-reasons')).toBeNull();
			view.view.unmount();
		}
	});

	it('(negative, U-65.6) HTML in the words travels as written and shows back as text; a name with HTML is text', async () => {
		const marked = {
			...doctorRequestForRelativeRow(),
			relativeSnapshot: {
				...(doctorRequestForRelativeRow() as unknown as { relativeSnapshot: object })
					.relativeSnapshot,
				firstName: '<img src=x onerror=alert(1)>'
			}
		} as unknown as Detail;
		serve({ read: marked, write: { status: 200 } });
		open();
		await ready();
		expect(document.querySelector('img')).toBeNull();
		await user().click(reasons()[0]);
		await fireEvent.input(message(), { target: { value: '<b>bold</b>' } });
		expect(message().value).toBe('<b>bold</b>');
		expect(document.querySelector('b')).toBeNull();
		await user().click(submit());
		await waitFor(() => expect(posts()).toHaveLength(1));
		expect(posts()[0].body).toEqual({ reasonCode: 'DOCTOR_UNAVAILABLE', message: '<b>bold</b>' });
	});
});

describe('screen 69 · «Θέλετε απλώς άλλη ώρα;» (step 6, D-W51-47 / 51; `sw.js:472`)', () => {
	it('a cancellation offers «Αλλάξτε την ώρα και το ραντεβού μένει.»; «Αλλαγή ώρας» opens screen 70 one step on (U-102)', async () => {
		serve({ read: kept({ actions: { canCancel: true, canReschedule: true } }) });
		appPage.state = { doctorAppointment: { depth: 1 } };
		open('cancel', KEPT);
		await ready();
		const offer = screen.getByTestId('doctor-reason-offer');
		expect(offer).toHaveTextContent('Θέλετε απλώς άλλη ώρα;');
		expect(offer).toHaveTextContent('Αλλάξτε την ώρα και το ραντεβού μένει.');
		const time = screen.getByTestId('doctor-reason-offer-time');
		expect(time).toHaveTextContent('Αλλαγή ώρας');
		expect(time).toHaveAttribute('href', timeHrefOf(KEPT));
		// Over the reasons (the 53's place).
		expect(offer.compareDocumentPosition(screen.getByTestId('doctor-reason-reasons'))).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING
		);
		await user().click(time);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(timeHrefOf(KEPT), {
			state: { doctorAppointment: { depth: 2 } }
		});
	});

	it('(negative) D-W51-51: no offer while the server does not let the hour move', async () => {
		serve({ read: kept({ actions: { canCancel: true, canReschedule: false } }) });
		open('cancel', KEPT);
		await ready();
		expect(screen.queryByTestId('doctor-reason-offer')).toBeNull();
		expect(document.body.textContent).not.toMatch(/Θέλετε απλώς άλλη ώρα/u);
	});
});
