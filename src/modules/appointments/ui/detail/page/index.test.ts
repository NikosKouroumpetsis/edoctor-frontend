import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { goto } from '$app/navigation';
import { resetServerClock } from '$shared/lib/server-clock';
import type {
	AppointmentActionsFacts,
	AppointmentDetailFacts
} from '$modules/appointments/api/appointment';
import {
	appointmentActionsSample,
	appointmentDetailSample
} from '$modules/appointments/api/appointment/appointment.sample';
import type { AppointmentDone } from '$modules/appointments/lib/detail';
import type {
	AppointmentDoctorFacts,
	AppointmentsLinks,
	AppointmentsViewer
} from '$modules/appointments/types';
import type { AppointmentDetailRead } from '../hooks/use-detail.svelte';
import Harness from './detail.harness.svelte';

/*
 * Screen 51 (record §7, U-135; P-W4 §4.2): every state of the prototype (a1–a3, h1–h6, cutoff, moved, lines, bydoctor)
 * from the facts the page reads, the server's «now» Tuesday 10 November 21:00 in Athens. Made-up people and offices.
 */

const NOW = new Date('2026-11-10T19:00:00.000Z');
const ID = appointmentDetailSample.id;
const INVITATION = '0193c4d5-0000-7000-8000-0000000000c1';

const maria: AppointmentDoctorFacts = {
	doctorSlug: 'dr-maria',
	name: 'Μαρία Τριανταφύλλου',
	professional: { name: 'Δερματολόγος' },
	images: [{ url: '/maria.jpg', thumbUrl: '/maria-thumb.jpg', alt: '' }],
	rating: 4.9,
	reviewCount: 22
};

const links: AppointmentsLinks = {
	list: (tab) => (tab === 'history' ? '/appointments?tab=history' : '/appointments'),
	appointment: (id) => `/appointments/${id}`,
	step: (id, step) => `/appointments/${id}/${step}`,
	rating: (id) => `/ratings/${id}`,
	doctor: (slug) => `/doctors/${slug}`,
	search: '/',
	help: '/help'
};

const appointment = (
	extra: Partial<AppointmentDetailFacts> = {},
	actions: Partial<AppointmentActionsFacts> = {}
): AppointmentDetailFacts => ({
	...appointmentDetailSample,
	...extra,
	actions: { ...appointmentActionsSample, ...actions }
});

const closed: Partial<AppointmentActionsFacts> = {
	canCancel: false,
	canReschedule: false,
	cancellationCutoffHours: null,
	cancellationDeadline: null,
	rescheduleDenial: 'STATUS',
	reschedulesLeft: null
};

const readOf = (
	value: AppointmentDetailFacts | null,
	extra: Partial<AppointmentDetailRead> = {}
): AppointmentDetailRead => ({
	appointment: value,
	missing: false,
	failed: false,
	loading: value === null,
	retry: vi.fn(),
	...extra
});

type Props = {
	viewer?: AppointmentsViewer;
	read?: AppointmentDetailRead;
	doctor?: AppointmentDoctorFacts | null;
	offline?: boolean;
	done?: AppointmentDone | null;
	justCanceled?: boolean;
	message?: { press: () => void; busy: boolean } | null;
	onSignIn?: () => void;
	onRetrySession?: () => void;
	withReview?: boolean;
};

function draw(props: Props = {}) {
	return render(Harness, {
		props: {
			locale: 'el',
			viewer: 'member',
			read: readOf(appointment()),
			doctor: maria,
			links,
			offline: false,
			done: null,
			justCanceled: false,
			message: { press: vi.fn(), busy: false },
			onSignIn: vi.fn(),
			onRetrySession: vi.fn(),
			...props
		}
	});
}

/** A blob's words, the way a browser reads a file (jsdom's `FileReader`). */
const readBlob = (blob: Blob) =>
	new Promise<string>((done, fail) => {
		const reader = new FileReader();
		reader.onload = () => done(String(reader.result));
		reader.onerror = () => fail(reader.error);
		reader.readAsText(blob);
	});

const row = (id: string) =>
	document.querySelector(`[data-slot="appointment-row"][data-row="${id}"]`) as HTMLElement;
