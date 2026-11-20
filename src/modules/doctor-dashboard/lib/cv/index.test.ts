import { describe, expect, it } from 'vitest';
import type {
	DoctorCredentialFacts,
	DoctorCredentialItem
} from '$modules/doctor-dashboard/api/credentials';
import { mapDoctorCredentials } from '$modules/doctor-dashboard/api/credentials';
import {
	sampleCredentialGroup,
	sampleCredentialId,
	sampleCredentialsView
} from '$modules/doctor-dashboard/api/credentials/credentials.sample';
import {
	buildDoctorCvGroups,
	doctorCredentialError,
	doctorCredentialLastYear,
	doctorCredentialMessages,
	doctorCredentialRemoved,
	doctorCredentialSaved,
	doctorCredentialsFailureText,
	doctorCredentialTexts,
	doctorCredentialYears,
	doctorCvLimitText,
	emptyDoctorCredentialValues,
	isDoctorCredentialValid,
	keepDoctorCredentialYearInput,
	toDoctorCredentialItem,
	toDoctorCredentialValues,
	type DoctorCredentialValues
} from './index';

/*
 * Wave 5.2 · screen 81 «Βιογραφικό» (U-210, D-W52-63): what the page and the page of one row say and send — pure, the
 * words of `81-cv.html` word for word (U-140).
 */

const LAST = 2027;
const facts = () => mapDoctorCredentials(sampleCredentialsView()) as DoctorCredentialFacts[];
const values = (more: Partial<DoctorCredentialValues> = {}): DoctorCredentialValues => ({
	...emptyDoctorCredentialValues(),
	title: 'Επιμελήτρια',
	...more
});
const item = (title: string, more: Partial<DoctorCredentialItem> = {}): DoctorCredentialItem => ({
	title,
	organization: null,
	startYear: null,
	endYear: null,
	isCurrent: false,
	...more
});

