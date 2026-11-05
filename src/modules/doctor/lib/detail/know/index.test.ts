import { describe, expect, it } from 'vitest';
import type { DoctorBookingPolicyFacts, DoctorProfile } from '$modules/doctor/api/profile';
import { sampleDoctorProfile } from '../detail.sample';
import type { DoctorKnowContent, DoctorKnowPage, DoctorLocation } from '../types';
import { buildDoctorKnowContent, isDoctorKnowPageId } from './index';

const nikis: DoctorBookingPolicyFacts = {
	confirmationMode: 'AUTO',
	cancellationCutoffHours: 4,
	minBookingNoticeHours: 1
};
const ermou: DoctorBookingPolicyFacts = {
	confirmationMode: 'MANUAL',
	cancellationCutoffHours: 8,
	minBookingNoticeHours: 2
};

const offices = (a?: DoctorBookingPolicyFacts, b?: DoctorBookingPolicyFacts, c = b) => [
	{ officeId: 'off-1', street: 'Nikis', streetNumber: '12', ...(a ? { bookingPolicy: a } : {}) },
	{ officeId: 'off-2', street: 'Ermou', streetNumber: '81', ...(b ? { bookingPolicy: b } : {}) },
	{
		officeId: 'off-3',
		street: 'Dimokratias',
		streetNumber: '5',
		...(c ? { bookingPolicy: c } : {})
	}
];

const location = {
	streetLine: 'Nikis 12',
	cityLine: 'Αθήνα',
	facilityRows: [],
	contactRows: [],
	paymentMethods: {
		title: 'Τρόποι πληρωμής',
		options: [
			{ id: 'cash', label: 'Μετρητά' },
			{ id: 'card', label: 'Κάρτα' }
		]
	}
} satisfies DoctorLocation;

function build(
	extra: Partial<DoctorProfile> = {},
	{
		activeOfficeId = 'off-1',
		phone = '210 1234567',
		dialNumber = '2101234567',
		locale = 'el'
	}: {
		activeOfficeId?: string;
		phone?: string;
		dialNumber?: string;
		locale?: 'el' | 'en';
	} = {}
): DoctorKnowContent {
	const content = buildDoctorKnowContent({
		doctor: sampleDoctorProfile({ offices: offices(nikis, ermou), ...extra }),
		activeOfficeId,
		location,
		phone,
		dialNumber,
		locale
	});
	if (!content) throw new Error('no section');
	return content;
}

const page = (content: DoctorKnowContent, id: 'cancel' | 'booking' | 'before'): DoctorKnowPage => {
	const found = content.pages[id];
	if (!found) throw new Error(`no page ${id}`);
	return found;
};
const rowIds = (found: DoctorKnowPage) =>
	found.groups.flatMap((group) => group.rows.map((row) => row.id));
const everyWord = (content: DoctorKnowContent) => JSON.stringify(content);

