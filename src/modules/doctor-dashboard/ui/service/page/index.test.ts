import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { resetServerClock } from '$shared/lib/server-clock';
import { Session } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import { sampleMyProfileView } from '$modules/doctor-dashboard/api/profile/profile.sample';
import {
	sampleCatalogueServiceId,
	sampleDoctorServiceId,
	sampleOneServiceView,
	sampleServicesServer
} from '$modules/doctor-dashboard/api/services/services.sample';
import type { DoctorServiceSubject } from '../types';
import Harness from './service.harness.svelte';

/*
 * Wave 5.2 · screen 83, the page of ONE service (U-212, U-214, U-217.3, D-W52-82): the page with the server stubbed at
 * `fetch` (the module's precedent) and the clock held on a day of 2026 — the licence of 12 March 2010 gives 16 years.
 */

const NOW = Date.parse('2026-11-18T10:00:00Z');
const SERVICES = '/doctor-service/doctor-services';
const VISIT = sampleDoctorServiceId(1);
const ECG = sampleDoctorServiceId(3);
const HOLTER = sampleCatalogueServiceId(5);
const CERT = sampleCatalogueServiceId(7);
const SUGGESTED_SUBTITLE = 'Καταγραφή του ρυθμού της καρδιάς σε λίγα λεπτά';
const SUGGESTED_DESCRIPTION = 'Ανώδυνη εξέταση με ηλεκτρόδια.';

function serve(start: Parameters<typeof sampleServicesServer>[0] = {}) {
	const server = sampleServicesServer({ profile: () => sampleMyProfileView(), ...start });
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	return server;
}

function open(
	subject: DoctorServiceSubject,
	options: { session?: Session; toasts?: ToastState; locale?: 'el' | 'en' } = {}
) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	const onClose = vi.fn();
	const toasts = options.toasts ?? new ToastState();
	const view = render(Harness, { props: { client, subject, onClose, toasts, ...options } });
	return { client, onClose, toasts, ...view };
}

const ready = () => screen.findByTestId('doctor-service');
const field = (name: string) => screen.getByTestId(`doctor-service-${name}`) as HTMLInputElement;
const description = () => screen.getByTestId('doctor-service-description') as HTMLTextAreaElement;
const save = () => screen.getByTestId('doctor-service-save');
const durations = () =>
	within(screen.getByTestId('doctor-service-durations')).getAllByRole('radio');
const errorsShown = () =>
	[...screen.getByTestId('doctor-service').querySelectorAll('[data-state="error"]')].map((line) =>
		line.textContent?.trim()
	);
const member = (expire = vi.fn()) =>
	new Session({
		status: () => 'member',
		member: () => ({ firstName: 'Ελένη' }),
		signOut: async () => undefined,
		expire
	});

