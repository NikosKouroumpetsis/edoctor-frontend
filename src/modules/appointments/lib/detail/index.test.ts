import { describe, expect, it } from 'vitest';
import {
	appointmentActionsSample,
	appointmentFactsSample
} from '$modules/appointments/api/appointment/appointment.sample';
import type {
	AppointmentActionsFacts,
	AppointmentFacts,
	AppointmentOfficeFacts
} from '$modules/appointments/api/appointment';
import {
	appointmentCancelLinkLabel,
	appointmentOfficeFloor,
	appointmentOfficeLine,
	appointmentPhone,
	appointmentTabOf,
	appointmentVisitorLabel,
	buildAppointmentActionRows,
	buildAppointmentDoneNotice,
	buildAppointmentHeader,
	buildAppointmentNotices,
	buildAppointmentRows,
	buildAppointmentTerms,
	resolveAppointmentMoved
} from '.';

/** D-W4-36.3: the office's phone as the 51 / 53 read it (the national groups, no-break spaces). */
const PHONE = ['210', '321', '0101'].join('\u00a0');

/** The prototypes' «today»: Tuesday 10 November 2026, 12:00 Athens. */
const NOW = Date.parse('2026-11-10T10:00:00.000Z');
const visit = (patch: Partial<AppointmentFacts>): AppointmentFacts => ({
	...appointmentFactsSample,
	...patch
});
const actions = (patch: Partial<AppointmentActionsFacts> = {}): AppointmentActionsFacts => ({
	...appointmentActionsSample,
	...patch
});
const closed = actions({
	canCancel: false,
	canReschedule: false,
	cancellationCutoffHours: null,
	cancellationDeadline: null,
	rescheduleDenial: 'STATUS',
	reschedulesLeft: null
});

describe('screen 51 · the head and the tab (record §7.2)', () => {
	it('the pill, the day and the time, «Σε 2 ημέρες · Διάρκεια 30 λεπτά»; the history the length alone', () => {
		expect(buildAppointmentHeader(appointmentFactsSample, NOW, 'el')).toEqual({
			status: { label: 'Επιβεβαιωμένο', tone: 'success' },
			day: 'Πέμπτη 12 Νοεμβρίου',
			time: '12:30',
			sub: 'Σε 2 ημέρες · Διάρκεια 30 λεπτά'
		});
		expect(buildAppointmentHeader(visit({ status: 'completed' }), NOW, 'el').sub).toBe(
			'Διάρκεια 30 λεπτά'
		);
	});

	it('P-W4 §3.2: the tab comes from the appointment — closed, or open but started, is «Ιστορικό»', () => {
		expect(appointmentTabOf(appointmentFactsSample, NOW)).toBe('upcoming');
		expect(appointmentTabOf(visit({ status: 'canceled' }), NOW)).toBe('history');
		expect(appointmentTabOf(visit({ startTime: '2026-11-10T09:00:00.000Z' }), NOW)).toBe('history');
		expect(
			appointmentTabOf(visit({ status: 'pending', startTime: '2026-11-10T10:00:00.000Z' }), NOW)
		).toBe('upcoming');
	});
});

