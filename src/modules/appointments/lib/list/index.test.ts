import { describe, expect, it } from 'vitest';
import { appointmentFactsSample } from '$modules/appointments/api/appointment/appointment.sample';
import type { AppointmentFacts } from '$modules/appointments/api/appointment';
import type { AppointmentDoctorFacts } from '$modules/appointments/types';
import {
	appointmentDoctorHead,
	buildAppointmentCard,
	buildAppointmentListEntries,
	buildAppointmentsListCopy,
	readAppointmentDoctorIds,
	joinAppointmentDoctorIds
} from '.';

/** The prototypes' «today»: Tuesday 10 November 2026, 12:00 Athens. */
const NOW = Date.parse('2026-11-10T10:00:00.000Z');

const maria: AppointmentDoctorFacts = {
	doctorSlug: 'dr-maria',
	name: 'Μαρία Τριανταφύλλου',
	professional: { name: 'Δερματολόγος' },
	images: [{ url: '/m.jpg', thumbUrl: '/m-thumb.jpg', alt: 'Μαρία Τριανταφύλλου' }],
	rating: 4.9,
	reviewCount: 22
};

const visit = (patch: Partial<AppointmentFacts>): AppointmentFacts => ({
	...appointmentFactsSample,
	...patch
});

describe('screen 50 · the card (record §6.1, U-134.3)', () => {
	it('the day and the time first, the doctor, «specialty · service», the short address', () => {
		expect(
			buildAppointmentCard({
				appointment: appointmentFactsSample,
				doctor: maria,
				now: NOW,
				locale: 'el'
			})
		).toEqual({
			id: appointmentFactsSample.id,
			status: { label: 'Επιβεβαιωμένο', tone: 'success' },
			day: 'Πέμπτη 12 Νοεμβρίου',
			time: '12:30',
			doctorName: 'Dr. Μαρία Τριανταφύλλου',
			photo: { url: '/m-thumb.jpg', alt: 'Μαρία Τριανταφύλλου' },
			meta: 'Δερματολόγος · Απλή επίσκεψη',
			address: 'Ερμού 101, Αθήνα',
			forWhom: null,
			rateInvitationId: null,
			past: false
		});
	});

	it('🔴 U-139.5: «Για: Γιώργος Παππάς (γιος)» only for a relative; P-B4 §13.3.4: «Γράψτε κριτική» only with an open invitation', () => {
		const card = buildAppointmentCard({
			appointment: visit({
				status: 'completed',
				startTime: '2026-10-22T07:00:00.000Z',
				relativeId: 'rel-1',
				snapshot: {
					...appointmentFactsSample.snapshot,
					visitor: { kind: 'relative', name: 'Γιώργος Παππάς' }
				},
				relative: {
					relativeId: 'rel-1',
					firstName: 'Γιώργος',
					lastName: 'Παππάς',
					relationship: 'CHILD',
					gender: 'MALE'
				},
				ratingInvitation: { invitationId: 'inv-1', expiresAt: '2026-12-21T08:00:00.000Z' }
			}),
			doctor: maria,
			now: NOW,
			locale: 'el'
		});
		expect(card).toMatchObject({
			status: { label: 'Ολοκληρώθηκε', tone: 'muted' },
			forWhom: 'Για: Γιώργος Παππάς (γιος)',
			rateInvitationId: 'inv-1',
			past: true
		});
	});

	it('(negative) until the doctor’s profile answers the card names no doctor and no specialty — never an id', () => {
		const card = buildAppointmentCard({
			appointment: appointmentFactsSample,
			doctor: undefined,
			now: NOW,
			locale: 'el'
		});
		expect(card).toMatchObject({ doctorName: null, photo: null, meta: 'Απλή επίσκεψη' });
		expect(JSON.stringify(card)).not.toContain(appointmentFactsSample.doctorId);
	});

	it('the address in the page’s language when the office had it', () => {
		expect(
			buildAppointmentCard({
				appointment: appointmentFactsSample,
				doctor: maria,
				now: NOW,
				locale: 'en'
			}).address
		).toBe('Ermou 101, Athens');
	});
});

