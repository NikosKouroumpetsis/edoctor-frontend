import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page as appPage } from '$app/state';
import { resetServerClock } from '$shared/lib/server-clock';
import { ToastState } from '$shared/ui/molecules/toast';
import {
	doctorAppointmentDetailRow,
	TODAY_NOW
} from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { DoctorAppointmentMemory } from '$modules/doctor-dashboard/ui/memory';
import Harness from './charges.harness.svelte';

/*
 * Wave 5.1 · screen 70 «Υπηρεσίες και κόστος» (D-W51-44, D-W51-52; card w51-w6): the page with the server stubbed at
 * `fetch`, «now» the prototype's Saturday 14 November 2026, 12:40 Athens. The prototype's four services (`sw.js:527`);
 * made-up people and prices.
 */

type Detail = ReturnType<typeof doctorAppointmentDetailRow>;

const ID = '0193d000-0000-7000-8000-0000000000a2';
const VISIT = '0193d000-0000-7000-8000-0000000000b1';
const RECHECK = '0193d000-0000-7000-8000-0000000000a3';
const ECG = '0193d000-0000-7000-8000-0000000000b3';
const ECHO = '0193d000-0000-7000-8000-0000000000b4';

const SERVICES = [
	[VISIT, 'Επίσκεψη', 30, 60],
	[RECHECK, 'Επανέλεγχος', 20, 45],
	[ECG, 'Ηλεκτροκαρδιογράφημα', 20, 30],
	[ECHO, 'Υπέρηχος καρδιάς', 30, 80]
].map(([id, title, minutes, price]) => ({
	id,
	doctorId: 'd',
	serviceId: 's',
	title,
	customDurationInMinutes: minutes,
	price,
	amount: null,
	isSpecialized: false,
	yearsOfexperience: null,
	catalogueId: null,
	translations: [],
	catalogue: null
}));

let calls: { method: string; url: URL; body: unknown }[] = [];
let answer: {
	read: Detail | null;
	status?: number;
	reread?: Detail;
	services?: unknown;
	write?: {
		status: number;
		message?: string;
		details?: unknown;
		body?: Detail;
		wait?: Promise<void>;
	};
};

const envelope = (data: unknown, status = 200, refusal: Record<string, unknown> = {}) =>
	new Response(
		status < 400
			? JSON.stringify({ status: 'success', message: '', data })
			: JSON.stringify({ errorCode: 'EC', errorMessage: 'refused', ...refusal }),
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
			if (method === 'PUT') {
				wrote = true;
				const write = answer.write ?? { status: 200 };
				if (write.wait) await write.wait;
				return envelope(write.body ?? answer.read, write.status, {
					...(write.message ? { errorMessage: write.message } : {}),
					...(write.details ? { details: write.details } : {})
				});
			}
			if (url.pathname.endsWith('/doctor-service/doctor-services')) {
				return envelope(answer.services ?? SERVICES);
			}
			if (!url.pathname.endsWith('/appointment/appointments')) {
				return envelope(wrote && answer.reread ? answer.reread : answer.read, answer.status ?? 200);
			}
			return envelope({ items: [], nextCursor: null, total: 0 });
		})
	);
}

const hrefOf = (id: string) => `/doctor/appointments/${id}?tab=upcoming`;

function open(appointmentId = ID) {
	const toasts = new ToastState();
	const memory = new DoctorAppointmentMemory();
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
	const view = render(Harness, {
		props: { toasts, client, appointmentId, links: { appointment: hrefOf(appointmentId) }, memory }
	});
	return { toasts, client, view, memory };
}

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const ready = () =>
	waitFor(() => expect(screen.getByTestId('doctor-charges-services')).toBeInTheDocument());
const rows = () => within(screen.getByTestId('doctor-charges-services')).getAllByRole('checkbox');
const row = (name: string) =>
	within(screen.getByTestId('doctor-charges-services')).getByRole('checkbox', {
		name: new RegExp(name, 'u')
	});
const price = () =>
	screen.getByRole('textbox', { name: 'Τελική τιμή σε ευρώ' }) as HTMLInputElement;
const submit = () => screen.getByTestId('doctor-charges-submit');
const puts = () => calls.filter((call) => call.method === 'PUT');
const editable = (patch: Parameters<typeof doctorAppointmentDetailRow>[0] = {}) =>
	doctorAppointmentDetailRow({ actions: { canEditCharges: true, canCancel: true }, ...patch });

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