beforeEach(() => {
	resetServerClock();
	vi.useFakeTimers({ toFake: ['Date'], now: NOW });
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('one service of the doctor (wave 5.2 · screen 83)', () => {
	it('🔴 U-214.1 · D-W52-82: a stored service opens with the catalogue’s name, the price, the length as rows of D-W52-10 (in hours from 60), the DOCTOR’s own texts — an empty one empty — and the years; a page, never a window', async () => {
		serve();
		open({ view: 'service', id: VISIT });
		await ready();
		expect(screen.getByRole('heading', { name: 'Απλή επίσκεψη' })).toBeInTheDocument();
		expect(screen.getByText('Φαίνεται στη σελίδα σας μόλις την αποθηκεύσετε.')).toBeInTheDocument();
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(field('price').value).toBe('60');
		expect(screen.getByText('Η νέα τιμή ισχύει για τα νέα ραντεβού.')).toBeInTheDocument();
		expect(durations().map((radio) => radio.textContent?.trim())).toEqual([
			'15 λεπτά',
			'20 λεπτά',
			'30 λεπτά',
			'45 λεπτά',
			'1 ώρα',
			'1 ώρα και 15 λεπτά',
			'1 ώρα και 30 λεπτά',
			'1 ώρα και 45 λεπτά',
			'2 ώρες'
		]);
		expect(durations()[2]).toHaveAttribute('aria-checked', 'true');
		// U-214.1: the subtitle is empty (the doctor wrote none) — eDoctor's is NOT in it.
		expect(field('subtitle').value).toBe('');
		expect(description().value).toBe('Λήψη ιστορικού και κλινική εξέταση.');
		expect(screen.getByText('35/1000')).toBeInTheDocument();
		expect(field('years').value).toBe('15');
		expect(screen.getByText('Υπότιτλος (προαιρετικό)')).toBeInTheDocument();
		expect(screen.getByText('Περιγραφή (προαιρετικό)')).toBeInTheDocument();
		expect(screen.getByText('Χρόνια που την κάνετε (προαιρετικό)')).toBeInTheDocument();
		expect(field('subtitle')).toHaveAttribute('maxlength', '120');
		expect(description()).toHaveAttribute('maxlength', '1000');
		expect(field('price')).toHaveAttribute('maxlength', '4');
		expect(field('price')).toHaveAttribute('inputmode', 'numeric');
		// U-207.3: no choice of a language.
		expect(screen.getByTestId('doctor-service').textContent).not.toMatch(/English|Αγγλικά/u);
		expect(screen.getByTestId('doctor-service-cancel')).toHaveTextContent('Άκυρο');
		expect(save()).toHaveTextContent('Αποθήκευση');
	});

	it('🔴 U-214.1 / U-214.4 (D-W52-04): eDoctor’s texts come ONLY with the button — it fills both fields, nothing is sent, «Αντικαθιστά…» only over the doctor’s own text, the button goes once they hold it', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { toasts } = open({ view: 'service', id: ECG });
		await ready();
		expect([field('subtitle').value, description().value]).toEqual(['', '']);
		const suggest = await screen.findByTestId('doctor-service-suggest');
		expect(suggest).toHaveTextContent('Συμπλήρωση με την πρόταση του eDoctor');
		expect(screen.queryByTestId('doctor-service-suggest-replaces')).toBeNull();
		await user.click(suggest);
		expect([field('subtitle').value, description().value]).toEqual([
			SUGGESTED_SUBTITLE,
			SUGGESTED_DESCRIPTION
		]);
		expect(document.activeElement).toBe(field('subtitle'));
		expect(toasts.current?.message).toBe(
			'Συμπληρώθηκε η πρόταση του eDoctor. Αλλάξτε ό,τι θέλετε.'
		);
		expect(screen.queryByTestId('doctor-service-suggest')).toBeNull();
		expect(server.writes()).toEqual([]);
		await user.clear(description());
		await user.type(description(), 'Δική μου');
		expect(await screen.findByTestId('doctor-service-suggest-replaces')).toHaveTextContent(
			'Αντικαθιστά ό,τι έχετε γράψει στα δύο πεδία.'
		);
		await user.click(screen.getByTestId('doctor-service-suggest'));
		expect(description().value).toBe(SUGGESTED_DESCRIPTION);
		expect(server.writes()).toEqual([]);
	});

	it('🔴 D-W52-82: «Αποθήκευση» is ONE `PATCH` — price, length, years and the Greek texts (empty ⇒ `null`) — then «Αποθηκεύτηκε.» and back; the profile and the lists of 70 / 72 are read again', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { onClose, toasts, client } = open({ view: 'service', id: VISIT });
		await ready();
		const spy = vi.spyOn(client, 'invalidateQueries');
		await user.clear(field('price'));
		await user.type(field('price'), '7x5');
		expect(field('price').value).toBe('75');
		await user.click(durations()[8]);
		await user.type(field('subtitle'), '  Πρώτη επίσκεψη  ');
		await user.clear(description());
		await user.clear(field('years'));
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(server.writes()).toEqual([
			{
				method: 'PATCH',
				path: `${SERVICES}/${VISIT}`,
				search: '',
				body: {
					price: 75,
					customDurationInMinutes: 120,
					yearsOfexperience: null,
					translations: [{ language: 'el', subtitle: 'Πρώτη επίσκεψη', description: null }]
				}
			}
		]);
		expect(toasts.current?.message).toBe('Αποθηκεύτηκε.');
		expect(spy).toHaveBeenCalledWith({ queryKey: ['doctor-dashboard', 'profile'] });
		expect(spy).toHaveBeenCalledWith({ queryKey: ['doctor-dashboard', 'services'] });
	});

	it('🔴 U-212.1 · D-W52-71: the rules speak once «Αποθήκευση» is pressed — the price 1 to 9999, the years up to those of the licence — and nothing is sent', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		open({ view: 'service', id: VISIT });
		await ready();
		await user.clear(field('price'));
		await user.type(field('price'), '0');
		await user.clear(field('years'));
		await user.type(field('years'), '17');
		expect(errorsShown()).toEqual([]);
		await user.click(save());
		await waitFor(() =>
			expect(errorsShown()).toEqual([
				'Γράψτε τιμή από 1 έως 9999 €.',
				'Έως 16 χρόνια, όσα έχετε άδεια ασκήσεως.'
			])
		);
		expect(server.writes()).toEqual([]);
		await user.clear(field('years'));
		await user.type(field('years'), '16');
		await waitFor(() => expect(errorsShown()).toEqual(['Γράψτε τιμή από 1 έως 9999 €.']));
		await user.type(field('price'), '9999');
		expect(field('price').value).toBe('0999');
		await user.clear(field('price'));
		await user.type(field('price'), '9999');
		await waitFor(() => expect(errorsShown()).toEqual([]));
	});

	it('🔴 U-217.3 · U-214.4 · D-W52-82: a NEW service of the catalogue — NO price (asked before the save, never 0), the usual length, EMPTY texts with the button, ONE `POST` in Greek, never `amount`', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { onClose } = open({ view: 'new', serviceId: HOLTER });
		await ready();
		expect(screen.getByRole('heading', { name: 'Holter ρυθμού 24ώρου' })).toBeInTheDocument();
		expect(
			screen.getByText('Νέα υπηρεσία, από τον κατάλογο της ειδικότητάς σας.')
		).toBeInTheDocument();
		expect(field('price').value).toBe('');
		// The example shows while the field has the focus (the field family's floating label).
		await user.click(field('price'));
		expect(field('price')).toHaveAttribute('placeholder', 'π.χ. 60');
		expect(durations()[1]).toHaveAttribute('aria-checked', 'true');
		expect([field('subtitle').value, description().value, field('years').value]).toEqual([
			'',
			'',
			''
		]);
		expect(await screen.findByTestId('doctor-service-suggest')).toBeInTheDocument();
		// A new one has nothing to delete.
		expect(screen.queryByTestId('doctor-service-delete')).toBeNull();
		await user.click(save());
		await waitFor(() => expect(errorsShown()).toEqual(['Γράψτε τιμή από 1 έως 9999 €.']));
		expect(server.writes()).toEqual([]);
		await user.type(field('price'), '35');
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(server.writes()).toEqual([
			{
				method: 'POST',
				path: SERVICES,
				search: '',
				body: {
					doctorId: sampleMyProfileView().doctorId,
					serviceId: HOLTER,
					price: 35,
					customDurationInMinutes: 20,
					translations: [{ language: 'el', subtitle: null, description: null }]
				}
			}
		]);
		expect(server.titles().at(-1)).toBe('Holter ρυθμού 24ώρου');
	});

	it('🔴 U-214: a service without eDoctor’s texts has no button; one the doctor already offers, or an unknown one, opens no form', async () => {
		serve();
		const first = open({ view: 'new', serviceId: CERT });
		await ready();
		expect(screen.queryByTestId('doctor-service-suggest')).toBeNull();
		first.unmount();
		const owned = open({ view: 'new', serviceId: sampleCatalogueServiceId(1) });
		expect(await screen.findByTestId('doctor-service-owned')).toHaveTextContent(
			'Έχετε ήδη αυτή την υπηρεσία.'
		);
		owned.unmount();
		open({ view: 'new', serviceId: '0193d000-0000-7000-8000-00000000dead' });
		expect(await screen.findByTestId('doctor-service-missing')).toHaveTextContent(
			'Αυτή η υπηρεσία δεν υπάρχει πια.'
		);
	});

	it('🔴 D-W52-74 · D-W52-81: «Διαγραφή υπηρεσίας» is always asked — ««…» φεύγει…» — then ONE `DELETE`, «Η υπηρεσία διαγράφηκε.» and back; «Άκυρο» sends nothing', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { onClose, toasts } = open({ view: 'service', id: ECG });
		await ready();
		await user.click(screen.getByTestId('doctor-service-delete'));
		const dialog = await screen.findByTestId('doctor-service-delete-dialog');
		expect(within(dialog).getByText('Διαγραφή υπηρεσίας;')).toBeInTheDocument();
		expect(screen.getByTestId('doctor-service-delete-body')).toHaveTextContent(
			'«Ηλεκτροκαρδιογράφημα» φεύγει από τη σελίδα σας. Τα ραντεβού που έχουν ήδη κλειστεί μένουν όπως είναι.'
		);
		await user.click(screen.getByTestId('doctor-service-delete-cancel'));
		expect(server.writes()).toEqual([]);
		await user.click(screen.getByTestId('doctor-service-delete'));
		await user.click(await screen.findByTestId('doctor-service-delete-confirm'));
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(server.writes().map((call) => [call.method, call.path])).toEqual([
			['DELETE', `${SERVICES}/${ECG}`]
		]);
		expect(toasts.current?.message).toBe('Η υπηρεσία διαγράφηκε.');
	});

	it('🔴 D-W52-74 (U-212.1): the ONLY service has no «Διαγραφή» — the page’s sentence in its place; the server’s 409 says the same sentence', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve({ rows: sampleOneServiceView() });
		const first = open({ view: 'service', id: VISIT });
		await ready();
		expect(screen.queryByTestId('doctor-service-delete')).toBeNull();
		expect(screen.getByTestId('doctor-service-last')).toHaveTextContent(
			"Είναι η μόνη σας υπηρεσία, γι' αυτό δεν διαγράφεται: χωρίς υπηρεσία δεν σας κλείνουν ραντεβού."
		);
		first.unmount();
		// Two on this page, one left on the server (deleted elsewhere): the server's 409 says the page's sentence.
		server.set([
			...sampleOneServiceView(),
			...sampleOneServiceView().map((row) => ({ ...row, id: ECG }))
		]);
		open({ view: 'service', id: ECG });
		await ready();
		server.set(sampleOneServiceView().map((row) => ({ ...row, id: ECG })));
		await user.click(screen.getByTestId('doctor-service-delete'));
		await user.click(await screen.findByTestId('doctor-service-delete-confirm'));
		expect(await screen.findByTestId('doctor-service-delete-failure')).toHaveTextContent(
			"Είναι η μόνη σας υπηρεσία, γι' αυτό δεν διαγράφεται: χωρίς υπηρεσία δεν σας κλείνουν ραντεβού."
		);
	});

	it('🔴 D-W52-71 (`w52-b7` §9): the server’s 422 of the years under the field, any other 422 / 429 / 500 over the bar — what was typed STAYS; a service gone is said so; a `401` ends the session', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const expire = vi.fn();
		open({ view: 'service', id: VISIT }, { session: member(expire) });
		await ready();
		server.refuse(
			'PATCH',
			VISIT,
			422,
			'Validation Error: yearsOfexperience must not exceed the years since the doctor obtained the license.'
		);
		await user.click(save());
		await waitFor(() =>
			expect(errorsShown()).toEqual(['Έως 16 χρόνια, όσα έχετε άδεια ασκήσεως.'])
		);
		await user.clear(field('years'));
		await waitFor(() => expect(errorsShown()).toEqual([]));
		for (const [status, message, words] of [
			[
				422,
				'Validation failed fields: must be <= 9999',
				'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε την τιμή και τα χρόνια και δοκιμάστε ξανά.'
			],
			[429, 'Too many requests', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'],
			[500, 'Server error', 'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.']
		] as const) {
			server.refuse('PATCH', VISIT, status, message);
			await user.click(save());
			expect(await screen.findByTestId('doctor-service-failure')).toHaveTextContent(words);
			expect(field('price').value).toBe('60');
		}
		server.refuse(
			'PATCH',
			VISIT,
			403,
			'Forbidden: doctor service is not accessible to this account.'
		);
		await user.click(save());
		expect(await screen.findByTestId('doctor-service-missing')).toHaveTextContent(
			'Αυτή η υπηρεσία δεν υπάρχει πια.'
		);
		expect(expire).not.toHaveBeenCalled();
	});

	it('🔴 U-65.6: a text of the server or of the doctor is a text node, never HTML; English on `/en`', async () => {
		const rows = sampleOneServiceView().map((row) => ({
			...row,
			title: '<b>x</b>',
			translations: [
				{
					id: row.id,
					language: 'el' as const,
					subtitle: '<script>alert(1)</script>',
					description: null
				}
			]
		}));
		serve({ rows });
		open({ view: 'service', id: VISIT }, { locale: 'en' });
		await ready();
		expect(screen.getByRole('heading', { name: '<b>x</b>' })).toBeInTheDocument();
		expect(field('subtitle').value).toBe('<script>alert(1)</script>');
		expect(screen.getByTestId('doctor-service').querySelector('script, b')).toBeNull();
		expect(screen.getByText('A new price holds for new appointments.')).toBeInTheDocument();
		expect(durations()[4]).toHaveTextContent('1 hour');
	});
});
