import { describe, expect, it } from 'vitest';
import {
	DOCTOR_REVIEW_REPORT_REASONS,
	mapDoctorReview,
	mapDoctorReviewsPage,
	mapDoctorReviewsSummary,
	type DoctorReviewFacts,
	type DoctorReviewsPageFacts
} from '$modules/doctor-dashboard/api/reviews';
import {
	sampleReviewId,
	sampleReviewRow,
	sampleReviewRows,
	sampleReviewsSummary,
	sampleReviewVisit
} from '$modules/doctor-dashboard/api/reviews/reviews.sample';
import {
	buildDoctorReviewCards,
	buildDoctorReviewsSummary,
	doctorReviewAuthor,
	doctorReviewRejectedNote,
	doctorReviewReplyMode,
	doctorReviewReplyText,
	doctorReviewReportReasons,
	doctorReviewsFailureText,
	doctorReviewsHeldLabel,
	doctorReviewsUnansweredLabel,
	doctorReviewVisitLine
} from './index';

const review = (row: unknown) => mapDoctorReview(row) as DoctorReviewFacts;
const pageOf = (rows = sampleReviewRows(), extra: Partial<DoctorReviewsPageFacts> = {}) =>
	({
		...(mapDoctorReviewsPage({
			items: rows,
			nextCursor: null,
			total: rows.length,
			visits: rows.map((_, index) => sampleReviewVisit(index + 1)),
			openReports: []
		}) as DoctorReviewsPageFacts),
		...extra
	}) satisfies DoctorReviewsPageFacts;