describe('🔴 the guards of the contract (card w51-w6)', () => {
	it('🔴 U-112: υπηρεσίες σε γραμμές — every service of the doctor a row with a tick, one under the other, the current one chosen', async () => {
		serve({ read: editable() });
		open();
		await ready();
		const group = screen.getByTestId('doctor-charges-services');
		expect(group).toHaveAttribute('data-slot', 'check-rows');
		expect(group.className).toContain('flex-col');
		expect(group.className).not.toMatch(/grid-cols-(?!1\b)|flex-row/u);
		expect(rows().map((entry) => entry.textContent?.replace(/\s+/gu, ' ').trim())).toEqual([
			'Επίσκεψη 30 λεπτά · 60 €',
			'Επανέλεγχος 20 λεπτά · 45 €',
			'Ηλεκτροκαρδιογράφημα 20 λεπτά · 30 €',
			'Υπέρηχος καρδιάς 30 λεπτά · 80 €'
		]);
		expect(rows().map((entry) => entry.getAttribute('aria-checked'))).toEqual([
			'false',
			'true',
			'false',
			'false'
		]);
		expect(
			calls.some((call) => call.url.pathname.endsWith('/doctor-service/doctor-services'))
		).toBe(true);
	});

	it('🔴 D-W51-52: διάρκεια = η μεγαλύτερη, όπως ο server — «Επανέλεγχος + Ηλεκτροκαρδιογράφημα» is 20 minutes, 75 €; the price follows the new total', async () => {
		serve({ read: editable() });
		open();
		await ready();
		const totals = screen.getByTestId('doctor-charges-totals');
		expect(totals).toHaveTextContent(/Διάρκεια\s*20 λεπτά/u);
		expect(totals).toHaveTextContent(/Σύνολο υπηρεσιών\s*45 €/u);
		expect(price().value).toBe('45');
		await user().click(row('Ηλεκτροκαρδιογράφημα'));
		expect(totals).toHaveTextContent(/Διάρκεια\s*20 λεπτά/u);
		expect(totals).toHaveTextContent(/Σύνολο υπηρεσιών\s*75 €/u);
		expect(price().value).toBe('75');
		await user().click(row('Υπέρηχος'));
		expect(totals).toHaveTextContent(/Διάρκεια\s*30 λεπτά/u);
		expect(totals).toHaveTextContent(/Σύνολο υπηρεσιών\s*155 €/u);
	});
});