describe('screen 50 · the groups (U-134.4, U-134.5)', () => {
	it('«Επερχόμενα»: «Επόμενο ραντεβού · σε 2 ημέρες» over the first, «Αργότερα» over the rest', () => {
		const entries = buildAppointmentListEntries({
			tab: 'upcoming',
			appointments: [
				visit({ id: 'a1' }),
				visit({ id: 'a2', status: 'pending', startTime: '2026-11-16T07:00:00.000Z' }),
				visit({ id: 'a3', startTime: '2026-11-24T15:30:00.000Z' })
			],
			doctorOf: () => maria,
			now: NOW,
			locale: 'el'
		});
		expect(
			entries.map((entry) => (entry.kind === 'heading' ? entry.label : entry.card.id))
		).toEqual(['Επόμενο ραντεβού · σε 2 ημέρες', 'a1', 'Αργότερα', 'a2', 'a3']);
		const one = buildAppointmentListEntries({
			tab: 'upcoming',
			appointments: [visit({ id: 'a1', startTime: '2026-11-10T16:00:00.000Z' })],
			doctorOf: () => undefined,
			now: NOW,
			locale: 'en'
		});
		expect(one.map((entry) => (entry.kind === 'heading' ? entry.label : entry.card.id))).toEqual([
			'Next appointment · today',
			'a1'
		]);
	});

	it('review w4-w3 R1 NIT-3 (negative): a first day already past reads its date with its own capitals, only the relative word goes small', () => {
		const [heading] = buildAppointmentListEntries({
			tab: 'upcoming',
			appointments: [visit({ id: 'a0', startTime: '2026-11-09T09:00:00.000Z' })],
			doctorOf: () => maria,
			now: NOW,
			locale: 'el'
		});
		expect(heading).toMatchObject({
			kind: 'heading',
			label: 'Επόμενο ραντεβού · Δευ 9 Νοε · 11:00'
		});
	});

	it('«Ιστορικό»: one heading a month of the office’s calendar, over every loaded page; 23:30 on the 31st is November in Athens', () => {
		const entries = buildAppointmentListEntries({
			tab: 'history',
			appointments: [
				visit({ id: 'h0', status: 'canceled', startTime: '2026-10-31T22:30:00.000Z' }),
				visit({ id: 'h1', status: 'completed', startTime: '2026-10-22T07:00:00.000Z' }),
				visit({ id: 'h1b', status: 'completed', startTime: '2026-10-02T07:00:00.000Z' }),
				visit({ id: 'h2', status: 'canceled', startTime: '2026-09-14T15:00:00.000Z' })
			],
			doctorOf: () => maria,
			now: NOW,
			locale: 'el'
		});
		expect(
			entries.map((entry) => (entry.kind === 'heading' ? entry.label : entry.card.id))
		).toEqual(['Νοέμβριος 2026', 'h0', 'Οκτώβριος 2026', 'h1', 'h1b', 'Σεπτέμβριος 2026', 'h2']);
	});

	it('(negative) an empty tab has no heading; the doctors are read once each, never one per row', () => {
		expect(
			buildAppointmentListEntries({
				tab: 'upcoming',
				appointments: [],
				doctorOf: () => maria,
				now: NOW,
				locale: 'el'
			})
		).toEqual([]);
		expect(
			readAppointmentDoctorIds([
				visit({ doctorId: 'd-1' }),
				visit({ doctorId: 'd-2' }),
				visit({ doctorId: 'd-1' })
			])
		).toEqual(['d-1', 'd-2']);
	});
});

describe('screen 50 · its words', () => {
	it('the tabs, the empty «Επερχόμενα» with «Αναζήτηση γιατρών», the empty «Ιστορικό» without; D-W4-14: the guest’s sentence', () => {
		const upcoming = buildAppointmentsListCopy('upcoming', 'el');
		expect(upcoming).toMatchObject({
			title: 'Τα ραντεβού μου',
			tabs: [
				{ value: 'upcoming', label: 'Επερχόμενα' },
				{ value: 'history', label: 'Ιστορικό' }
			],
			emptyTitle: 'Δεν έχετε επερχόμενα ραντεβού',
			emptyCta: 'Αναζήτηση γιατρών',
			guestBody:
				'Συνδεθείτε για να βλέπετε τα ραντεβού σας, να αλλάζετε την ώρα και να τα ακυρώνετε.',
			signIn: 'Σύνδεση'
		});
		expect(buildAppointmentsListCopy('history', 'el')).toMatchObject({
			emptyTitle: 'Δεν υπάρχει ιστορικό ακόμα',
			emptyCta: null
		});
	});
});

describe('screen 51 · the doctor’s block (record §7.2)', () => {
	it('the booking card’s head named with the title, «★ 4,9 (22 κριτικές)»; without reviews no stars; without a name the platform’s words', () => {
		expect(appointmentDoctorHead(maria, 'el')).toEqual({
			photo: { src: '/m.jpg', alt: '' },
			specialty: 'Δερματολόγος',
			name: 'Dr. Μαρία Τριανταφύλλου',
			rating: { score: '4,9', reviews: '22 κριτικές', label: 'Βαθμολογία 4,9 από 5' }
		});
		expect(appointmentDoctorHead({ ...maria, reviewCount: 0 }, 'el').rating).toBeNull();
		const nameless = appointmentDoctorHead({ ...maria, name: '  ', images: [] }, 'el');
		expect(nameless.name).not.toBe('');
		expect(nameless.name).not.toContain('Dr.');
		expect(nameless.photo).toBeNull();
	});
});

describe('D-W4-29 · the doctors the pages read (card w4-w9, review w4-arch-frontend L-1)', () => {
	it('those of the loaded pages, then the open appointment’s — each once, in that order', () => {
		expect(joinAppointmentDoctorIds(['doc-a', 'doc-b'], 'doc-c')).toEqual([
			'doc-a',
			'doc-b',
			'doc-c'
		]);
		expect(joinAppointmentDoctorIds(['doc-a', 'doc-b'], 'doc-a')).toEqual(['doc-a', 'doc-b']);
	});

	it('(negative) below 950 no list is read: the open appointment’s doctor alone; nothing open and nothing listed: none — never an empty id', () => {
		expect(joinAppointmentDoctorIds([], 'doc-c')).toEqual(['doc-c']);
		expect(joinAppointmentDoctorIds([], null)).toEqual([]);
		expect(joinAppointmentDoctorIds([''], undefined)).toEqual([]);
		expect(joinAppointmentDoctorIds(['doc-a', '', 'doc-a'], '')).toEqual(['doc-a']);
	});
});