describe('the groups of «Βιογραφικό» (D-W52-63)', () => {
	it('🔴 U-210 · D-W52-63: three groups, «Σπουδές · Εμπειρία · Συνέδρια», each row «τίτλος» over «φορέας · έτη», in the order the SERVER answered', () => {
		const groups = buildDoctorCvGroups(facts(), 'el');
		expect(groups.map((group) => [group.kind, group.label])).toEqual([
			['STUDY', 'Σπουδές'],
			['WORK', 'Εμπειρία'],
			['CONFERENCE', 'Συνέδρια']
		]);
		expect(groups.map((group) => group.rows.map((row) => [row.title, row.detail]))).toEqual([
			[
				['Ειδικότητα Καρδιολογίας', 'Γενικό Νοσοκομείο Αθηνών · 2008 – 2013'],
				['Πτυχίο Ιατρικής', 'Ιατρική Σχολή Αθηνών · 2001 – 2007']
			],
			[
				['Καρδιολόγος, ιδιωτικό ιατρείο', 'Κηφισιά · 2015 – σήμερα'],
				['Επιμελήτρια Καρδιολογικής Κλινικής', 'Γενικό Νοσοκομείο Αθηνών · 2013 – 2015'],
				['Ιατρός υπηρεσίας υπαίθρου', 'Κέντρο Υγείας Καρύστου · 2007 – 2008']
			],
			[['Πανελλήνιο Καρδιολογικό Συνέδριο', 'Ελληνική Καρδιολογική Εταιρεία · 2025']]
		]);
		expect(groups.every((group) => !group.full)).toBe(true);
		// 🔴 No sorting on the client: an order the server chose is the page's, whatever it is.
		const turned = [...facts()].reverse();
		expect(buildDoctorCvGroups(turned, 'el')[1].rows.map((row) => row.id)).toEqual(
			turned.filter((row) => row.kind === 'WORK').map((row) => row.id)
		);
	});

	it('🔴 U-210 · D-W52-63: an empty biography still has its three groups — «Καμία ακόμη.», «Καμία ακόμη.», «Κανένα ακόμη.»', () => {
		const groups = buildDoctorCvGroups([], 'el');
		expect(groups.map((group) => [group.label, group.none, group.rows.length, group.full])).toEqual(
			[
				['Σπουδές', 'Καμία ακόμη.', 0, false],
				['Εμπειρία', 'Καμία ακόμη.', 0, false],
				['Συνέδρια', 'Κανένα ακόμη.', 0, false]
			]
		);
		expect(buildDoctorCvGroups([], 'en').map((group) => [group.label, group.none])).toEqual([
			['Studies', 'None yet.'],
			['Experience', 'None yet.'],
			['Conferences', 'None yet.']
		]);
	});

	it('🔴 U-210 · D-W52-63: a group is full at TWENTY — at nineteen it is not, and only that group; «Έως 20.»', () => {
		const group = (count: number) =>
			buildDoctorCvGroups(
				mapDoctorCredentials(sampleCredentialGroup('WORK', count)) as DoctorCredentialFacts[],
				'el'
			);
		expect(group(19).map((entry) => entry.full)).toEqual([false, false, false]);
		expect(group(20).map((entry) => entry.full)).toEqual([false, true, false]);
		expect(doctorCvLimitText('el')).toBe('Έως 20.');
		expect(doctorCvLimitText('en')).toBe('Up to 20.');
	});

	it('D-W52-63: the years as the public page writes them — «2013 – 2015», «2015 – σήμερα», one year alone, none; a line with neither organization nor year has no second line', () => {
		const years = (startYear: number | null, endYear: number | null, isCurrent = false) =>
			doctorCredentialYears({ startYear, endYear, isCurrent }, 'el');
		expect(years(2013, 2015)).toBe('2013 – 2015');
		expect(years(2015, null, true)).toBe('2015 – σήμερα');
		expect(years(2025, null)).toBe('2025');
		expect(years(2015, 2015)).toBe('2015');
		expect(years(null, null)).toBeNull();
		expect(doctorCredentialYears({ startYear: 2015, endYear: null, isCurrent: true }, 'en')).toBe(
			'2015 – present'
		);
		const bare = buildDoctorCvGroups(
			[{ ...item('Μόνο τίτλος'), id: sampleCredentialId(1), kind: 'STUDY', position: 0 }],
			'el'
		);
		expect(bare[0].rows).toEqual([
			{ id: sampleCredentialId(1), title: 'Μόνο τίτλος', detail: null }
		]);
	});
});

describe('the page of one row: its words (U-140, `81-cv.html`)', () => {
	it('🔴 U-210 · D-W52-63: «Τίτλος · Ίδρυμα · Σε εξέλιξη», «Θέση · Φορέας · Εργάζομαι εδώ σήμερα», «Συνέδριο · Διοργανωτής» without a tick — each with its example', () => {
		expect(doctorCredentialTexts('STUDY', 'el')).toEqual({
			heading: 'Σπουδές',
			title: 'Τίτλος',
			titleExample: 'π.χ. Πτυχίο Ιατρικής',
			organization: 'Ίδρυμα (προαιρετικό)',
			organizationExample: 'π.χ. Ιατρική Σχολή Αθηνών',
			current: 'Σε εξέλιξη'
		});
		expect(doctorCredentialTexts('WORK', 'el')).toEqual({
			heading: 'Εμπειρία',
			title: 'Θέση',
			titleExample: 'π.χ. Επιμελήτρια Καρδιολογικής Κλινικής',
			organization: 'Φορέας (προαιρετικό)',
			organizationExample: 'π.χ. Γενικό Νοσοκομείο Αθηνών',
			current: 'Εργάζομαι εδώ σήμερα'
		});
		expect(doctorCredentialTexts('CONFERENCE', 'el')).toEqual({
			heading: 'Συνέδριο',
			title: 'Συνέδριο',
			titleExample: 'π.χ. Πανελλήνιο Καρδιολογικό Συνέδριο',
			organization: 'Διοργανωτής (προαιρετικό)',
			organizationExample: 'π.χ. Ελληνική Καρδιολογική Εταιρεία',
			current: null
		});
		expect(doctorCredentialTexts('WORK', 'en').current).toBe('I work here today');
	});

	it('🔴 U-210 · D-W52-63: the words of every rule, word for word', () => {
		expect(doctorCredentialMessages('STUDY', 'el', LAST)).toEqual({
			title: { required: 'Γράψτε τον τίτλο.' },
			startYear: { year: 'Γράψτε έτος από 1950 έως 2027.', since: 'Γράψτε από πότε.' },
			endYear: {
				year: 'Γράψτε έτος από 1950 έως 2027.',
				fromNeeded: 'Γράψτε και το «Από».',
				order: 'Το «Έως» δεν μπορεί να είναι πριν από το «Από».'
			}
		});
		expect(doctorCredentialMessages('WORK', 'el', LAST).title.required).toBe('Γράψτε τη θέση.');
		expect(doctorCredentialMessages('CONFERENCE', 'el', LAST).title.required).toBe(
			'Γράψτε το συνέδριο.'
		);
		expect(doctorCredentialMessages('WORK', 'en', 2030).startYear.year).toBe(
			'Enter a year from 1950 to 2030.'
		);
	});
});