describe('buildDoctorKnowContent (U-75, U-76, screen 24)', () => {
	it('Π2: the three blocks and their lines, on the ONE active office', () => {
		const content = build();
		expect(content.title).toBe('Τι πρέπει να γνωρίζετε');
		expect(content.blocks).toEqual([
			{
				id: 'cancel',
				title: 'Πολιτική ακύρωσης',
				lines: [
					'Ακύρωση έως 4 ώρες πριν από το ραντεβού.',
					'Μετά, το ραντεβού δεν ακυρώνεται online.'
				]
			},
			{
				id: 'booking',
				title: 'Κράτηση και επιβεβαίωση',
				lines: ['Άμεση επιβεβαίωση.', 'Κράτηση τουλάχιστον 1 ώρα πριν.']
			},
			{
				id: 'before',
				title: 'Πριν από την επίσκεψη',
				lines: ['Υπενθύμιση 24 ώρες πριν, με email και ειδοποίηση.', 'Πληρωμή: Μετρητά, Κάρτα.']
			}
		]);
	});

	it('Π2: a `MANUAL` office says how soon, only when the server knows; a notice of `0` asks nothing', () => {
		const lines = (extra: Partial<DoctorProfile>) =>
			build(extra, { activeOfficeId: 'off-2' }).blocks[1]?.lines;
		expect(lines({ responseMetrics: { responseTimeId: 'within-hour' } })).toEqual([
			'Ο γιατρός επιβεβαιώνει το αίτημα, συνήθως εντός μίας ώρας.',
			'Κράτηση τουλάχιστον 2 ώρες πριν.'
		]);
		expect(lines({ offices: offices(nikis, { ...ermou, minBookingNoticeHours: 0 }) })).toEqual([
			'Ο γιατρός επιβεβαιώνει το αίτημα.'
		]);
	});

	it('🔴 U-76 (P-A §8.4): after the deadline the appointment is not cancelled online, the office’s phone is what is left', () => {
		const cancel = page(build(), 'cancel');
		const after = cancel.groups[0]?.rows.find((row) => row.id === 'cancel-after');
		expect(after?.label).toBe('Μετά το όριο, δεν ακυρώνεται online');
		expect(after?.sub).toBe('Επικοινωνήστε με το ιατρείο:');
		expect(after?.phone).toEqual({ label: '210 1234567', dialNumber: '2101234567' });
		expect(rowIds(cancel)).toEqual(
			expect.arrayContaining(['cancel-until', 'cancel-request', 'cancel-moved', 'change-until'])
		);
		expect(cancel.groups[1]?.rows[0]?.sub).toBe(
			'Έως 2 φορές για κάθε ραντεβού. Μετά το όριο, επικοινωνήστε με το ιατρείο.'
		);
	});

	it('U-76 (negative): an office without a phone is told, with nothing to press', () => {
		const after = page(build({}, { phone: '', dialNumber: '' }), 'cancel').groups[0]?.rows.find(
			(row) => row.id === 'cancel-after'
		);
		expect(after?.sub).toBe('Επικοινωνήστε με το ιατρείο.');
		expect(after).not.toHaveProperty('phone');
	});

	it('U-75.2: καμία χρέωση, και καμία «εκπρόθεσμη», in either language, on any page', () => {
		for (const locale of ['el', 'en'] as const) {
			for (const activeOfficeId of ['off-1', 'off-2']) {
				const words = everyWord(build({}, { locale, activeOfficeId })).toLowerCase();
				expect(words).not.toMatch(
					/χρέωσ|χρεών|εκπρόθεσμ|δωρεάν ακύρωση|charge|penalt|\blate\b|free cancel/u
				);
			}
		}
	});

	it('U-89.1: no video call or «online» consultation among its words (only the online cancellation)', () => {
		const words = everyWord(build());
		expect(words).not.toMatch(/βιντεοκλήσ|τηλεσυμβουλ/u);
	});

	it('Π4 / U-75.1 Ε4: the rules differ: the office’s line, and «Στα άλλα ιατρεία» grouped by value', () => {
		const content = build();
		expect(content.officeLine).toEqual([
			{ emphasis: false, text: 'Ισχύει για το ιατρείο ' },
			{ emphasis: true, text: 'Nikis 12' },
			{ emphasis: false, text: '.' }
		]);
		const other = page(content, 'cancel').groups.at(-1);
		expect(other?.heading).toBe('Στα άλλα ιατρεία');
		expect(other?.rows).toEqual([
			expect.objectContaining({
				label: 'Ermou 81 · Dimokratias 5',
				sub: 'Ακύρωση και αλλαγή ώρας έως 8 ώρες πριν'
			})
		]);
		expect(page(content, 'booking').groups.at(-1)?.rows[0]?.sub).toBe(
			'Ο γιατρός επιβεβαιώνει το αίτημα · κράτηση τουλάχιστον 2 ώρες πριν'
		);
		expect(
			page(content, 'cancel')
				.intro.map((run) => run.text)
				.join('')
		).toBe(
			'Ο γιατρός ορίζει έως πότε ακυρώνετε ή αλλάζετε την ώρα του ραντεβού. Ισχύει για το ιατρείο Nikis 12.'
		);
	});

	it('Ε4: the same rules everywhere: no line, no other offices', () => {
		const content = build({ offices: offices(nikis, nikis) });
		expect(content).not.toHaveProperty('officeLine');
		expect(page(content, 'cancel').groups.map((group) => group.heading)).not.toContain(
			'Στα άλλα ιατρεία'
		);
		expect(page(content, 'cancel').intro).toEqual([
			{
				emphasis: false,
				text: 'Ο γιατρός ορίζει έως πότε ακυρώνετε ή αλλάζετε την ώρα του ραντεβού.'
			}
		]);
	});

	it('Π4 (negative): rules the server did not send: no block about them, never an «8» of ours', () => {
		const content = build({ offices: offices() });
		expect(content.blocks.map((block) => block.id)).toEqual(['before']);
		expect(content.pages).not.toHaveProperty('cancel');
		expect(everyWord(content)).not.toMatch(/8 ώρες/u);
	});

	it('U-38: a doctor without services books nothing, so has no section', () => {
		expect(
			buildDoctorKnowContent({
				doctor: sampleDoctorProfile({ services: [] }),
				activeOfficeId: 'off-1',
				location,
				phone: undefined,
				dialNumber: undefined,
				locale: 'el'
			})
		).toBeUndefined();
	});

	it('U-75.3: «Πριν από την επίσκεψη» with what to bring, the approved text, after the rows', () => {
		const before = page(build(), 'before');
		expect(before.groups[0]?.rows.map((row) => row.id)).toEqual(['reminder', 'note', 'payment']);
		expect(before.groups[0]?.rows[2]?.sub).toBe('Μετρητά · Κάρτα');
		const bring = before.groups[1];
		expect(bring?.heading).toBe('Τι να έχετε μαζί σας');
		expect(bring?.intro).toBe(
			'Ένας γενικός οδηγός, ίδιος για όλα τα ιατρεία. Αν δεν είστε σίγουροι τι χρειάζεται για την επίσκεψή σας, ρωτήστε το ιατρείο.'
		);
		expect(bring?.rows.map((row) => [row.label, row.sub])).toEqual([
			['Ταυτότητα', 'Αστυνομική ταυτότητα ή διαβατήριο του ασθενή.'],
			['ΑΜΚΑ', 'Τον Αριθμό Μητρώου Κοινωνικής Ασφάλισης του ασθενή.'],
			[
				'Πρόσφατες εξετάσεις',
				'Αποτελέσματα, γνωματεύσεις ή απεικονίσεις που σχετίζονται με την επίσκεψη.'
			],
			['Λίστα φαρμάκων', 'Τα φάρμακα και τα συμπληρώματα που παίρνετε, με τη δόση τους.'],
			['Παραπεμπτικό', 'Αν έχετε παραπεμπτικό για αυτή την επίσκεψη.']
		]);
		expect(before.link.id).toBe('offices');
	});

	it('U-65.6: an office’s words stay text in the runs, they are never read as markup', () => {
		const content = build({
			offices: [
				{ officeId: 'off-1', street: '<img src=x>', bookingPolicy: nikis },
				{ officeId: 'off-2', street: 'Ermou', bookingPolicy: ermou }
			]
		});
		expect(content.officeLine?.find((run) => run.emphasis)?.text).toBe('<img src=x>');
	});

	it('a page’s id from an address: only the three', () => {
		expect(isDoctorKnowPageId('cancel')).toBe(true);
		expect(isDoctorKnowPageId('<x>')).toBe(false);
		expect(isDoctorKnowPageId(undefined)).toBe(false);
	});
});