const user = () => userEvent.setup({ delay: null });

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	resetServerClock();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('screen 51 · «Το ραντεβού» (record §7.2, U-135)', () => {
	it('a1 · the head: the status, the day and the time (two lines below 744), «Σε 2 ημέρες · Διάρκεια 30 λεπτά»', () => {
		draw();
		expect(screen.getByTestId('appointment-status')).toHaveTextContent('Επιβεβαιωμένο');
		const when = screen.getByTestId('appointment-when');
		expect(when.tagName).toBe('H2');
		expect(when).toHaveTextContent('Πέμπτη 12 Νοεμβρίου · 12:30');
		expect(when).toHaveClass('flex-col', 'tablet:block', 'text-heading-lg');
		expect(screen.getByTestId('appointment-sub')).toHaveTextContent(
			'Σε 2 ημέρες · Διάρκεια 30 λεπτά'
		);
	});

	it('🔴 Σ3 (live check w4-live-web): the head’s day wraps below 744 and never leaves the screen («Παρασκευή 20 Νοεμβρίου» at 375); whole from 744, the time never breaks', () => {
		draw();
		const [day, dot, time] = [...screen.getByTestId('appointment-when').children];
		expect(day).toHaveTextContent('Πέμπτη 12 Νοεμβρίου');
		expect(day).toHaveClass('tablet:whitespace-nowrap');
		expect(day).not.toHaveClass('whitespace-nowrap');
		expect(dot).toHaveClass('hidden', 'tablet:inline');
		expect(time).toHaveTextContent('12:30');
		expect(time).toHaveClass('whitespace-nowrap');
	});

	// Rewrites the first D-W4-66 guard of the two buttons (its own 12 a side below 744, a glyph hidden by CSS): the second
	// live check (w4-live-web-2 Δ) measured them one under the other at 402 — the hidden glyph still kept 12 beside each
	// label (off the middle by 6), and the application's buttons carry the shared `Button`'s own 20 a side and no glyph.
	it('🔴 D-W4-66 · U-81.2 · U-147.3 (live check w4-live-web-2 Δ): below 744 «Μήνυμα στον γιατρό» / «Κλήση ιατρείου» are the application’s — the shared button’s own size, one line each, no glyph and no room kept for one, side by side while both fit, else one under the other across the card; «‹» alone on its line, the status under it', () => {
		draw();
		const message = screen.getByTestId('appointment-message');
		const call = screen.getByTestId('appointment-call');
		expect(message.parentElement).toBe(call.parentElement);
		expect(message.parentElement).toHaveClass('flex', 'flex-row', 'flex-wrap', 'gap-2');
		for (const button of [message, call]) {
			expect(button).toHaveClass('flex-auto', 'whitespace-nowrap', 'tablet:flex-none');
			// The shared `Button`'s own box at every width — never a size of this page's (U-147.3).
			expect(button).toHaveClass('px-5', 'py-3', 'min-h-control-md');
			expect(button).not.toHaveClass('flex-1', 'px-3');
			// No glyph below 744, and nothing standing in its place: the label is the button's one child, in the middle.
			expect(button.querySelector('[data-icon]')).toBeNull();
			expect(button.querySelector('[aria-hidden="true"]')).toBeNull();
			expect(button.children).toHaveLength(1);
		}
		expect(message).toHaveTextContent('Μήνυμα στον γιατρό');
		expect(call).toHaveTextContent('Κλήση ιατρείου');
		const back = screen.getByTestId('appointment-back');
		expect(back).toHaveClass('flex');
		expect(back).not.toHaveClass('inline-flex');
		expect(back.nextElementSibling).toBe(screen.getByTestId('appointment-status'));
	});

	it('D-W4-66 (from 744): the two buttons take their own width in one row, each with its glyph before the label', () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
		);
		draw();
		const message = screen.getByTestId('appointment-message');
		const call = screen.getByTestId('appointment-call');
		expect(message).toHaveClass('tablet:flex-none', 'px-5');
		expect(message.querySelector('[data-icon="chatbubble-outline"]')).toHaveClass('icon-md');
		expect(call.querySelector('[data-icon="call-outline"]')).toHaveClass('icon-md');
	});

	it('🔴 D-W4-66 (history): «Κλείστε ξανά ραντεβού» the same — one line, the shared button’s own size, growing across the card below 744', () => {
		draw({
			read: readOf(
				appointment({ status: 'completed', startTime: '2026-10-22T07:00:00.000Z' }, closed)
			)
		});
		const again = screen.getByTestId('appointment-book-again');
		expect(again).toHaveClass('flex-auto', 'whitespace-nowrap', 'tablet:flex-none', 'px-5');
		expect(again).not.toHaveClass('px-3');
	});

	it('🔴 D-W4-68: the doctor’s photo of the 51 that does not load gives way to the shared silhouette — never a broken image', async () => {
		draw();
		const doctor = screen.getByTestId('appointment-doctor');
		const photo = doctor.querySelector('[data-slot="avatar"]') as HTMLElement;
		expect(photo).toHaveClass('size-row-lg', 'rounded-sm');
		await fireEvent.error(photo.querySelector('img') as HTMLImageElement);
		expect(doctor.querySelector('img')).toBeNull();
		expect(photo.querySelector('[data-slot="media-placeholder"]')).toBeInTheDocument();
	});

	it('a1 · U-135.2: the card of screen 30 — the doctor (the block opens the profile), «Μήνυμα στον γιατρό» / «Κλήση ιατρείου», a «Αλλαγή» on the hour, the visitor and the note, each a page of its own', () => {
		draw();
		const doctor = screen.getByTestId('appointment-doctor');
		expect(doctor).toHaveAttribute('href', '/doctors/dr-maria');
		expect(doctor).toHaveTextContent('Δερματολόγος');
		expect(doctor).toHaveTextContent('Dr. Μαρία Τριανταφύλλου');
		expect(doctor).toHaveTextContent('4,9');
		expect(screen.getByTestId('appointment-message')).toHaveTextContent('Μήνυμα στον γιατρό');
		expect(screen.getByTestId('appointment-call')).toHaveAttribute('href', 'tel:+302103210101');
		const changes = [...document.querySelectorAll('[data-slot="booking-change"]')];
		expect(
			changes.map((link) => [link.getAttribute('data-step'), link.getAttribute('href')])
		).toEqual([
			['time', `/appointments/${ID}/time`],
			['for-whom', `/appointments/${ID}/for-whom`],
			['note', `/appointments/${ID}/note`]
		]);
		expect(changes[0]).toHaveAccessibleName('Αλλαγή: Ημέρα και ώρα');
		expect(within(row('date-time')).getByText('Πέμπτη 12 Νοεμβρίου · 12:30')).toBeInTheDocument();
		expect(within(row('visitor')).getByText('Για μένα · Ελένη Παππά')).toBeInTheDocument();
		expect(
			within(row('note')).getByText('Έχω μαζί μου τις εξετάσεις του Σεπτεμβρίου.')
		).toBeInTheDocument();
		expect(within(row('reason')).getByText('Απλή επίσκεψη · 30 λεπτά')).toBeInTheDocument();
		expect(within(row('price')).getByText('140 €')).toHaveClass('text-body-lg', 'font-semibold');
	});

	it('🔴 D-W4-34: «Ιατρείο» writes the floor as the approved 51 («2ος όροφος»), its phone a link that calls', () => {
		draw();
		const office = row('office');
		expect(within(office).getByText('Ερμού 101, Αθήνα, Αττική')).toBeInTheDocument();
		expect(within(office).getByText('2ος όροφος')).toBeInTheDocument();
		expect(within(office).getByTestId('appointment-phone')).toHaveAttribute(
			'href',
			'tel:+302103210101'
		);
		expect(within(office).getByTestId('appointment-phone')).toHaveClass('min-h-touch');
	});

	it('U-135.6 · P-B4 §13.3.1: «Όροι του γιατρού» only while it can be canceled, with its very instant on the office’s clock; «έως την ώρα του ραντεβού» when the deadline IS the start', () => {
		const view = draw();
		const terms = screen.getByTestId('appointment-terms');
		expect(terms).toHaveTextContent('Όροι του γιατρού');
		expect(terms).toHaveTextContent('Άμεση επιβεβαίωση');
		expect(terms).toHaveTextContent('Ακύρωση έως 24 ώρες πριν');
		expect(terms).toHaveTextContent('Δηλαδή έως Τετάρτη 11 Νοεμβρίου, 12:30.');
		view.unmount();
		const until = draw({
			read: readOf(
				appointment(
					{ startTime: '2026-11-11T08:00:00.000Z', endTime: '2026-11-11T08:30:00.000Z' },
					{ cancellationDeadline: '2026-11-11T08:00:00.000Z', isPastCancellationCutoff: true }
				)
			)
		});
		expect(screen.getByTestId('appointment-terms')).toHaveTextContent(
			'Ακύρωση έως την ώρα του ραντεβού'
		);
		until.unmount();
		draw({ read: readOf(appointment({}, { canCancel: false, isPastCancellationCutoff: true })) });
		expect(screen.queryByTestId('appointment-terms')).toBeNull();
	});

	it('cutoff (U-76.1): past the deadline, the warm notice with «Κλήση ιατρείου · …»; no «Αλλαγή» on the hour and no cancel link', () => {
		draw({
			read: readOf(
				appointment(
					{},
					{
						canCancel: false,
						canReschedule: false,
						isPastCancellationCutoff: true,
						cancellationDeadline: null,
						rescheduleDenial: 'AFTER_CUTOFF'
					}
				)
			)
		});
		const notice = screen.getByTestId('appointment-notice-deadline-passed');
		expect(notice).toHaveAttribute('data-tone', 'warm');
		expect(notice).toHaveTextContent('Η προθεσμία ακύρωσης έληξε· επικοινωνήστε με το ιατρείο.');
		expect(within(notice).getByTestId('appointment-notice-call')).toHaveAttribute(
			'href',
			'tel:+302103210101'
		);
		expect(row('date-time').querySelector('[data-slot="booking-change"]')).toBeNull();
		expect(screen.queryByTestId('appointment-cancel')).toBeNull();
	});

	it('P-B4 §13.3.3: the moves spent ⇒ «Έχετε αλλάξει την ώρα όσες φορές επιτρέπεται…» under the hour, no «Αλλαγή» on it', () => {
		draw({
			read: readOf(
				appointment(
					{},
					{ canReschedule: false, rescheduleDenial: 'LIMIT_REACHED', reschedulesLeft: 0 }
				)
			)
		});
		expect(row('date-time')).toHaveTextContent(
			'Έχετε αλλάξει την ώρα όσες φορές επιτρέπεται. Για άλλη αλλαγή, καλέστε το ιατρείο.'
		);
		expect(row('date-time').querySelector('[data-slot="booking-change"]')).toBeNull();
		expect(row('visitor').querySelector('[data-slot="booking-change"]')).not.toBeNull();
	});

	it('a2 · U-137.4: a request reads «Ακύρωση αιτήματος» and when it expires; «Ακύρωση ραντεβού» for a kept one', () => {
		const view = draw();
		expect(screen.getByTestId('appointment-cancel')).toHaveTextContent('Ακύρωση ραντεβού');
		expect(screen.getByTestId('appointment-cancel')).toHaveAttribute(
			'href',
			`/appointments/${ID}/cancel`
		);
		view.unmount();
		draw({
			read: readOf(
				appointment({
					status: 'pending',
					confirmationMode: 'MANUAL',
					expiresAt: '2026-11-13T17:00:00.000Z'
				})
			)
		});
		expect(screen.getByTestId('appointment-cancel')).toHaveTextContent('Ακύρωση αιτήματος');
		expect(screen.getByTestId('appointment-notice-expires')).toHaveTextContent(
			'Το αίτημα λήγει στις Παρ 13 Νοε · 19:00 αν δεν απαντήσει ο γιατρός.'
		);
		expect(screen.getByTestId('appointment-status')).toHaveAttribute('data-tone', 'warning');
	});

	it('moved (D-42): the doctor changed the hour ⇒ «Ο γιατρός άλλαξε την ώρα. Το ραντεβού ήταν Πέμ 12 Νοε · 11:00.»', () => {
		draw({
			read: readOf(
				appointment({
					auditTrail: [
						{
							action: 'UPDATED',
							actorKind: 'DOCTOR',
							at: '2026-11-05T10:00:00.000Z',
							previousStartTime: '2026-11-12T09:00:00.000Z',
							nextStartTime: '2026-11-12T10:30:00.000Z'
						}
					]
				})
			)
		});
		expect(screen.getByTestId('appointment-notice-moved')).toHaveTextContent(
			'Ο γιατρός άλλαξε την ώρα. Το ραντεβού ήταν Πέμ 12 Νοε · 11:00.'
		);
	});

	it('lines (D-71): two services ⇒ one line each and «Σύνολο»', () => {
		draw({
			read: readOf(
				appointment({
					durationInMinutes: 45,
					snapshot: { ...appointmentDetailSample.snapshot, totalAmount: 180 },
					serviceLines: [
						...appointmentDetailSample.serviceLines,
						{
							doctorServiceId: 'svc-derm',
							title: 'Δερματοσκόπηση',
							durationInMinutes: 15,
							amount: 40,
							isActive: true
						}
					]
				})
			)
		});
		const price = row('price');
		expect(price).toHaveTextContent('Απλή επίσκεψη140 €');
		expect(price).toHaveTextContent('Δερματοσκόπηση40 €');
		expect(price).toHaveTextContent('Σύνολο180 €');
	});

	it('U-135.3 · U-135.4 · 🔴 U-132.1: «Προσθήκη στο ημερολόγιο», «Οδηγίες προς το ιατρείο» (the maps’ app, a new tab), «Κέντρο βοήθειας» — and no map anywhere', () => {
		draw();
		expect(screen.getByTestId('appointment-calendar')).toHaveTextContent('Προσθήκη στο ημερολόγιο');
		const directions = screen.getByTestId('appointment-directions');
		expect(directions).toHaveTextContent('Οδηγίες προς το ιατρείο');
		expect(directions).toHaveTextContent('Ανοίγει την εφαρμογή χαρτών της συσκευής σας');
		expect(directions).toHaveAttribute('target', '_blank');
		expect(directions).toHaveAttribute('rel', 'noopener noreferrer');
		expect(new URL(directions.getAttribute('href') as string).searchParams.get('destination')).toBe(
			'Ερμού 101, Αθήνα, Αττική'
		);
		expect(screen.getByTestId('appointment-help')).toHaveAttribute('href', '/help');
		const page = screen.getByTestId('appointment-page');
		expect(page.querySelector('canvas, iframe, [data-slot*="map"], .maplibregl-map')).toBeNull();
	});

	it('🔴 U-135.2: nothing is fixed or sticky at the bottom of the 51', () => {
		draw();
		expect(screen.getByTestId('appointment-page').innerHTML).not.toMatch(/\b(fixed|sticky)\b/u);
	});

	it('🔴 D-W4-31: «Προσθήκη στο ημερολόγιο» hands the browser the `.ics` (the email’s UID, the doctor, the office, never the note); only for a kept, upcoming visit once its doctor is known', async () => {
		const created: Blob[] = [];
		const objectUrls = URL as unknown as {
			createObjectURL?: (blob: Blob) => string;
			revokeObjectURL?: (url: string) => void;
		};
		const kept = { create: objectUrls.createObjectURL, revoke: objectUrls.revokeObjectURL };
		objectUrls.createObjectURL = (blob: Blob) => {
			created.push(blob);
			return 'blob:calendar';
		};
		const revoked = vi.fn();
		objectUrls.revokeObjectURL = revoked;
		onTestFinished(() => {
			objectUrls.createObjectURL = kept.create;
			objectUrls.revokeObjectURL = kept.revoke;
		});
		const names: string[] = [];
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
			this: HTMLAnchorElement
		) {
			names.push(this.download);
		});
		const view = draw();
		await user().click(screen.getByTestId('appointment-calendar'));
		expect(names).toEqual(['edoctor-appointment-2026-11-12.ics']);
		expect(revoked).toHaveBeenCalledWith('blob:calendar');
		expect(created[0].type).toBe('text/calendar;charset=utf-8');
		const text = (await readBlob(created[0])).replace(/\r\n /gu, '');
		expect(text).toContain(`UID:${ID}\r\n`);
		expect(text).toContain('SUMMARY:Ραντεβού: Μαρία Τριανταφύλλου\r\n');
		expect(text).not.toContain('εξετάσεις');
		view.unmount();

		const pending = draw({ read: readOf(appointment({ status: 'pending' })) });
		expect(screen.queryByTestId('appointment-calendar')).toBeNull();
		pending.unmount();
		const unknownDoctor = draw({ doctor: null });
		expect(screen.queryByTestId('appointment-calendar')).toBeNull();
		unknownDoctor.unmount();
		draw({
			read: readOf(
				appointment({ status: 'completed', startTime: '2026-10-22T07:00:00.000Z' }, closed)
			)
		});
		expect(screen.queryByTestId('appointment-calendar')).toBeNull();
		expect(screen.queryByTestId('appointment-directions')).toBeNull();
	});

	it('h1 · U-135.5: after the visit «Πώς ήταν η επίσκεψη;» with «Γράψτε κριτική για την επίσκεψη» while an invitation is open; «Μήνυμα στον γιατρό» beside «Κλείστε ξανά ραντεβού» (prototype `appt.js:268`, review w4-w4 R1 MAJOR-2), never «Κλήση ιατρείου»; only the length under the day', () => {
		draw({
			read: readOf(
				appointment(
					{
						status: 'completed',
						startTime: '2026-10-22T07:00:00.000Z',
						endTime: '2026-10-22T07:30:00.000Z',
						ratingInvitation: { invitationId: INVITATION, expiresAt: '2026-12-21T08:00:00.000Z' }
					},
					closed
				)
			)
		});
		const ask = screen.getByTestId('appointment-ask');
		expect(ask).toHaveTextContent('Πώς ήταν η επίσκεψη;');
		expect(ask).toHaveTextContent('Η γνώμη σας βοηθά άλλους ασθενείς να διαλέξουν γιατρό.');
		expect(within(ask).getByTestId('appointment-rate')).toHaveAttribute(
			'href',
			`/ratings/${INVITATION}`
		);
		expect(screen.getByTestId('appointment-book-again')).toHaveAttribute(
			'href',
			'/doctors/dr-maria'
		);
		const message = screen.getByTestId('appointment-message');
		expect(message).toHaveTextContent('Μήνυμα στον γιατρό');
		expect(
			message.compareDocumentPosition(screen.getByTestId('appointment-book-again')) &
				Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		expect(screen.queryByTestId('appointment-call')).toBeNull();
		expect(screen.getByTestId('appointment-sub')).toHaveTextContent(/^Διάρκεια 30 λεπτά$/u);
		expect(screen.queryByTestId('appointment-cancel')).toBeNull();
		expect(document.querySelector('[data-slot="booking-change"]')).toBeNull();
	});

	// Rewrites the row's half of the first U-154 guard (`tablet:` alone, the row from 744 whatever the band's width): U-156
	// (card w4-w14, bug #10) makes it `tablet:row-wide:` — at 950 the band sits in the narrow right column (434 wide, its
	// sentence in three lines). What U-154 decided (under 744 the button over the whole width) is asserted unchanged.
	it('h1b · U-154: under 744 «Γράψτε κριτική για την επίσκεψη» takes the band’s whole width (stretched by the column, never `self-start`), its label centred; in the row (U-156: from 744 and a band as wide as `row-wide`) the button at its own width in the middle, as before', () => {
		draw({
			read: readOf(
				appointment(
					{
						status: 'completed',
						startTime: '2026-10-22T07:00:00.000Z',
						endTime: '2026-10-22T07:30:00.000Z',
						ratingInvitation: { invitationId: INVITATION, expiresAt: '2026-12-21T08:00:00.000Z' }
					},
					closed
				)
			)
		});
		const ask = screen.getByTestId('appointment-ask');
		expect(ask).toHaveClass('flex', 'flex-col', 'gap-3.5');
		expect(ask).toHaveClass(
			'tablet:row-wide:flex-row',
			'tablet:row-wide:items-center',
			'tablet:row-wide:justify-between'
		);
		for (const own of ['items-start', 'items-center', 'items-end']) {
			expect(ask).not.toHaveClass(own);
		}
		const rate = within(ask).getByTestId('appointment-rate');
		expect(rate.tagName).toBe('A');
		expect(rate).toHaveClass('self-stretch', 'justify-center');
		for (const narrow of ['self-start', 'self-center', 'self-end', 'w-fit', 'w-auto', 'w-full']) {
			expect(rate).not.toHaveClass(narrow);
		}
		expect(rate).toHaveClass('tablet:row-wide:shrink-0', 'tablet:row-wide:self-center');
		expect(rate).toHaveClass('px-5', 'py-3', 'min-h-control-md');
		const label = within(rate).getByText('Γράψτε κριτική για την επίσκεψη');
		expect(label).toHaveClass('text-center', 'text-body-sm');
		expect(rate.childElementCount).toBe(1);
	});

	it('h1c · U-156: the band is a row only when the screen is from 744 AND the band itself is as wide as `row-wide` (the box around it is the container); (negative) nothing of the row hangs on the screen alone, nor on the box alone', () => {
		draw({
			read: readOf(
				appointment(
					{
						status: 'completed',
						startTime: '2026-10-22T07:00:00.000Z',
						endTime: '2026-10-22T07:30:00.000Z',
						ratingInvitation: { invitationId: INVITATION, expiresAt: '2026-12-21T08:00:00.000Z' }
					},
					closed
				)
			)
		});
		const ask = screen.getByTestId('appointment-ask');
		const box = ask.parentElement as HTMLElement;
		expect(box).toHaveClass('@container', 'mb-4');
		expect(box.childElementCount).toBe(1);
		expect(ask).not.toHaveClass('@container');
		expect(ask).not.toHaveClass('mb-4');
		const rate = within(ask).getByTestId('appointment-rate');
		const row = ['flex-row', 'items-center', 'justify-between', 'shrink-0', 'self-center'];
		const zoneOrBox = /^(tablet|split|laptop|desktop|wide|row-wide|@\w+):/u;
		for (const element of [ask, rate]) {
			const sized = [...element.classList].filter((name) => zoneOrBox.test(name));
			expect(sized.filter((name) => !name.startsWith('tablet:row-wide:'))).toEqual([]);
			for (const name of row) {
				expect(element).not.toHaveClass(`tablet:${name}`);
				expect(element).not.toHaveClass(`row-wide:${name}`);
			}
		}
		expect([...ask.classList].filter((name) => name.includes(':')).sort()).toEqual([
			'tablet:row-wide:flex-row',
			'tablet:row-wide:items-center',
			'tablet:row-wide:justify-between'
		]);
	});

	it('h3 · U-138.5 (card w4-w7): without an invitation the place of «Η κριτική σας» is the screen’s to fill; nothing is drawn of its own', () => {
		const completed = appointment(
			{ status: 'completed', startTime: '2026-07-03T08:30:00.000Z' },
			closed
		);
		const bare = draw({ read: readOf(completed) });
		expect(screen.queryByTestId('appointment-ask')).toBeNull();
		expect(screen.queryByTestId('review-slot')).toBeNull();
		bare.unmount();
		draw({ read: readOf(completed), withReview: true });
		expect(screen.getByTestId('review-slot')).toBeInTheDocument();
	});

	it('h2 · bydoctor · 🔴 U-137.5 · D-W4-15: how it ended in lines of their own — who and when, the reason, the words; never «εκπρόθεσμα»', () => {
		const canceled = (by: 'PATIENT' | 'DOCTOR' | 'SYSTEM') =>
			appointment(
				{
					status: 'canceled',
					startTime: '2026-09-14T15:00:00.000Z',
					canceledAt: '2026-09-10T18:14:00.000Z',
					canceledBy: by,
					cancelReasonCode: 'SCHEDULE_CONFLICT',
					cancelReasonText: 'Δεν προλαβαίνω.'
				},
				closed
			);
		const mine = draw({ read: readOf(canceled('PATIENT')) });
		const notice = screen.getByTestId('appointment-notice-canceled');
		expect(notice).toHaveAttribute('data-tone', 'neutral');
		expect([...notice.querySelectorAll('p')].map((line) => line.textContent)).toEqual([
			'Το ραντεβού ακυρώθηκε.',
			'Από εσάς · Πέμ 10 Σεπ · 21:14',
			'Λόγος: Δεν με βολεύει η ώρα',
			'Το μήνυμά σας: «Δεν προλαβαίνω.»'
		]);
		expect(screen.getByTestId('appointment-page')).not.toHaveTextContent(/εκπρόθεσμ/iu);
		mine.unmount();
		const doctor = draw({ read: readOf(canceled('DOCTOR')) });
		expect(screen.getByTestId('appointment-notice-canceled')).toHaveTextContent(
			'Από τον γιατρό · Πέμ 10 Σεπ · 21:14'
		);
		expect(screen.getByTestId('appointment-notice-canceled')).toHaveTextContent(
			'Μήνυμα του γιατρού: «Δεν προλαβαίνω.»'
		);
		doctor.unmount();
		draw({ read: readOf(canceled('SYSTEM')) });
		expect(screen.getByTestId('appointment-notice-canceled')).not.toHaveTextContent(/^Από/mu);
		expect(screen.getByTestId('appointment-notice-canceled')).not.toHaveTextContent('Από');
	});

	it('U-137.6 · D-W4-11: right after my own cancellation «Σας στείλαμε email επιβεβαίωσης.» — only when the appointment has an email', () => {
		const canceled = appointment(
			{
				status: 'canceled',
				canceledAt: '2026-11-10T18:55:00.000Z',
				canceledBy: 'PATIENT',
				cancelReasonCode: 'PERSONAL'
			},
			closed
		);
		const withEmail = draw({ read: readOf(canceled), justCanceled: true });
		expect(screen.getByTestId('appointment-notice-canceled')).toHaveTextContent(
			'Σας στείλαμε email επιβεβαίωσης.'
		);
		withEmail.unmount();
		draw({ read: readOf({ ...canceled, patientHasEmail: false }), justCanceled: true });
		expect(screen.getByTestId('appointment-notice-canceled')).not.toHaveTextContent('email');
	});

	it('h4–h6: «έληξε», «απορρίφθηκε» with the doctor’s words, «δεν προσήλθατε» — neutral', () => {
		for (const [status, id, words] of [
			['expired', 'expired', 'Το αίτημα έληξε, επειδή ο γιατρός δεν απάντησε εγκαίρως.'],
			['rejected', 'rejected', 'Ο γιατρός απέρριψε το αίτημα.'],
			['no_show', 'no-show', 'Ο γιατρός δήλωσε ότι δεν προσήλθατε στο ραντεβού.']
		] as const) {
			const view = draw({
				read: readOf(
					appointment(
						{
							status,
							startTime: '2026-05-18T06:30:00.000Z',
							rejectReasonText: 'Δεν εξετάζω παιδιά.'
						},
						closed
					)
				)
			});
			const notice = screen.getByTestId(`appointment-notice-${id}`);
			expect(notice).toHaveAttribute('data-tone', 'neutral');
			expect(notice).toHaveTextContent(words);
			if (status === 'rejected')
				expect(notice).toHaveTextContent('Μήνυμα του γιατρού: «Δεν εξετάζω παιδιά.»');
			view.unmount();
		}
	});

	it('U-136.6 · D-W4-33: back from a save, the green notice that stays — «Η ώρα άλλαξε.», «Ήταν …» and, only with an email, «Σας στείλαμε email με τη νέα ώρα.»', () => {
		const done: AppointmentDone = { kind: 'time', was: '2026-11-12T09:00:00.000Z' };
		const view = draw({ done });
		const notice = screen.getByTestId('appointment-done');
		expect(notice).toHaveAttribute('role', 'status');
		expect(notice).toHaveAttribute('data-tone', 'done');
		expect(notice).toHaveClass('border-success/40', 'bg-success/10');
		expect([...notice.querySelectorAll('p')].map((line) => line.textContent)).toEqual([
			'Η ώρα άλλαξε.',
			'Ήταν Πέμπτη 12 Νοεμβρίου · 11:00.',
			'Σας στείλαμε email με τη νέα ώρα.'
		]);
		view.unmount();
		draw({ done, read: readOf(appointment({ patientHasEmail: false })) });
		expect(screen.getByTestId('appointment-done')).not.toHaveTextContent('email');
	});

	it('U-102 · D-W3-31: a «Αλλαγή», the cancel and the rating open their page as one more step of the history; a new tab keeps the link’s own way', async () => {
		draw();
		const time = document.querySelector('[data-step="time"]') as HTMLElement;
		await user().click(time);
		expect(goto).toHaveBeenCalledWith(`/appointments/${ID}/time`, {
			state: { appointment: { depth: 1 } }
		});
		vi.mocked(goto).mockClear();
		await user().click(screen.getByTestId('appointment-cancel'));
		expect(goto).toHaveBeenCalledWith(`/appointments/${ID}/cancel`, {
			state: { appointment: { depth: 1 } }
		});
		vi.mocked(goto).mockClear();
		const modified = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
		time.dispatchEvent(modified);
		expect(goto).not.toHaveBeenCalled();
	});

	it('the doctor while read: a quiet wait in the card, never an id; a doctor nobody may see: no block, no «Μήνυμα»', () => {
		const reading = draw({ doctor: undefined, message: null });
		expect(screen.queryByTestId('appointment-doctor')).toBeNull();
		expect(screen.getByTestId('appointment-facts')).not.toHaveTextContent('doc-maria');
		expect(screen.queryByTestId('appointment-message')).toBeNull();
		reading.unmount();
		draw({ doctor: null, message: null });
		expect(screen.queryByTestId('appointment-doctor')).toBeNull();
		expect(screen.getByTestId('appointment-call')).toBeInTheDocument();
	});

	it('its own states: the wait, a guest’s «Σύνδεση», «Δεν βρήκαμε αυτό το ραντεβού» (404 and 403 alike) with the way to the list, a failure with «Δοκιμάστε ξανά»', async () => {
		const waiting = draw({ viewer: 'waiting', read: readOf(null) });
		expect(screen.getByTestId('appointment-loading')).toHaveAttribute('aria-busy', 'true');
		// NIT-2 of the review w4-w4 R1: the card's box as tall as the prototype's (`.a-dsk .box` 320, `.box.s` 96).
		const boxes = [...screen.getByTestId('appointment-loading').children].slice(-2);
		expect(boxes[0]).toHaveClass('h-pane-skeleton');
		expect(boxes[1]).toHaveClass('h-placeholder-lg');
		waiting.unmount();

		const onSignIn = vi.fn();
		const guest = draw({ viewer: 'guest', read: readOf(null, { loading: false }), onSignIn });
		expect(screen.getByTestId('appointment-guest')).toHaveTextContent(
			'Συνδεθείτε για να δείτε το ραντεβού'
		);
		await user().click(screen.getByRole('button', { name: 'Σύνδεση' }));
		expect(onSignIn).toHaveBeenCalledOnce();
		guest.unmount();

		const missing = draw({ read: readOf(null, { loading: false, missing: true }) });
		const notFound = screen.getByTestId('appointment-missing');
		expect(notFound).toHaveTextContent('Δεν βρήκαμε αυτό το ραντεβού');
		expect(notFound).toHaveTextContent('Ίσως ακυρώθηκε ή δεν ανήκει σε αυτόν τον λογαριασμό.');
		expect(within(notFound).getByRole('link', { name: 'Τα ραντεβού μου' })).toHaveAttribute(
			'href',
			'/appointments'
		);
		missing.unmount();

		const read = readOf(null, { loading: false, failed: true });
		const failed = draw({ read });
		await user().click(
			within(screen.getByTestId('appointment-failed')).getByRole('button', {
				name: 'Δοκιμάστε ξανά'
			})
		);
		expect(read.retry).toHaveBeenCalledOnce();
		failed.unmount();

		const onRetrySession = vi.fn();
		draw({ viewer: 'failed', read: readOf(null), onRetrySession });
		await user().click(screen.getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		expect(onRetrySession).toHaveBeenCalledOnce();
	});

	it('«‹» below 950 goes to the list of the appointment’s own tab; from 950 it is hidden (the list stands beside it)', () => {
		const view = draw();
		const back = screen.getByTestId('appointment-back');
		expect(back).toHaveAttribute('href', '/appointments');
		expect(back).toHaveAccessibleName('Πίσω');
		expect(back).toHaveClass('split:hidden');
		view.unmount();
		draw({
			read: readOf(
				appointment({ status: 'completed', startTime: '2026-10-22T07:00:00.000Z' }, closed)
			)
		});
		expect(screen.getByTestId('appointment-back')).toHaveAttribute(
			'href',
			'/appointments?tab=history'
		);
	});

	// Card w45-w9 (D-W45-56): rewrites the 4.0's place of the right column — `split:mx-0` and the 80 on the left from 1440.
	it('🔴 U-167: from 950 the appointment sits in the MIDDLE of the right column — centred at every width, at most 720, the same inset on both sides; (negative) never against the list, never an inset of one side alone', () => {
		draw();
		const page = screen.getByTestId('appointment-page');
		expect(page).toHaveClass(
			'mx-auto',
			'w-full',
			'split:max-w-document-wide',
			'split:px-pane-inset',
			'laptop:px-pane-inset-lg'
		);
		const classes = page.className.split(/\s+/u);
		expect(classes.filter((name) => /(?:^|:)m[xlr]-0$/u.test(name))).toEqual([]);
		expect(classes.filter((name) => /(?:^|:)p[lr]-/u.test(name))).toEqual([]);
	});

	it('🔴 U-65.6: what a person or the server wrote stays words — a note with markup is drawn as text', () => {
		draw({ read: readOf(appointment({ patientNote: '<img src=x onerror=alert(1)>' })) });
		expect(within(row('note')).getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
		expect(row('note').querySelector('img')).toBeNull();
	});
});