describe('the page of one row: the server’s rules, said before the save (U-65.6)', () => {
	const errors = (
		kind: 'STUDY' | 'WORK' | 'CONFERENCE',
		typed: Partial<DoctorCredentialValues>
	) => ({
		title: doctorCredentialError('title', kind, values(typed), LAST),
		startYear: doctorCredentialError('startYear', kind, values(typed), LAST),
		endYear: doctorCredentialError('endYear', kind, values(typed), LAST)
	});
	const clean = { title: null, startYear: null, endYear: null };

	it('🔴 U-210 · D-W52-63: the title is needed; the years are optional', () => {
		expect(errors('WORK', {})).toEqual(clean);
		expect(errors('WORK', { title: '   ' })).toEqual({ ...clean, title: 'required' });
		expect(errors('WORK', { startYear: '2013' })).toEqual(clean);
		expect(errors('WORK', { startYear: '2013', endYear: '2015' })).toEqual(clean);
		expect(errors('WORK', { startYear: '2015', endYear: '2015' })).toEqual(clean);
	});

	it('🔴 U-210 · D-W52-63: a year is four digits from 1950 to NEXT year — one before, one after, three digits, a letter are refused', () => {
		for (const year of ['1950', '2027', '2000']) {
			expect(errors('WORK', { startYear: year, endYear: '2027' }), year).toEqual(clean);
		}
		for (const year of ['1949', '2028', '195', '20a5', '0', '-200', '2 15', '１９９９']) {
			expect(errors('WORK', { startYear: year }).startYear, year).toBe('year');
			expect(errors('WORK', { startYear: '1950', endYear: year }).endYear, year).toBe('year');
		}
	});

	it('🔴 U-210 · D-W52-63: «Έως» needs «Από» and is not before it', () => {
		expect(errors('WORK', { endYear: '2015' })).toEqual({ ...clean, endYear: 'fromNeeded' });
		expect(errors('WORK', { startYear: '2013', endYear: '2012' })).toEqual({
			...clean,
			endYear: 'order'
		});
		// A broken «Από» says its own rule; «Έως» says nothing about it until then (`sw.js` `cvErrs`).
		expect(errors('WORK', { startYear: '1900', endYear: '2012' })).toEqual({
			...clean,
			startYear: 'year'
		});
	});

	it('🔴 U-210 · D-W52-63: «σήμερα» needs «Από» and has no «Έως» — what was typed there is not read; a conference has ONE year and is never «σήμερα»', () => {
		expect(errors('WORK', { isCurrent: true })).toEqual({ ...clean, startYear: 'since' });
		expect(errors('STUDY', { isCurrent: true, startYear: '2024' })).toEqual(clean);
		expect(errors('WORK', { isCurrent: true, startYear: '2015', endYear: '1900' })).toEqual(clean);
		// A conference: the tick and an end left in the values count for nothing.
		expect(errors('CONFERENCE', { isCurrent: true })).toEqual(clean);
		expect(errors('CONFERENCE', { startYear: '2025', endYear: 'x', isCurrent: true })).toEqual(
			clean
		);
		expect(errors('CONFERENCE', { startYear: '2029' })).toEqual({ ...clean, startYear: 'year' });
		expect(isDoctorCredentialValid('WORK', values({ isCurrent: true }), LAST)).toBe(false);
		expect(isDoctorCredentialValid('WORK', values({ startYear: '2015' }), LAST)).toBe(true);
	});

	it('D-W52-63: the last year is NEXT year on the platform’s calendar — in Athens the year turns two hours before UTC’s', () => {
		expect(doctorCredentialLastYear(Date.parse('2026-11-18T12:00:00Z'))).toBe(2027);
		expect(doctorCredentialLastYear(Date.parse('2026-12-31T21:59:59Z'))).toBe(2027);
		expect(doctorCredentialLastYear(Date.parse('2026-12-31T22:00:00Z'))).toBe(2028);
	});

	it('U-65.6: a year’s field keeps its digits alone, four at most', () => {
		expect(keepDoctorCredentialYearInput('2015')).toBe('2015');
		expect(keepDoctorCredentialYearInput('20a1b5')).toBe('2015');
		expect(keepDoctorCredentialYearInput('201567')).toBe('2015');
		expect(keepDoctorCredentialYearInput(' -2e3 ')).toBe('23');
		expect(keepDoctorCredentialYearInput('<b>')).toBe('');
	});
});

