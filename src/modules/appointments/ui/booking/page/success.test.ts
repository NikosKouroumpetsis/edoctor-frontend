import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import type { Component } from 'svelte';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import type { SessionStatus } from '$shared/state/session';
import { bookingDoctorSample } from '$modules/appointments/lib/booking/booking.sample';
import Harness from './booking.harness.svelte';

const SLUG = 'maria-triantafyllou';
const PROFILE = `/doctors/${SLUG}`;

let calls: string[];
let appointment: Record<string, unknown>;
let readiness: Record<string, unknown>;
let appointmentAnswer: () => Response;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

beforeEach(() => {
	calls = [];
	appointment = {
		id: 'a-1',
		doctorId: 'doc-1',
		officeId: 'off-a',
		officeTimeZone: 'Europe/Athens',
		status: 'pending',
		startTime: '2026-11-08T07:30:00.000Z',
		expiresAt: '2026-11-06T17:00:00.000Z',
		officePhone: '210 123 4567',
		patientNote: 'Πόνος στο γόνατο',
		relativeId: null,
		bookedForType: 'SELF',
		patientSnapshot: { firstName: 'Ελένη', lastName: 'Παππά' },
		relativeSnapshot: null,
		effectiveDurationInMinutes: 30,
		finalTotalAmount: 140,
		serviceLines: [
			{
				doctorServiceId: 'svc-simple',
				isActive: true,
				serviceTitleSnapshot: 'Απλή επίσκεψη',
				durationInMinutesSnapshot: 30
			}
		]
	};
	readiness = {
		phoneVerified: true,
		nameComplete: true,
		dateOfBirthPresent: true,
		blockers: ['PATIENT_PENDING_LIMIT_REACHED'],
		insideCancellationCutoff: false,
		firstVisitKnown: true,
		patientSmsExpected: false
	};
	appointmentAnswer = () => json(appointment);
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) => {
			calls.push(url);
			if (url.includes('/appointment/appointments/')) return appointmentAnswer();
			if (url.includes('/appointment/booking-readiness')) return json(readiness);
			if (url.includes('/patient/me'))
				return json({
					id: 'pat-1',
					firstName: 'Ελένη',
					lastName: 'Παππά',
					loginPhoneVerified: true,
					loginPhoneMasked: '+30 69•• ••• 412',
					relatives: []
				});
			return json({});
		})
	);
	page.url = new URL(
		`https://edoctor.test/doctors/${SLUG}/booking/success?appointment=a-1`
	) as typeof page.url;
	page.state = {};
});

afterEach(() => vi.unstubAllGlobals());

function draw(start: SessionStatus = 'member') {
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: {
				start,
				success: {
					slug: SLUG,
					locale: 'el',
					href: (path: string) => path,
					doctor: bookingDoctorSample,
					appointmentId: 'a-1',
					profileHref: PROFILE
				}
			}
		}
	});
}

const row = (id: string) => document.querySelector(`[data-row="${id}"]`) as HTMLElement;