describe('screen 51 · the notices, in the application’s order (record §7.2)', () => {
	it('D-42: the doctor moved the hour — the LAST change of the start wins, whoever made it', () => {
		const movedByDoctor = visit({
			auditTrail: [
				{
					action: 'UPDATED',
					actorKind: 'DOCTOR',
					at: '2026-11-05T08:00:00.000Z',
					previousStartTime: '2026-11-12T09:00:00.000Z',
					nextStartTime: '2026-11-12T10:30:00.000Z'
				}
			]
		});
		expect(
			buildAppointmentNotices({ appointment: movedByDoctor, actions: actions(), locale: 'el' })
		).toEqual([
			{
				id: 'moved',
				tone: 'warm',
				text: 'Ο γιατρός άλλαξε την ώρα. Το ραντεβού ήταν Πέμ 12 Νοε · 11:00.',
				lines: [],
				call: null
			}
		]);
		const thenByPatient = visit({
			auditTrail: [
				...movedByDoctor.auditTrail,
				{
					action: 'UPDATED',
					actorKind: 'PATIENT',
					at: '2026-11-06T08:00:00.000Z',
					previousStartTime: '2026-11-12T10:30:00.000Z',
					nextStartTime: '2026-11-12T11:00:00.000Z'
				}
			]
		});
		expect(resolveAppointmentMoved(thenByPatient)).toBeNull();
		// (negative) a note's edit is an `UPDATED` line with the same hour on both sides.
		expect(
			resolveAppointmentMoved(
				visit({
					auditTrail: [
						{
							action: 'UPDATED',
							actorKind: 'DOCTOR',
							at: '2026-11-05T08:00:00.000Z',
							previousStartTime: '2026-11-12T10:30:00.000Z',
							nextStartTime: '2026-11-12T10:30:00.000Z'
						}
					]
				})
			)
		).toBeNull();
	});

	it('U-76.1: the deadline passed, with «Κλήση ιατρείου · …» that dials only digits; a request’s deadline', () => {
		const past = actions({
			canCancel: false,
			canReschedule: false,
			isPastCancellationCutoff: true,
			cancellationDeadline: null
		});
		expect(
			buildAppointmentNotices({ appointment: appointmentFactsSample, actions: past, locale: 'el' })
		).toEqual([
			{
				id: 'deadline-passed',
				tone: 'warm',
				text: 'Η προθεσμία ακύρωσης έληξε· επικοινωνήστε με το ιατρείο.',
				lines: [],
				// 🔴 D-W4-36.3: read as the prototype, «210 321 0101»; dialled whole.
				call: { label: `Κλήση ιατρείου · ${PHONE}`, dial: '+302103210101' }
			}
		]);
		expect(
			buildAppointmentNotices({
				appointment: visit({ status: 'pending', expiresAt: '2026-11-13T17:00:00.000Z' }),
				actions: actions(),
				locale: 'el'
			})[0]?.text
		).toBe('Το αίτημα λήγει στις Παρ 13 Νοε · 19:00 αν δεν απαντήσει ο γιατρός.');
	});

	it('canceled by the patient: who and when, the reason, «Το μήνυμά σας», and — right after, with an email — «Σας στείλαμε email…»', () => {
		const canceled = visit({
			status: 'canceled',
			canceledAt: '2026-11-10T19:05:00.000Z',
			canceledBy: 'PATIENT',
			cancelReasonCode: 'SCHEDULE_CONFLICT',
			cancelReasonText: 'Δεν προλαβαίνω.'
		});
		expect(
			buildAppointmentNotices({
				appointment: canceled,
				actions: closed,
				justCanceled: true,
				locale: 'el'
			})
		).toEqual([
			{
				id: 'canceled',
				tone: 'neutral',
				text: 'Το ραντεβού ακυρώθηκε.',
				lines: [
					'Από εσάς · Τρί 10 Νοε · 21:05',
					'Λόγος: Δεν με βολεύει η ώρα',
					'Το μήνυμά σας: «Δεν προλαβαίνω.»',
					'Σας στείλαμε email επιβεβαίωσης.'
				],
				call: null
			}
		]);
		// D-W4-11 (negative): without an email the line is not there; nor on a later visit to the page.
		const lines = (patch: Partial<AppointmentFacts>, justCanceled: boolean) =>
			buildAppointmentNotices({
				appointment: visit({ ...canceled, ...patch }),
				actions: closed,
				justCanceled,
				locale: 'el'
			})[0]?.lines;
		expect(lines({ patientHasEmail: false }, true)).not.toContain(
			'Σας στείλαμε email επιβεβαίωσης.'
		);
		expect(lines({}, false)).not.toContain('Σας στείλαμε email επιβεβαίωσης.');
		// 🔴 D-W4-36.6 (negative): a repeat of the request that met the DOCTOR's cancellation (the server answers `200`)
		// sent the patient no email: the line is the patient's own cancellation's alone.
		expect(lines({ canceledBy: 'DOCTOR' }, true)).not.toContain('Σας στείλαμε email επιβεβαίωσης.');
		expect(lines({ canceledBy: 'SYSTEM' }, true)).not.toContain('Σας στείλαμε email επιβεβαίωσης.');
	});

	it('U-137.4: a request reads «Το αίτημα ακυρώθηκε.»; by the doctor «Από τον γιατρό» and «Μήνυμα του γιατρού»; D-W4-15: by the system nothing of who', () => {
		const byDoctor = buildAppointmentNotices({
			appointment: visit({
				status: 'canceled',
				confirmedAt: null,
				canceledAt: '2026-09-10T18:14:00.000Z',
				canceledBy: 'DOCTOR',
				cancelReasonCode: 'EMERGENCY',
				cancelReasonText: 'Έκτακτο χειρουργείο.'
			}),
			actions: closed,
			locale: 'el'
		})[0];
		expect(byDoctor).toMatchObject({
			text: 'Το αίτημα ακυρώθηκε.',
			lines: [
				'Από τον γιατρό · Πέμ 10 Σεπ · 21:14',
				'Λόγος: Έκτακτο περιστατικό',
				'Μήνυμα του γιατρού: «Έκτακτο χειρουργείο.»'
			]
		});
		const bySystem = buildAppointmentNotices({
			appointment: visit({
				status: 'canceled',
				canceledAt: '2026-09-10T18:14:00.000Z',
				canceledBy: 'SYSTEM',
				cancelReasonCode: 'OTHER',
				cancelReasonText: 'internal'
			}),
			actions: closed,
			locale: 'el'
		})[0];
		expect(bySystem?.lines).toEqual(['Λόγος: Άλλος λόγος']);
	});

	it('refused with the doctor’s words, expired, «δεν προσήλθατε» — neutral; 🔴 U-137.5: never «εκπρόθεσμα»', () => {
		const said = (patch: Partial<AppointmentFacts>) =>
			buildAppointmentNotices({ appointment: visit(patch), actions: closed, locale: 'el' }).map(
				(notice) => [notice.tone, notice.text, ...notice.lines]
			);
		expect(said({ status: 'rejected', rejectReasonText: 'Δεν εξετάζω παιδιά.' })).toEqual([
			['neutral', 'Ο γιατρός απέρριψε το αίτημα.', 'Μήνυμα του γιατρού: «Δεν εξετάζω παιδιά.»']
		]);
		expect(said({ status: 'expired' })).toEqual([
			['neutral', 'Το αίτημα έληξε, επειδή ο γιατρός δεν απάντησε εγκαίρως.']
		]);
		expect(said({ status: 'no_show' })).toEqual([
			['neutral', 'Ο γιατρός δήλωσε ότι δεν προσήλθατε στο ραντεβού.']
		]);
		const all = JSON.stringify(
			['canceled', 'rejected', 'expired', 'no_show'].map((status) =>
				said({
					status: status as AppointmentFacts['status'],
					canceledBy: 'PATIENT',
					canceledAt: NOW.toString()
				})
			)
		);
		expect(all).not.toMatch(/εκπρόθεσμ/u);
	});

	it('(negative) the other side’s words are cut at the server’s bound; an open visit with nothing to say has no notice', () => {
		const long = buildAppointmentNotices({
			appointment: visit({ status: 'rejected', rejectReasonText: 'α'.repeat(3000) }),
			actions: closed,
			locale: 'el'
		})[0];
		expect(long?.lines[0]?.length).toBeLessThan(2100);
		expect(
			buildAppointmentNotices({
				appointment: appointmentFactsSample,
				actions: actions(),
				locale: 'el'
			})
		).toEqual([]);
	});
});

