import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page as appPage } from '$app/state';
import { resetServerClock } from '$shared/lib/server-clock';
import { Session } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import {
	doctorAppointmentDetailRow,
	TODAY_NOW
} from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { DoctorAppointmentMemory } from '$modules/doctor-dashboard/ui/memory';
import { projectRoot } from '../../../../../../tests/architecture/source-scan';
import Harness from './correction.harness.svelte';

/*
 * Wave 5.1 · screen 71 «Διόρθωση έκβασης» (D-W51-62, U-196.1, card w51-w7): the page with the server stubbed at `fetch`
 * (the module's precedent), «now» the prototype's Saturday 14 November 2026, 12:40 Athens. Made-up people and numbers.
 */

type Detail = ReturnType<typeof doctorAppointmentDetailRow>;

const ID = '0193d000-0000-7000-8000-0000000000a2';
const UNTIL = '2026-11-16T07:20:00.000Z';

let calls: { method: string; url: URL; body: unknown }[] = [];
let answer: {
	read: Detail | null;
	status?: number;
	/** What the server reads AFTER a write was refused (the state changed meanwhile). */
	reread?: Detail;
	write?: {
		status: number;
		body?: Detail;
		message?: string;
		/** A refusal's `details` (the review's mark, w51-b9). */
		details?: Record<string, string>;
		error?: boolean;
		wait?: Promise<void>;
	};
};

const envelope = (
	data: unknown,
	status = 200,
	message = 'refused',
	details?: Record<string, string>
) =>
	new Response(
		status < 400
			? JSON.stringify({ status: 'success', message: '', data })
			: JSON.stringify({ status: 'error', errorMessage: message, ...(details ? { details } : {}) }),
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
				return envelope(write.body ?? answer.read, write.status, write.message, write.details);
			}
			if (!url.pathname.endsWith('/appointment/appointments')) {
				return envelope(wrote && answer.reread ? answer.reread : answer.read, answer.status ?? 200);
			}
			return envelope({ items: [], nextCursor: null, total: 0 });
		})
	);
}

/** The prototype's `h1`: the system's «Ολοκληρώθηκε» of Saturday 09:00 – 09:20, correctable until Monday 09:20. */
const systemCompleted = (patch: Parameters<typeof doctorAppointmentDetailRow>[0] = {}) =>
	doctorAppointmentDetailRow({
		status: 'completed',
		startTime: '2026-11-14T07:00:00.000Z',
		outcomeSource: 'SYSTEM',
		outcomeAt: '2026-11-15T07:30:00.000Z',
		outcomeCorrectableUntil: UNTIL,
		...patch,
		actions: {
			canCancel: false,
			canReschedule: false,
			correction: { to: 'NO_SHOW', until: UNTIL } as never,
			...(patch.actions ?? {})
		}
	});

/** The prototype's `h3`: the doctor's own «Δεν ήρθε» of Friday 18:00, correctable until Sunday 18:20. */
const ownNoShow = () =>
	doctorAppointmentDetailRow({
		status: 'no_show',
		startTime: '2026-11-13T16:00:00.000Z',
		outcomeSource: 'DOCTOR',
		outcomeAt: '2026-11-13T16:40:00.000Z',
		outcomeCorrectableUntil: '2026-11-15T16:20:00.000Z',
		actions: {
			canCancel: false,
			canReschedule: false,
			correction: { to: 'COMPLETED', until: '2026-11-15T16:20:00.000Z' } as never
		}
	});

const hrefOf = (id: string) => `/doctor/appointments/${id}?tab=history`;

function open(
	options: { session?: Session; memory?: DoctorAppointmentMemory; locale?: 'el' | 'en' } = {}
) {
	const toasts = new ToastState();
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
	const view = render(Harness, {
		props: {
			toasts,
			client,
			appointmentId: ID,
			links: { appointment: hrefOf(ID) },
			session: options.session ?? null,
			memory: options.memory ?? null,
			locale: options.locale ?? 'el'
		}
	});
	return { toasts, client, view };
}

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const form = () => screen.getByTestId('doctor-correction');
const ready = () => waitFor(() => expect(form()).toBeInTheDocument());
const submit = () => screen.getByTestId('doctor-correction-submit');
const verdicts = () =>
	within(screen.getByTestId('doctor-correction-verdicts')).getAllByRole('radio');