describe('the page of one row: what «Αποθήκευση» sends (D-W52-61 / 63)', () => {
	it('🔴 D-W52-63: the row field by field — texts trimmed, an empty organization `null`, years as numbers; under «σήμερα» no end; a conference ONE year as its start and never «σήμερα»', () => {
		expect(
			toDoctorCredentialItem(
				'WORK',
				values({
					title: '  Επιμελήτρια  ',
					organization: '  Νοσοκομείο ',
					startYear: '2013',
					endYear: '2015'
				}),
				LAST
			)
		).toEqual({
			title: 'Επιμελήτρια',
			organization: 'Νοσοκομείο',
			startYear: 2013,
			endYear: 2015,
			isCurrent: false
		});
		expect(
			toDoctorCredentialItem(
				'WORK',
				values({ organization: '  ', startYear: '2015', endYear: '2016', isCurrent: true }),
				LAST
			)
		).toEqual({
			title: 'Επιμελήτρια',
			organization: null,
			startYear: 2015,
			endYear: null,
			isCurrent: true
		});
		expect(
			toDoctorCredentialItem(
				'CONFERENCE',
				values({ startYear: '2025', endYear: '2026', isCurrent: true }),
				LAST
			)
		).toEqual({
			title: 'Επιμελήτρια',
			organization: null,
			startYear: 2025,
			endYear: null,
			isCurrent: false
		});
		expect(toDoctorCredentialItem('STUDY', values(), LAST)).toEqual(item('Επιμελήτρια'));
	});

	it('🔴 U-65.6 (negative): nothing is made of a page that breaks a rule, and a text never leaves longer than the server keeps', () => {
		for (const broken of [
			{ title: '' },
			{ startYear: '1949' },
			{ endYear: '2015' },
			{ startYear: '2015', endYear: '2014' },
			{ isCurrent: true }
		]) {
			expect(
				toDoctorCredentialItem('WORK', values(broken), LAST),
				JSON.stringify(broken)
			).toBeNull();
		}
		const long = toDoctorCredentialItem(
			'WORK',
			values({ title: 'τ'.repeat(400), organization: 'φ'.repeat(400) }),
			LAST
		);
		expect(long?.title).toHaveLength(300);
		expect(long?.organization).toHaveLength(200);
	});

	it('D-W52-63: the page of a row that exists opens with the row as the server keeps it; a new one empty (U-214: nothing is filled in)', () => {
		expect(
			toDoctorCredentialValues(
				item('Καρδιολόγος', { organization: 'Κηφισιά', startYear: 2015, isCurrent: true })
			)
		).toEqual({
			title: 'Καρδιολόγος',
			organization: 'Κηφισιά',
			startYear: '2015',
			endYear: '',
			isCurrent: true
		});
		expect(toDoctorCredentialValues(item('Συνέδριο', { startYear: 2025 }))).toEqual({
			title: 'Συνέδριο',
			organization: '',
			startYear: '2025',
			endYear: '',
			isCurrent: false
		});
		expect(emptyDoctorCredentialValues()).toEqual({
			title: '',
			organization: '',
			startYear: '',
			endYear: '',
			isCurrent: false
		});
	});

	const written = () =>
		facts()
			.filter((row) => row.kind === 'WORK')
			.sort((one, other) => one.position - other.position);
	const titles = (outcome: ReturnType<ReturnType<typeof doctorCredentialSaved>>) =>
		'items' in outcome ? outcome.items.map((entry) => entry.title) : outcome.refusal;

	it('🔴 U-210 · D-W52-63: a save is the WHOLE group — the changed row in its own place, a new one last, every other row as the server has it', () => {
		const changed = doctorCredentialSaved(sampleCredentialId(4), item('Διευθύντρια'))(written());
		expect(titles(changed)).toEqual([
			'Ιατρός υπηρεσίας υπαίθρου',
			'Διευθύντρια',
			'Καρδιολόγος, ιδιωτικό ιατρείο'
		]);
		expect('items' in changed && changed.items[2]).toEqual({
			title: 'Καρδιολόγος, ιδιωτικό ιατρείο',
			organization: 'Κηφισιά',
			startYear: 2015,
			endYear: null,
			isCurrent: true
		});
		expect(titles(doctorCredentialSaved(null, item('Νέα θέση'))(written()))).toEqual([
			'Ιατρός υπηρεσίας υπαίθρου',
			'Επιμελήτρια Καρδιολογικής Κλινικής',
			'Καρδιολόγος, ιδιωτικό ιατρείο',
			'Νέα θέση'
		]);
		expect(titles(doctorCredentialSaved(null, item('Πρώτη'))([]))).toEqual(['Πρώτη']);
		expect(titles(doctorCredentialRemoved(sampleCredentialId(4))(written()))).toEqual([
			'Ιατρός υπηρεσίας υπαίθρου',
			'Καρδιολόγος, ιδιωτικό ιατρείο'
		]);
		expect(titles(doctorCredentialRemoved(sampleCredentialId(6))([facts()[5]]))).toEqual([]);
	});

	it('🔴 U-210 · D-W52-63 (negative): no group is made for a row that is no longer there, nor a twenty-first row', () => {
		const other = sampleCredentialId(99);
		expect(titles(doctorCredentialSaved(other, item('Χ'))(written()))).toBe('gone');
		expect(titles(doctorCredentialRemoved(other)(written()))).toBe('gone');
		const twenty = mapDoctorCredentials(
			sampleCredentialGroup('WORK', 20)
		) as DoctorCredentialFacts[];
		expect(titles(doctorCredentialSaved(null, item('21η'))(twenty))).toBe('full');
		expect(titles(doctorCredentialSaved(null, item('20ή'))(twenty.slice(0, 19)))).toHaveLength(20);
		// A change of a row of a full group is no addition.
		expect(titles(doctorCredentialSaved(twenty[0].id, item('Άλλη'))(twenty))).toHaveLength(20);
	});
});

describe('the words of a save that did not happen (D-W52-63)', () => {
	it('🔴 D-W52-63: 422, 429, 409 and the rest — the page’s words, in both languages', () => {
		const failed = 'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.';
		expect(doctorCredentialsFailureText('invalid', 'el')).toBe(
			'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τον τίτλο και τα έτη και δοκιμάστε ξανά.'
		);
		expect(doctorCredentialsFailureText('rate-limited', 'el')).toBe(
			'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		);
		expect(doctorCredentialsFailureText('conflict', 'el')).toBe(failed);
		expect(doctorCredentialsFailureText('forbidden', 'el')).toBe(failed);
		expect(doctorCredentialsFailureText('unknown', 'el')).toBe(failed);
		expect(doctorCredentialsFailureText('gone', 'el')).toBe('Αυτή η γραμμή δεν υπάρχει πια.');
		expect(doctorCredentialsFailureText('full', 'el')).toBe('Έως 20.');
		expect(doctorCredentialsFailureText('invalid', 'en')).toBe(
			'The change was not saved. Check the title and the years and try again.'
		);
	});
});