describe('screen 51 · the card’s rows (record §7.2, U-135.2)', () => {
	it('every row with its «Αλλαγή» where allowed; the office with floor and phone; one line a service; the visitor; the note; the cost', () => {
		const rows = buildAppointmentRows({
			appointment: appointmentFactsSample,
			actions: actions(),
			now: NOW,
			locale: 'el'
		});
		expect(rows.map((row) => [row.id, row.label, row.values, row.change?.target ?? null])).toEqual([
			['date-time', 'Ημέρα και ώρα', ['Πέμπτη 12 Νοεμβρίου · 12:30'], 'time'],
			['office', 'Ιατρείο', ['Ερμού 101, Αθήνα, Αττική', '2ος όροφος'], null],
			['reason', 'Λόγος επίσκεψης', ['Απλή επίσκεψη · 30 λεπτά'], null],
			['visitor', 'Επισκέπτης', ['Για μένα · Ελένη Παππά'], 'for-whom'],
			['note', 'Σημείωση για τον γιατρό', ['Έχω μαζί μου τις εξετάσεις του Σεπτεμβρίου.'], 'note'],
			['price', 'Κόστος', ['140\u00a0€'], null]
		]);
		expect(rows[1]?.phone).toEqual({ label: PHONE, dial: '+302103210101' });
		expect(rows[5]?.hint).toBe(
			'Οι αναγραφόμενες τιμές είναι ενδεικτικές και μπορεί να διαφοροποιηθούν ανάλογα με την επίσκεψη.'
		);
	});

	it('P-B4 §13.3.3: «Έχετε αλλάξει την ώρα όσες φορές…» once the moves are spent, and no «Αλλαγή»', () => {
		const spent = actions({
			canReschedule: false,
			rescheduleDenial: 'LIMIT_REACHED',
			reschedulesLeft: 0
		});
		const row = buildAppointmentRows({
			appointment: appointmentFactsSample,
			actions: spent,
			now: NOW,
			locale: 'el'
		})[0];
		expect(row).toMatchObject({
			hint: 'Έχετε αλλάξει την ώρα όσες φορές επιτρέπεται. Για άλλη αλλαγή, καλέστε το ιατρείο.',
			change: null
		});
	});

	it('🔴 a closed visit changes nothing: no «Αλλαγή», no empty note; two services: each and «Σύνολο»; no prices’ notice in the history', () => {
		const rows = buildAppointmentRows({
			appointment: visit({
				status: 'completed',
				patientNote: null,
				snapshot: { ...appointmentFactsSample.snapshot, totalAmount: 180 },
				serviceLines: [
					{
						doctorServiceId: 's-1',
						title: 'Απλή επίσκεψη',
						durationInMinutes: 30,
						amount: 140,
						isActive: true
					},
					{
						doctorServiceId: 's-2',
						title: 'Δερματοσκόπηση',
						durationInMinutes: 15,
						amount: 40,
						isActive: true
					},
					{
						doctorServiceId: 's-0',
						title: 'Αφαιρέθηκε',
						durationInMinutes: 10,
						amount: 20,
						isActive: false
					}
				]
			}),
			actions: closed,
			now: NOW,
			locale: 'el'
		});
		expect(rows.filter((row) => row.change)).toEqual([]);
		expect(rows.map((row) => row.id)).not.toContain('note');
		expect(rows.find((row) => row.id === 'reason')?.values).toEqual([
			'Απλή επίσκεψη · 30 λεπτά',
			'Δερματοσκόπηση · 15 λεπτά'
		]);
		expect(rows.find((row) => row.id === 'price')).toMatchObject({
			values: [],
			hint: null,
			breakdown: {
				lines: [
					{ label: 'Απλή επίσκεψη', amount: '140\u00a0€' },
					{ label: 'Δερματοσκόπηση', amount: '40\u00a0€' }
				],
				totalLabel: 'Σύνολο',
				total: '180\u00a0€'
			}
		});
	});

	it('an open visit without a note offers «Προσθήκη» under «Δεν έχετε γράψει σημείωση.»; 🔴 U-139.5 the relative with its word', () => {
		const rows = buildAppointmentRows({
			appointment: visit({
				patientNote: null,
				relativeId: 'rel-1',
				snapshot: {
					...appointmentFactsSample.snapshot,
					visitor: { kind: 'relative', name: 'Άννα Παππά' }
				},
				relative: {
					relativeId: 'rel-1',
					firstName: 'Άννα',
					lastName: 'Παππά',
					relationship: 'PARENT',
					gender: 'FEMALE'
				}
			}),
			actions: actions(),
			now: NOW,
			locale: 'el'
		});
		expect(rows.find((row) => row.id === 'note')).toMatchObject({
			values: [],
			hint: 'Δεν έχετε γράψει σημείωση.',
			change: { target: 'note', label: 'Προσθήκη' }
		});
		expect(rows.find((row) => row.id === 'visitor')?.values).toEqual(['Άννα Παππά (μητέρα)']);
	});
});