describe('lib/reviews · the cards (D-W52-91, U-218.1, U-219.2)', () => {
	it('🔴 D-W52-84: the patient as the public page names them — «Κατερίνα Λ.» and «ΚΛ», each degrading alone, «Ασθενής» with nothing', () => {
		expect(doctorReviewAuthor({ patientName: 'Κατερίνα', patientInitial: 'λ' }, 'el')).toEqual({
			name: 'Κατερίνα Λ.',
			initials: 'ΚΛ'
		});
		expect(doctorReviewAuthor({ patientName: 'Κατερίνα', patientInitial: null }, 'el')).toEqual({
			name: 'Κατερίνα',
			initials: 'Κ'
		});
		expect(doctorReviewAuthor({ patientName: null, patientInitial: 'Λ' }, 'el')).toEqual({
			name: 'Λ.',
			initials: 'Λ'
		});
		expect(doctorReviewAuthor({ patientName: null, patientInitial: null }, 'el')).toEqual({
			name: 'Ασθενής',
			initials: 'Α'
		});
		expect(doctorReviewAuthor({ patientName: null, patientInitial: null }, 'en').name).toBe(
			'Patient'
		);
	});

	it('🔴 U-219.2 · U-219.4: «Το ραντεβού · Τετάρτη 11 Νοεμβρίου, 10:00 · Ηλεκτροκαρδιογράφημα» — the OFFICE’s clock, then its services; none without a visit', () => {
		const visit = (input = {}) =>
			mapDoctorReviewsPage({ items: [], visits: [sampleReviewVisit(1, input)] })?.visits[0];
		expect(doctorReviewVisitLine(visit(), 'el')).toBe(
			'Τετάρτη 11 Νοεμβρίου, 10:00 · Ηλεκτροκαρδιογράφημα'
		);
		expect(doctorReviewVisitLine(visit(), 'en')).toMatch(
			/^Wednesday,? (11 )?November( 11)?, 10:00 · /u
		);
		// Another office's zone: its own wall clock.
		expect(doctorReviewVisitLine(visit({ officeTimeZone: 'Europe/London' }), 'el')).toBe(
			'Τετάρτη 11 Νοεμβρίου, 08:00 · Ηλεκτροκαρδιογράφημα'
		);
		expect(
			doctorReviewVisitLine(visit({ serviceTitles: ['Επίσκεψη', 'Υπέρηχος καρδιάς'] }), 'el')
		).toBe('Τετάρτη 11 Νοεμβρίου, 10:00 · Επίσκεψη, Υπέρηχος καρδιάς');
		expect(doctorReviewVisitLine(visit({ serviceTitles: [] }), 'el')).toBe(
			'Τετάρτη 11 Νοεμβρίου, 10:00'
		);
		expect(doctorReviewVisitLine(undefined, 'el')).toBeNull();
	});

	it('🔴 U-218.1 · U-219.1 Ε2 Α: the reply in its FOUR states — none, being checked, published (its day), not published — ONLY what the server gave, each review once with its visit and its report', () => {
		const rows = sampleReviewRows();
		const cards = buildDoctorReviewCards(
			[
				pageOf(rows.slice(0, 4), {
					openReports: [{ ratingId: sampleReviewId(4), reportedAt: '2026-11-14T10:00:00.000Z' }]
				}),
				pageOf([rows[3], ...rows.slice(4)], { visits: [] })
			],
			'el'
		);
		expect(cards.map((card) => card.id)).toEqual(rows.map((row) => row.id));
		expect(cards.map((card) => card.reply.state)).toEqual([
			'none',
			'published',
			'pending',
			'none',
			'none',
			'rejected'
		]);
		expect(cards[1]?.reply).toEqual({
			state: 'published',
			text: 'Σας ευχαριστώ πολύ για τα καλά σας λόγια.',
			day: '11 Νοεμβρίου 2026'
		});
		expect(cards[0]).toMatchObject({
			author: { name: 'Κατερίνα Λ.', initials: 'ΚΛ' },
			day: '13 Νοεμβρίου 2026',
			stars: 5,
			rating: '5',
			starsLabel: '5 από 5 αστέρια',
			comment: 'Πολύ προσεκτική και ήρεμη.',
			visit: 'Τετάρτη 11 Νοεμβρίου, 10:00 · Ηλεκτροκαρδιογράφημα',
			reported: false
		});
		expect(cards[3]?.reported).toBe(true);
		expect(cards[4]?.comment).toBeNull();
		// A review whose visit the server named on no page read has no «Το ραντεβού» row (never a made-up one).
		expect(cards[5]?.visit).toBeNull();
		expect(buildDoctorReviewCards(undefined, 'el')).toEqual([]);
	});

	it('🔴 D-W52-86α: a rejected reply’s line — «… δεν την ενέκρινε: <λόγος> Μπορείτε να γράψετε νέα.»; a full stop only when the reason has none; without a reason (old data) the sentence alone', () => {
		expect(doctorReviewRejectedNote('Γράφει στοιχεία υγείας του ασθενή.', 'el')).toBe(
			'Η ομάδα του eDoctor δεν την ενέκρινε: Γράφει στοιχεία υγείας του ασθενή. Μπορείτε να γράψετε νέα.'
		);
		expect(doctorReviewRejectedNote('Γράφει στοιχεία υγείας', 'el')).toBe(
			'Η ομάδα του eDoctor δεν την ενέκρινε: Γράφει στοιχεία υγείας. Μπορείτε να γράψετε νέα.'
		);
		expect(doctorReviewRejectedNote('Είναι σωστό;', 'el')).toBe(
			'Η ομάδα του eDoctor δεν την ενέκρινε: Είναι σωστό; Μπορείτε να γράψετε νέα.'
		);
		expect(doctorReviewRejectedNote(null, 'el')).toBe(
			'Η ομάδα του eDoctor δεν την ενέκρινε. Μπορείτε να γράψετε νέα.'
		);
		expect(doctorReviewRejectedNote('  ', 'el')).toBe(
			'Η ομάδα του eDoctor δεν την ενέκρινε. Μπορείτε να γράψετε νέα.'
		);
		expect(doctorReviewRejectedNote('Health details.', 'en')).toBe(
			'The eDoctor team did not approve it: Health details. You can write a new one.'
		);
		const [card] = buildDoctorReviewCards(
			[
				pageOf([
					sampleReviewRow(6, {
						reply: { status: 'REJECTED', text: 'x', at: '2026-10-03T09:00:00.000Z' },
						reason: 'Λόγος.'
					})
				])
			],
			'el'
		);
		expect(card?.reply).toMatchObject({ state: 'rejected', reason: 'Λόγος.' });
	});

	it('half a star is said as a number of the page’s language', () => {
		const [card] = buildDoctorReviewCards([pageOf([sampleReviewRow(1, { stars: 4.5 })])], 'el');
		expect(card?.rating).toBe('4,5');
		expect(card?.starsLabel).toBe('4,5 από 5 αστέρια');
	});
});