const posts = () => calls.filter((call) => call.method === 'POST');

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

describe('🔴 the guards of the contract (card w51-w7)', () => {
	it('🔴 U-102: διόρθωση = οθόνη — a section of its page on the shared step screen; the slice imports no window, sheet or drawer', async () => {
		serve({ read: systemCompleted() });
		open();
		await ready();
		expect(form()).toHaveAttribute('data-slot', 'step-screen');
		expect(form()).toHaveAttribute('data-placement', 'centred');
		expect(form().tagName).toBe('SECTION');
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Διόρθωση έκβασης');
		expect(
			document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal]')
		).toBeNull();
		const slice = join(projectRoot, 'src/modules/doctor-dashboard/ui/correction');
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

	it('🔴 D-W51-62: «Αποθήκευση» opens only on the other verdict — locked on the current one (nothing sent), open on the opposite, locked again back on the current', async () => {
		serve({ read: systemCompleted() });
		open();
		await ready();
		expect(verdicts().map((row) => row.getAttribute('aria-checked'))).toEqual(['true', 'false']);
		expect(submit()).toBeDisabled();
		await user().click(submit());
		expect(posts()).toHaveLength(0);
		await user().click(verdicts()[1]);
		expect(verdicts()[1]).toHaveAttribute('aria-checked', 'true');
		expect(submit()).toBeEnabled();
		await user().click(verdicts()[0]);
		expect(submit()).toBeDisabled();
		expect(screen.queryByTestId('doctor-correction-then')).toBeNull();
	});
});

describe('screen 71 · «Διόρθωση έκβασης» (88 §71, `sw.js:557-577`)', () => {
	it('the system’s «Ολοκληρώθηκε»: the box «Η επίσκεψη», «Τώρα», «Τι έγινε τελικά;» (the current one «όπως είναι τώρα»); «Δεν ήρθε» chosen ⇒ the three lines; «Άκυρο» / «Αποθήκευση»', async () => {
		serve({ read: systemCompleted() });
		open();
		await ready();
		const box = screen.getByTestId('doctor-correction-context');
		expect(box).toHaveTextContent('Η επίσκεψη');
		expect(box).toHaveTextContent('Σάββατο 14 Νοεμβρίου · 09:00');
		expect(box).toHaveTextContent('Ιωάννα Καρρά · Επανέλεγχος · 20 λεπτά');
		expect(box).toHaveTextContent('ΙΚ');
		const now = screen.getByTestId('doctor-correction-now');
		expect(now).toHaveAttribute('data-slot', 'terms-box');
		expect(within(now).getByRole('heading', { level: 3 })).toHaveTextContent('Τώρα');
		expect(now).toHaveTextContent('«Ολοκληρώθηκε»');
		expect(now).toHaveTextContent('Γράφτηκε αυτόματα, γιατί δεν δηλώσατε έκβαση σε 24 ώρες.');
		expect(now).toHaveTextContent('Διορθώνεται ως Δευτέρα 16 Νοεμβρίου, 09:20');
		expect(now).toHaveTextContent('48 ώρες μετά το τέλος της επίσκεψης.');
		expect(screen.getByText('Τι έγινε τελικά;')).toBeInTheDocument();
		expect(verdicts().map((row) => row.textContent?.replace(/\s+/gu, ' ').trim())).toEqual([
			'Ολοκληρώθηκε όπως είναι τώρα',
			'Δεν ήρθε'
		]);
		await user().click(verdicts()[1]);
		expect(
			within(screen.getByTestId('doctor-correction-then'))
				.getAllByRole('listitem')
				.map((item) => item.textContent)
		).toEqual([
			'Ο ασθενής ενημερώνεται ότι γράφτηκε «Δεν ήρθε».',
			'Η πρόσκληση για κριτική ακυρώνεται.',
			'Αν ο ασθενής έχει ήδη γράψει κριτική, η διόρθωση δεν γίνεται.'
		]);
		expect(screen.getByTestId('doctor-correction-cancel')).toHaveTextContent('Άκυρο');
		expect(submit()).toHaveTextContent('Αποθήκευση');
		expect(submit().className).toContain('bg-accent');
	});

	it('🔴 U-196.1: διόρθωση συστήματος / δική του, προς τις δύο μεριές — the system’s «Ολοκληρώθηκε» ⇒ «Δεν ήρθε», the doctor’s own «Δεν ήρθε» ⇒ «Ολοκληρώθηκε» (two lines); ONE POST each, the answer IS the detail, the lists read again, the green card remembered, back to the 68', async () => {
		const corrected = {
			...systemCompleted(),
			status: 'no_show',
			outcomeSource: 'DOCTOR',
			actions: { ...systemCompleted().actions, correction: { to: 'COMPLETED', until: UNTIL } }
		} as unknown as Detail;
		serve({ read: systemCompleted(), write: { status: 200, body: corrected } });
		const memory = new DoctorAppointmentMemory();
		const first = open({ memory });
		const invalidate = vi.spyOn(first.client, 'invalidateQueries');
		await ready();
		await user().click(verdicts()[1]);
		await user().click(submit());
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(hrefOf(ID), { replaceState: true })
		);
		expect(posts()).toHaveLength(1);
		expect(posts()[0].url.pathname).toMatch(new RegExp(`/${ID}/outcome$`, 'u'));
		expect(posts()[0].body).toEqual({ outcome: 'NO_SHOW' });
		expect(first.client.getQueryData(doctorDashboardQueryKeys.detail(ID))).toMatchObject({
			status: 'no_show'
		});
		expect(invalidate).toHaveBeenCalledWith({ queryKey: doctorDashboardQueryKeys.appointments() });
		expect(memory.doneOf(ID)).toEqual({ kind: 'corrected', to: 'NO_SHOW' });
		// The screen stays as it was while it leaves (never the corrected answer drawn as a new form).
		expect(verdicts()[0]).toHaveTextContent('Ολοκληρώθηκε');
		expect(screen.queryByTestId('doctor-correction-closed')).toBeNull();
		first.view.unmount();
		vi.mocked(goto).mockClear();

		serve({ read: ownNoShow(), write: { status: 200 } });
		open({ memory });
		await ready();
		expect(screen.getByTestId('doctor-correction-now')).toHaveTextContent(
			'Το γράψατε εσείς · Παρασκευή 13 Νοεμβρίου, 18:40'
		);
		expect(screen.getByTestId('doctor-correction-now')).toHaveTextContent(
			'Διορθώνεται ως Κυριακή 15 Νοεμβρίου, 18:20'
		);
		expect(verdicts().map((row) => row.textContent?.replace(/\s+/gu, ' ').trim())).toEqual([
			'Δεν ήρθε όπως είναι τώρα',
			'Ολοκληρώθηκε'
		]);
		await user().click(verdicts()[1]);
		expect(
			within(screen.getByTestId('doctor-correction-then'))
				.getAllByRole('listitem')
				.map((item) => item.textContent)
		).toEqual(['Ο ασθενής ενημερώνεται.', 'Ο ασθενής μπορεί να γράψει κριτική για την επίσκεψη.']);
		await user().click(submit());
		await waitFor(() => expect(posts()).toHaveLength(1));
		expect(posts()[0].body).toEqual({ outcome: 'COMPLETED' });
		await waitFor(() => expect(memory.doneOf(ID)).toEqual({ kind: 'corrected', to: 'COMPLETED' }));
	});

	it('🔴 D-W51-62: κανένα διπλό πάτημα — a second press while the first is on its way sends nothing', async () => {
		let release = () => {};
		const held = new Promise<void>((resolve) => (release = resolve));
		serve({ read: systemCompleted(), write: { status: 200, wait: held } });
		open();
		await ready();
		await user().click(verdicts()[1]);
		await user().click(submit());
		await user().click(submit());
		await user().click(submit());
		expect(posts()).toHaveLength(1);
		release();
		await waitFor(() => expect(vi.mocked(goto)).toHaveBeenCalled());
		expect(posts()).toHaveLength(1);
	});

	it('«‹» and «Άκυρο» write nothing and go back to the 68 of the same appointment, its pill kept; opened from the 68 they go back that step', async () => {
		serve({ read: systemCompleted() });
		const first = open();
		await ready();
		const back = screen.getByTestId('doctor-correction-back');
		expect(back).toHaveAttribute('href', hrefOf(ID));
		expect(back).toHaveAccessibleName('Πίσω');
		await user().click(screen.getByTestId('doctor-correction-cancel'));
		expect(vi.mocked(goto)).toHaveBeenCalledWith(hrefOf(ID), { replaceState: true });
		expect(posts()).toHaveLength(0);
		first.view.unmount();
		appPage.state = { doctorAppointment: { depth: 1 } };
		const go = vi.spyOn(history, 'go').mockImplementation(() => {});
		serve({ read: systemCompleted() });
		open();
		await ready();
		await user().click(screen.getByTestId('doctor-correction-back'));
		expect(go).toHaveBeenCalledWith(-1);
		expect(posts()).toHaveLength(0);
	});
});