describe('screen 51 · «Όροι του γιατρού» (P-B4 §13.3.1, as written)', () => {
	it('«Ακύρωση έως 24 ώρες πριν» and «Δηλαδή έως Τετάρτη 11 Νοεμβρίου, 12:30.» (U-135.6)', () => {
		expect(
			buildAppointmentTerms({
				appointment: appointmentFactsSample,
				actions: actions(),
				locale: 'el'
			})
		).toEqual({
			title: 'Όροι του γιατρού',
			lines: [
				'Άμεση επιβεβαίωση',
				'Ακύρωση έως 24 ώρες πριν',
				'Δηλαδή έως Τετάρτη 11 Νοεμβρίου, 12:30.'
			]
		});
	});

	it('a deadline that IS the start: «έως την ώρα του ραντεβού» — a request’s own words', () => {
		const start = '2026-11-11T08:00:00.000Z';
		const inside = actions({
			isPastCancellationCutoff: true,
			canReschedule: false,
			cancellationDeadline: start
		});
		expect(
			buildAppointmentTerms({
				appointment: visit({ startTime: start }),
				actions: inside,
				locale: 'el'
			})?.lines
		).toEqual(['Άμεση επιβεβαίωση', 'Ακύρωση έως την ώρα του ραντεβού']);
		expect(
			buildAppointmentTerms({
				appointment: visit({ startTime: start, status: 'pending', confirmationMode: 'MANUAL' }),
				actions: inside,
				locale: 'el'
			})?.lines
		).toEqual([
			'Ο γιατρός επιβεβαιώνει το αίτημα',
			'Το αίτημα ακυρώνεται έως την ώρα του ραντεβού'
		]);
	});

	it('(negative) no card once the patient cannot cancel; in an answer without the instant the «Δηλαδή» line is absent', () => {
		expect(
			buildAppointmentTerms({ appointment: appointmentFactsSample, actions: closed, locale: 'el' })
		).toBeNull();
		expect(
			buildAppointmentTerms({ appointment: appointmentFactsSample, actions: null, locale: 'el' })
		).toBeNull();
		expect(
			buildAppointmentTerms({
				appointment: appointmentFactsSample,
				actions: actions({ cancellationDeadline: null }),
				locale: 'el'
			})?.lines
		).toEqual(['Άμεση επιβεβαίωση', 'Ακύρωση έως 24 ώρες πριν']);
	});
});