describe('lib/reviews · the summary (D-W52-85, U-218.1)', () => {
	it('🔴 D-W52-85: «4,8», «24 κριτικές», the five stars with their share, the five averages with the PUBLIC page’s labels, the six topics in the server’s order', () => {
		const summary = buildDoctorReviewsSummary(
			mapDoctorReviewsSummary(sampleReviewsSummary()) ?? undefined,
			'el'
		);
		expect(summary).toMatchObject({
			average: '4,8',
			averageStars: 5,
			averageLabel: '4,8 από 5 αστέρια',
			countLabel: '24 κριτικές'
		});
		expect(summary?.bars.map((bar) => [bar.star, bar.count])).toEqual([
			[5, 19],
			[4, 3],
			[3, 1],
			[2, 1],
			[1, 0]
		]);
		expect(summary?.bars[0]?.share).toBeCloseTo(19 / 24);
		expect(summary?.aspects.map((aspect) => [aspect.label, aspect.value])).toEqual([
			['Εμπιστοσύνη', '4,9'],
			['Εξειδίκευση', '4,9'],
			['Συνέπεια', '4,5'],
			['Φιλικότητα', '4,8'],
			['Σε βάθος', '4,7']
		]);
		expect(summary?.topics.map((topic) => [topic.label, topic.count])).toEqual([
			['Εξήγηση', 11],
			['Ευγένεια', 9],
			['Υπομονή', 6],
			['Οργάνωση', 4],
			['Καθαριότητα ιατρείου', 3],
			['Πρόσβαση', 2]
		]);
		expect(
			buildDoctorReviewsSummary(
				mapDoctorReviewsSummary({ ...sampleReviewsSummary(), count: 1 }) ?? undefined,
				'en'
			)?.countLabel
		).toBe('1 review');
	});

	it('none without a published review, and none for no answer', () => {
		expect(
			buildDoctorReviewsSummary(
				mapDoctorReviewsSummary({ ...sampleReviewsSummary(), count: 0, average: null }) ??
					undefined,
				'el'
			)
		).toBeNull();
		expect(buildDoctorReviewsSummary(undefined, 'el')).toBeNull();
	});

	it('🔴 U-219.1 Ε1 Α: «N νέες κριτικές ελέγχονται …» from `pendingCount` — one, many, none', () => {
		expect(doctorReviewsHeldLabel(1, 'el')).toBe(
			'1 νέα κριτική ελέγχεται από την ομάδα του eDoctor. Θα τη δείτε εδώ μόλις δημοσιευτεί.'
		);
		expect(doctorReviewsHeldLabel(3, 'el')).toBe(
			'3 νέες κριτικές ελέγχονται από την ομάδα του eDoctor. Θα τις δείτε εδώ μόλις δημοσιευτούν.'
		);
		expect(doctorReviewsHeldLabel(0, 'el')).toBeNull();
		expect(doctorReviewsHeldLabel(-2, 'el')).toBeNull();
		expect(doctorReviewsUnansweredLabel(4, 'el')).toBe('Χωρίς απάντηση (4)');
		expect(doctorReviewsUnansweredLabel(4, 'en')).toBe('Without a reply (4)');
	});
});

describe('lib/reviews · the reply and the report (D-W52-86 / 87)', () => {
	it('🔴 U-219.1 Ε2 Α: a NEW reply after none or after one not published, else the CHANGE of the one there', () => {
		expect(doctorReviewReplyMode('NONE')).toBe('new');
		expect(doctorReviewReplyMode('REJECTED')).toBe('new');
		expect(doctorReviewReplyMode('PENDING')).toBe('change');
		expect(doctorReviewReplyMode('APPROVED')).toBe('change');
	});

	it('🔴 D-W52-86 · U-65.6: the words a reply sends — trimmed, none for only spaces or past 2000 (never cut behind the doctor)', () => {
		expect(doctorReviewReplyText('  Ευχαριστώ!  ')).toBe('Ευχαριστώ!');
		expect(doctorReviewReplyText(' \n ')).toBeNull();
		expect(doctorReviewReplyText('α'.repeat(2000))).toHaveLength(2000);
		expect(doctorReviewReplyText('α'.repeat(2001))).toBeNull();
		expect(doctorReviewReplyText('<script>x</script>')).toBe('<script>x</script>');
	});

	it('🔴 D-W52-87 · U-112: the five reasons, the page’s words, in its order', () => {
		expect(
			doctorReviewReportReasons(DOCTOR_REVIEW_REPORT_REASONS, 'el').map((reason) => reason.label)
		).toEqual([
			'Δεν ήταν ασθενής μου',
			'Είναι προσβλητική ή απειλητική',
			'Γράφει προσωπικά στοιχεία',
			'Δεν αφορά την επίσκεψη',
			'Κάτι άλλο'
		]);
	});

	it('every refusal in the page’s words', () => {
		expect(doctorReviewsFailureText('rate-limited', 'reply', 'el')).toBe(
			'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		);
		expect(doctorReviewsFailureText('gone', 'report', 'el')).toBe(
			'Αυτή η κριτική δεν φαίνεται πια στη σελίδα σας.'
		);
		expect(doctorReviewsFailureText('reported', 'report', 'el')).toBe(
			'Τη στείλατε για έλεγχο. Η ομάδα του eDoctor την εξετάζει· ως τότε μένει στη σελίδα σας.'
		);
		expect(doctorReviewsFailureText('invalid', 'reply', 'el')).toBe(
			'Η απάντηση δεν στάλθηκε. Ελέγξτε το κείμενο και δοκιμάστε ξανά.'
		);
		expect(doctorReviewsFailureText('invalid', 'report', 'el')).toBe(
			'Η αναφορά δεν στάλθηκε. Ελέγξτε το κείμενο και δοκιμάστε ξανά.'
		);
		expect(doctorReviewsFailureText('unknown', 'delete', 'el')).toBe(
			'Η διαγραφή δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(doctorReviewsFailureText('changed', 'reply', 'en')).toBe(
			'The reply changed in the meantime. Have another look and try again.'
		);
	});

	it('the review read alone keeps its state (the pages of a reply and of a report)', () => {
		expect(review(sampleReviewRow(1)).replyStatus).toBe('NONE');
	});
});