describe('screen 31 · «Η κράτησή σας καταχωρήθηκε» (record §4, U-105)', () => {
	it('a request: the ✓, the title, who it waits for, «Τι ακολουθεί» with the deadline on the office’s clock, the web’s «Για αλλαγή ή ακύρωση…», and the same card read only — its state first, the note', async () => {
		draw();
		expect(
			await screen.findByRole('heading', { level: 1, name: 'Η κράτησή σας καταχωρήθηκε' })
		).toBeInTheDocument();
		expect(screen.getByTestId('booking-success-body')).toHaveTextContent(
			'Περιμένει την επιβεβαίωση από Dr. Μαρία Τριανταφύλλου.'
		);
		const next = within(screen.getByTestId('booking-success-next')).getAllByRole('listitem');
		expect(next.map((item) => item.textContent)).toEqual([
			'Μόλις απαντήσει ο γιατρός, θα σας ενημερώσουμε με email.',
			'Αν ο γιατρός επιβεβαιώσει, θα λάβετε email με το ραντεβού για το ημερολόγιό σας.',
			'Αν ο γιατρός δεν απαντήσει έως Παρασκευή 6 Νοεμβρίου, 19:00, το αίτημα λήγει αυτόματα.'
		]);
		expect(screen.getByTestId('booking-success-manage')).toHaveTextContent(
			'Για αλλαγή ή ακύρωση, ανοίξτε την εφαρμογή eDoctor ή καλέστε το ιατρείο στο 210 123 4567.'
		);
		const card = await screen.findByTestId('booking-success-card');
		const rows = [...card.querySelectorAll('[data-row]')].map((node) =>
			node.getAttribute('data-row')
		);
		expect(rows[0]).toBe('status');
		expect(row('status')).toHaveTextContent('Σε αναμονή');
		expect(row('date-time')).toHaveTextContent('Κυριακή 8 Νοεμβρίου · 09:30');
		expect(row('note')).toHaveTextContent('Πόνος στο γόνατο');
		expect(card.querySelector('[data-slot="booking-change"]')).toBeNull();
	});

	it('review w3-w3 R1 MINOR-2 (D-06): the reason, the visitor and the cost are the appointment’s own as booked — not today’s service, names or price', async () => {
		appointment = {
			...appointment,
			bookedForType: 'RELATIVE',
			relativeId: 'rel-gone',
			relativeSnapshot: { firstName: 'Πέτρος', lastName: 'Μάρκου' },
			finalTotalAmount: 95,
			serviceLines: [
				{
					doctorServiceId: 'svc-simple',
					isActive: true,
					serviceTitleSnapshot: 'Παλιό όνομα υπηρεσίας',
					durationInMinutesSnapshot: 45
				}
			]
		};
		draw();
		await screen.findByTestId('booking-success-card');
		expect(row('reason')).toHaveTextContent('Παλιό όνομα υπηρεσίας');
		expect(row('reason')).toHaveTextContent('45 λεπτά');
		expect(row('visitor')).toHaveTextContent('Πέτρος Μάρκου');
		expect(row('price')).toHaveTextContent('95');
		expect(row('price')).not.toHaveTextContent('140');
	});

	it('(negative) a frozen name made of a tag is text, never markup', async () => {
		appointment = {
			...appointment,
			patientSnapshot: { firstName: '<img src=x onerror=alert(1)>', lastName: 'Π.' }
		};
		draw();
		await screen.findByTestId('booking-success-card');
		expect(row('visitor')).toHaveTextContent('<img src=x onerror=alert(1)> Π.');
		expect(document.querySelector('[data-row="visitor"] img')).toBeNull();
	});

	it('🔴 U-103.1: the web’s one way on is «Πίσω στον γιατρό» to the doctor’s page — no «Τα ραντεβού μου»', async () => {
		draw();
		await screen.findByTestId('booking-success-card');
		for (const button of [
			screen.getByTestId('booking-success-doctor-bar'),
			screen.getByTestId('booking-success-doctor-panel')
		]) {
			expect(button).toHaveTextContent('Πίσω στον γιατρό');
			expect(button).toHaveAttribute('href', PROFILE);
			expect(button).toHaveClass('rounded-full');
			expect([...button.classList].filter((name) => name.includes('hover:'))).toEqual([]);
		}
		expect(screen.getByRole('link', { name: 'Κλείσιμο' })).toHaveAttribute('href', PROFILE);
		expect(document.body).not.toHaveTextContent('Τα ραντεβού μου');
	});

	it('🔴 U-103.3 / D-09 / P-B3-review A-3: «και SMS» only when the readiness of THIS hour and person says one leaves — asked again with the appointment’s slot', async () => {
		readiness = { ...readiness, patientSmsExpected: true };
		appointment = { ...appointment, relativeId: 'rel-1' };
		draw();
		await waitFor(() =>
			expect(screen.getByTestId('booking-success-next')).toHaveTextContent(
				'Μόλις απαντήσει ο γιατρός, θα σας ενημερώσουμε με email και SMS.'
			)
		);
		const asked = new URL(
			calls.find((url) => url.includes('/appointment/booking-readiness')) ?? '',
			'https://api.test'
		).searchParams;
		expect(Object.fromEntries(asked)).toEqual({
			doctorId: 'doc-1',
			officeId: 'off-a',
			startTime: '2026-11-08T07:30:00.000Z',
			relativeId: 'rel-1'
		});
	});

	it('an instant booking: «Το ραντεβού επιβεβαιώθηκε» and «Επιβεβαιωμένο», claimed only for its own status', async () => {
		appointment = { ...appointment, status: 'booked', expiresAt: null };
		draw();
		expect(
			await screen.findByRole('heading', { level: 1, name: 'Το ραντεβού επιβεβαιώθηκε' })
		).toBeInTheDocument();
		await waitFor(() => expect(row('status')).toHaveTextContent('Επιβεβαιωμένο'));
	});

	it('W8-Δ1: the page is white to the bottom however short — the screen’s height below 744, less the bar’s from 744', async () => {
		draw();
		await screen.findByTestId('booking-success-card');
		expect(screen.getByTestId('booking-success')).toHaveClass(
			'bg-card',
			'min-h-dvh',
			'tablet:min-h-page'
		);
	});

	it('U-81.2: below 744 «×» at the top right and the button pinned to the bottom; from 950 the words left, the card right', async () => {
		draw();
		await screen.findByTestId('booking-success-card');
		const close = screen.getByRole('link', { name: 'Κλείσιμο' });
		expect(close.parentElement).toHaveClass('justify-end', 'tablet:justify-start');
		expect(
			screen.getByTestId('booking-success-doctor-bar').closest('[data-slot="booking-bar"]')
		).toHaveClass('fixed', 'bottom-0', 'tablet:hidden');
		expect(document.querySelector('[data-slot="booking-done-card"]')).toHaveClass(
			'split:sticky',
			'split:col-start-2'
		);
		expect(screen.queryByRole('progressbar')).toBeNull();
	});

	it('(negative) a guest is asked nothing personal — 🔴 D-W3-29: the neutral title alone, never «…στα ραντεβού σας»', async () => {
		draw('guest');
		expect(
			await screen.findByRole('heading', { level: 1, name: 'Η κράτηση καταχωρήθηκε' })
		).toBeInTheDocument();
		expect(screen.queryByTestId('booking-success-body')).toBeNull();
		expect(screen.queryByTestId('booking-success-next')).toBeNull();
		expect(document.body).not.toHaveTextContent('ραντεβού σας');
		expect(screen.queryByTestId('booking-success-card')).toBeNull();
		expect(screen.getByTestId('booking-success-doctor-bar')).toHaveAttribute('href', PROFILE);
		expect(calls).toEqual([]);
	});

	it('a failed read says so and asks again', async () => {
		appointmentAnswer = () => json({}, 503);
		draw();
		const notice = await screen.findByTestId('booking-success-failed', {}, { timeout: 4000 });
		appointmentAnswer = () => json(appointment);
		await within(notice).getByRole('button').click();
		expect(
			await screen.findByRole('heading', { level: 1, name: 'Η κράτησή σας καταχωρήθηκε' })
		).toBeInTheDocument();
	});
});