describe('screen 51 · the actions, the link, the office, the done notice', () => {
	it('U-135.4 «Προσθήκη στο ημερολόγιο» only kept and upcoming; U-135.3 the directions only upcoming; the help always', () => {
		expect(
			buildAppointmentActionRows(appointmentFactsSample, NOW, 'el').map((row) => row.id)
		).toEqual(['calendar', 'directions', 'help']);
		expect(
			buildAppointmentActionRows(visit({ status: 'pending' }), NOW, 'el').map((row) => row.id)
		).toEqual(['directions', 'help']);
		expect(
			buildAppointmentActionRows(visit({ status: 'completed' }), NOW, 'el').map((row) => row.id)
		).toEqual(['help']);
		expect(buildAppointmentActionRows(appointmentFactsSample, NOW, 'el')[1]?.hint).toBe(
			'Ανοίγει την εφαρμογή χαρτών της συσκευής σας'
		);
	});

	it('U-137.4: «Ακύρωση αιτήματος» for a request, «Ακύρωση ραντεβού» else, nothing once it cannot', () => {
		expect(appointmentCancelLinkLabel(appointmentFactsSample, actions(), 'el')).toBe(
			'Ακύρωση ραντεβού'
		);
		expect(appointmentCancelLinkLabel(visit({ status: 'pending' }), actions(), 'el')).toBe(
			'Ακύρωση αιτήματος'
		);
		expect(appointmentCancelLinkLabel(appointmentFactsSample, closed, 'el')).toBeNull();
	});

	it('the office in the page’s language; 🔴 D-W4-34: its floor as the approved 51 — «2ος όροφος», «Ισόγειο» — on the site’s one set of words; (negative) a phone of no digits dials nothing', () => {
		const office = appointmentFactsSample.office as AppointmentOfficeFacts;
		expect(appointmentOfficeLine(office, 'en')).toBe('Ermou 101, Athens, Attica');
		expect(appointmentOfficeFloor({ ...office, floor: 2, translations: [] }, 'el')).toBe(
			'2ος όροφος'
		);
		expect(appointmentOfficeFloor({ ...office, floor: 3, translations: [] }, 'en')).toBe('Floor 3');
		expect(appointmentOfficeFloor({ ...office, floor: 0, translations: [] }, 'el')).toBe('Ισόγειο');
		expect(appointmentOfficeFloor({ ...office, floor: 0, translations: [] }, 'el')).not.toMatch(
			/όροφος/u
		);
		expect(appointmentOfficeFloor({ ...office, floor: null, translations: [] }, 'el')).toBeNull();
		expect(appointmentOfficeFloor({ ...office, floor: -1, translations: [] }, 'en')).toBe(
			'Basement'
		);
		expect(appointmentPhone(visit({ officePhone: 'κλήση;', office: null }))).toBeNull();
		// D-W4-36.3: without the office's phone of today, the one frozen at booking — read the prototype's way.
		expect(appointmentPhone(visit({ officePhone: null }))).toEqual({
			label: PHONE,
			dial: '+302103210101'
		});
		// Review w4-w3 R1 NIT-4 (negative): a translation without its city is not taken half — the booked address whole.
		const half = {
			...office,
			translations: [{ ...office.translations[0], city: null, state: null }]
		};
		expect(appointmentOfficeLine(half, 'en')).toBe('Ερμού 101, Αθήνα, Αττική');
		expect(appointmentOfficeFloor({ ...half, floor: 2 }, 'en')).toBe('Floor 2');
		expect(
			appointmentVisitorLabel(
				visit({
					snapshot: { ...appointmentFactsSample.snapshot, visitor: { kind: 'self', name: null } }
				}),
				'el'
			)
		).toBe('Για μένα');
	});

	it('U-136.6: «Η ώρα άλλαξε.» with «Ήταν …» and — with an email only (D-W4-11) — «Σας στείλαμε email με τη νέα ώρα.»', () => {
		expect(
			buildAppointmentDoneNotice(
				{ kind: 'time', was: '2026-11-12T10:30:00.000Z' },
				appointmentFactsSample,
				'el'
			)
		).toEqual({
			title: 'Η ώρα άλλαξε.',
			lines: ['Ήταν Πέμπτη 12 Νοεμβρίου · 12:30.', 'Σας στείλαμε email με τη νέα ώρα.']
		});
		expect(
			buildAppointmentDoneNotice(
				{ kind: 'time', was: '2026-11-12T10:30:00.000Z' },
				visit({ patientHasEmail: false }),
				'el'
			).lines
		).toEqual(['Ήταν Πέμπτη 12 Νοεμβρίου · 12:30.']);
		expect(buildAppointmentDoneNotice({ kind: 'for-whom' }, appointmentFactsSample, 'el')).toEqual({
			title: 'Ο επισκέπτης άλλαξε.',
			lines: ['Το ραντεβού είναι πλέον για: Ελένη Παππά.']
		});
		expect(
			buildAppointmentDoneNotice({ kind: 'note', removed: true }, appointmentFactsSample, 'el')
				.title
		).toBe('Η σημείωση αφαιρέθηκε.');
		expect(buildAppointmentDoneNotice({ kind: 'rating' }, appointmentFactsSample, 'el')).toEqual({
			title: 'Η κριτική υποβλήθηκε.',
			lines: ['Ευχαριστούμε. Η ομάδα του eDoctor την ελέγχει πριν δημοσιευτεί.']
		});
	});
});