describe('screen 70 · «Υπηρεσίες και κόστος» (88 §70, `sw.js:528-551`)', () => {
	it('the box «Το ραντεβού», «Διαλέξτε ό,τι έγινε…», «Τελική τιμή» with its line, what follows, «Άκυρο / Αποθήκευση»', async () => {
		serve({ read: editable() });
		open();
		await ready();
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Υπηρεσίες και κόστος');
		const box = screen.getByTestId('doctor-charges-context');
		expect(box).toHaveTextContent('Το ραντεβού');
		expect(box).toHaveTextContent('Δευτέρα 16 Νοεμβρίου · 11:00');
		expect(screen.getByText('Διαλέξτε ό,τι έγινε ή θα γίνει στην επίσκεψη.')).toBeInTheDocument();
		expect(screen.getByText('Τελική τιμή')).toBeInTheDocument();
		expect(
			screen.getByText('Αν κάνετε έκπτωση ή χρεώνετε διαφορετικά, γράψτε την τελική τιμή.')
		).toBeInTheDocument();
		expect(price()).toHaveAttribute('inputmode', 'decimal');
		expect(
			within(screen.getByTestId('doctor-charges-then'))
				.getAllByRole('listitem')
				.map((item) => item.textContent)
		).toEqual([
			'Ο ασθενής βλέπει τις υπηρεσίες και την τελική τιμή στο ραντεβού του.',
			'Μετά το «Ολοκληρώθηκε» η τελική τιμή δεν αλλάζει.'
		]);
		expect(screen.getByTestId('doctor-charges-cancel')).toHaveTextContent('Άκυρο');
		expect(submit()).toHaveTextContent('Αποθήκευση');
		expect(submit()).toBeEnabled();
	});

	it('υπηρεσίες με / χωρίς τιμή: the total alone sends no price; a discount, with a comma, sends it; ONE `PUT`, the answer IS the detail, remembered, back to the 68', async () => {
		serve({ read: editable() });
		const first = open();
		await ready();
		await user().click(row('Ηλεκτροκαρδιογράφημα'));
		await user().click(submit());
		await waitFor(() => expect(puts()).toHaveLength(1));
		expect(puts()[0].url.pathname).toMatch(
			new RegExp(`/appointment/appointments/${ID}/charges$`, 'u')
		);
		expect(puts()[0].body).toEqual({
			services: [
				{ doctorServiceId: RECHECK, quantity: 1 },
				{ doctorServiceId: ECG, quantity: 1 }
			]
		});
		first.view.unmount();
		const saved = { ...editable(), finalTotalAmount: 70.5 } as unknown as Detail;
		serve({ read: editable(), write: { status: 200, body: saved } });
		const { client, memory } = open();
		await ready();
		await user().click(row('Ηλεκτροκαρδιογράφημα'));
		await fireEvent.input(price(), { target: { value: '70,5' } });
		await user().click(submit());
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(hrefOf(ID), { replaceState: true })
		);
		expect(puts()[0].body).toEqual({
			services: [
				{ doctorServiceId: RECHECK, quantity: 1 },
				{ doctorServiceId: ECG, quantity: 1 }
			],
			finalTotalAmount: 70.5
		});
		expect(client.getQueryData(doctorDashboardQueryKeys.detail(ID))).toMatchObject({
			totalAmount: 70.5
		});
		expect(memory.doneOf(ID)).toEqual({ kind: 'charges' });
	});

	it('τελευταία υπηρεσία: the last chosen row stays chosen — never nothing to save', async () => {
		serve({ read: editable() });
		open();
		await ready();
		await user().click(row('Επανέλεγχος'));
		expect(row('Επανέλεγχος')).toHaveAttribute('aria-checked', 'true');
		expect(submit()).toBeEnabled();
	});

	it('🔴 U-65.6 (negative): a third decimal, a sign or letters say so under the field, it turns red and nothing is sent', async () => {
		serve({ read: editable() });
		open();
		await ready();
		for (const value of ['70,505', '-5', 'abc']) {
			await fireEvent.input(price(), { target: { value } });
			expect(screen.getByRole('alert')).toHaveTextContent(
				'Γράψτε ένα ποσό από 0 έως 99.999.999 €, με έως δύο δεκαδικά.'
			);
			expect(price()).toHaveAttribute('aria-invalid', 'true');
			expect(submit()).toBeDisabled();
		}
		await user().click(submit());
		expect(puts()).toHaveLength(0);
		await fireEvent.input(price(), { target: { value: '70' } });
		expect(screen.queryByRole('alert')).toBeNull();
		expect(submit()).toBeEnabled();
	});

	it('«Δεν χωράει»: `409 CHARGES_DO_NOT_FIT` says the server’s facts, what is chosen stays; another choice clears it', async () => {
		serve({
			read: editable(),
			write: {
				status: 409,
				message: 'Already exist: CHARGES_DO_NOT_FIT',
				details: {
					durationMinutes: 40,
					overlapMinutes: 10,
					nextStartTime: '2026-11-16T09:30:00.000Z'
				}
			}
		});
		open();
		await ready();
		await user().click(row('Υπέρηχος'));
		await user().click(submit());
		await waitFor(() =>
			expect(screen.getByTestId('doctor-charges-clash')).toHaveTextContent(
				'Δεν χωράει: η επίσκεψη θα κρατούσε 40 λεπτά και στις 11:30 έχετε άλλο ραντεβού. Αφαιρέστε μια υπηρεσία ή αλλάξτε πρώτα την ώρα.'
			)
		);
		expect(row('Υπέρηχος')).toHaveAttribute('aria-checked', 'true');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		await user().click(row('Υπέρηχος'));
		expect(screen.queryByTestId('doctor-charges-clash')).toBeNull();
	});

	it('403 ⇒ «δεν γίνεται πια» with one way back; another `409` ⇒ the appointment read again, its words', async () => {
		serve({ read: editable(), write: { status: 403 } });
		const first = open();
		await ready();
		await user().click(submit());
		await waitFor(() =>
			expect(screen.getByTestId('doctor-charges-closed-text')).toHaveTextContent(
				'Οι υπηρεσίες αυτού του ραντεβού δεν μπορούν πια να αλλάξουν.'
			)
		);
		first.view.unmount();
		serve({ read: editable(), write: { status: 409, message: 'changed concurrently' } });
		open();
		await ready();
		await user().click(submit());
		await waitFor(() =>
			expect(screen.getByTestId('doctor-charges-failure')).toHaveTextContent(
				'Το ραντεβού άλλαξε στο μεταξύ, οπότε δεν έγινε τίποτα. Δείτε πώς είναι τώρα.'
			)
		);
	});

	it('(negative) D-W51-52: after «Ολοκληρώθηκε» (no `canEditCharges`) «δεν γίνεται πια», no services read; another doctor’s is «δεν βρέθηκε»', async () => {
		serve({
			read: doctorAppointmentDetailRow({ status: 'completed', actions: { canCancel: false } })
		});
		const first = open();
		await waitFor(() => expect(screen.getByTestId('doctor-charges-closed')).toBeInTheDocument());
		expect(
			calls.some((call) => call.url.pathname.endsWith('/doctor-service/doctor-services'))
		).toBe(false);
		first.view.unmount();
		serve({ read: null, status: 403 });
		open();
		await waitFor(() => expect(screen.getByTestId('doctor-charges-missing')).toBeInTheDocument());
	});

	it('🔴 no second press: one `PUT` while one is on its way', async () => {
		let release = () => {};
		const wait = new Promise<void>((resolve) => (release = resolve));
		serve({ read: editable(), write: { status: 200, wait } });
		open();
		await ready();
		await user().click(submit());
		await user().click(submit());
		expect(puts()).toHaveLength(1);
		release();
	});
});