describe('screen 71 · what the server refuses (D-W51-62)', () => {
	it('🔴 U-196.1: 409 με κριτική — «Ο ασθενής έχει ήδη γράψει κριτική· η διόρθωση δεν γίνεται.», no form, one way back; the appointment read again', async () => {
		serve({
			read: systemCompleted(),
			// Rewrites the fixture of card w51-w7 (the words alone): card w51-w8 §2β — the server's 409 carries its mark.
			write: {
				status: 409,
				message:
					'Already exists: the patient already rated this visit, so it cannot be corrected to a no-show.',
				details: { reason: 'PATIENT_ALREADY_RATED' }
			}
		});
		open();
		await ready();
		await user().click(verdicts()[1]);
		await user().click(submit());
		const closed = await screen.findByTestId('doctor-correction-closed');
		expect(within(closed).getByTestId('doctor-correction-closed-text')).toHaveTextContent(
			'Ο ασθενής έχει ήδη γράψει κριτική· η διόρθωση δεν γίνεται.'
		);
		expect(within(closed).getByRole('alert')).toBeInTheDocument();
		expect(screen.queryByTestId('doctor-correction-verdicts')).toBeNull();
		expect(screen.getByTestId('doctor-correction-submit')).toHaveTextContent('Πίσω στο ραντεβού');
		expect(screen.getByTestId('doctor-correction-back')).toHaveAttribute('href', hrefOf(ID));
		await waitFor(() =>
			expect(
				calls.filter((call) => call.method === 'GET' && call.url.pathname.endsWith(ID)).length
			).toBeGreaterThan(1)
		);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('παράθυρο που πέρασε — another 409 (the window closed), a 403 or a 404 ⇒ «δεν γίνεται πια» + «‹»; a cold link to a visit the server opens no correction on too', async () => {
		for (const status of [409, 403, 404]) {
			serve({
				read: systemCompleted(),
				write: { status, message: 'Already exists: this outcome is no longer correctable.' }
			});
			const view = open();
			await ready();
			await user().click(verdicts()[1]);
			await user().click(submit());
			const closed = await screen.findByTestId('doctor-correction-closed');
			expect(closed, String(status)).toHaveTextContent(
				'Η έκβαση αυτής της επίσκεψης δεν μπορεί πια να διορθωθεί.'
			);
			expect(closed).not.toHaveTextContent('κριτική');
			view.view.unmount();
		}
		// The window passed before the page opened: the server opens no correction.
		serve({ read: systemCompleted({ actions: { correction: null } as never }) });
		open();
		await screen.findByTestId('doctor-correction-closed');
		expect(screen.getByTestId('doctor-correction-closed-text')).toHaveTextContent(
			'Η έκβαση αυτής της επίσκεψης δεν μπορεί πια να διορθωθεί.'
		);
		expect(screen.queryByTestId('doctor-correction-verdicts')).toBeNull();
	});

	it('the window ends while the doctor looks: the appointment is read again and the page says «δεν γίνεται πια»', async () => {
		const until = new Date(TODAY_NOW + 2 * 60_000).toISOString();
		serve({
			read: systemCompleted({
				outcomeCorrectableUntil: until,
				actions: { correction: { to: 'NO_SHOW', until } as never }
			})
		});
		open();
		await ready();
		serve({ read: systemCompleted({ actions: { correction: null } as never }) });
		await vi.advanceTimersByTimeAsync(2 * 60_000 + 1_500);
		await screen.findByTestId('doctor-correction-closed');
		expect(calls.filter((call) => call.method === 'GET').length).toBeGreaterThan(0);
	});

	it('a lost request, a 5xx, a 422 ⇒ its words, the choice stays; 429 ⇒ «Πολλές προσπάθειες…»; a new choice clears them', async () => {
		serve({ read: systemCompleted(), write: { status: 0, error: true } });
		const first = open();
		await ready();
		await user().click(verdicts()[1]);
		await user().click(submit());
		expect(await screen.findByTestId('doctor-correction-failure')).toHaveTextContent(
			'Η διόρθωση δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(verdicts()[1]).toHaveAttribute('aria-checked', 'true');
		await waitFor(() => expect(submit()).toBeEnabled());
		await user().click(verdicts()[0]);
		expect(screen.queryByTestId('doctor-correction-failure')).toBeNull();
		first.view.unmount();
		for (const [status, words] of [
			[500, 'Η διόρθωση δεν ολοκληρώθηκε.'],
			[422, 'Η διόρθωση δεν ολοκληρώθηκε.'],
			[429, 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.']
		] as const) {
			serve({ read: systemCompleted(), write: { status } });
			const view = open();
			await ready();
			await user().click(verdicts()[1]);
			await user().click(submit());
			expect(
				await screen.findByTestId('doctor-correction-failure'),
				String(status)
			).toHaveTextContent(words);
			expect(screen.getByTestId('doctor-correction-verdicts')).toBeInTheDocument();
			view.view.unmount();
		}
	});

	it('401 ⇒ the sign-in over the screen (U-84), the choice stays', async () => {
		serve({ read: systemCompleted(), write: { status: 401 } });
		const expire = vi.fn();
		const session = new Session({
			status: () => 'member',
			member: () => ({ firstName: 'Α' }),
			signOut: vi.fn(async () => true),
			expire
		});
		open({ session });
		await ready();
		await user().click(verdicts()[1]);
		await user().click(submit());
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
		expect(verdicts()[1]).toHaveAttribute('aria-checked', 'true');
		expect(screen.queryByTestId('doctor-correction-closed')).toBeNull();
	});

	it('(negative) 403 and 404 read the same «Δεν βρήκαμε αυτό το ραντεβού» (D-W51-06); a failed read retries', async () => {
		for (const status of [403, 404]) {
			serve({ read: null, status });
			const view = open();
			expect(await screen.findByTestId('doctor-correction-missing')).toHaveTextContent(
				'Δεν βρήκαμε αυτό το ραντεβού'
			);
			expect(document.body.textContent).not.toMatch(/Ιωάννα|ΑΜΚΑ/u);
			expect(posts()).toHaveLength(0);
			view.view.unmount();
		}
		serve({ read: null, status: 500 });
		open();
		await vi.advanceTimersByTimeAsync(1_500);
		expect(await screen.findByTestId('doctor-correction-failed')).toBeInTheDocument();
		serve({ read: systemCompleted() });
		await user().click(screen.getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		await ready();
	});

	it('(negative, U-65.6) a name with HTML is words, never markup', async () => {
		serve({
			read: systemCompleted({
				patientSnapshot: {
					id: 'p',
					tenantUserId: null,
					firstName: '<img src=x onerror=alert(1)>',
					lastName: '<b>Καρρά</b>'
				}
			})
		});
		open();
		await ready();
		expect(form().querySelector('img, b')).toBeNull();
		expect(screen.getByTestId('doctor-correction-context')).toHaveTextContent(
			'<img src=x onerror=alert(1)> <b>Καρρά</b>'
		);
	});
});
