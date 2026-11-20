import { describe, expect, it } from 'vitest';
import {
	mapDoctorLanguageOptions,
	type DoctorLanguageOptionFacts
} from '$modules/doctor-dashboard/api/languages';
import { sampleLanguageOptionsView } from '$modules/doctor-dashboard/api/languages/languages.sample';
import {
	buildDoctorLanguagePick,
	buildDoctorLanguagesSummary,
	doctorLanguageMatches,
	doctorLanguageSearchWords,
	doctorLanguagesCountText,
	doctorLanguagesFailureText,
	doctorLanguagesLimitNote,
	sameDoctorLanguages,
	sortDoctorLanguages,
	toggleDoctorLanguage
} from './index';

/*
 * Wave 5.2 · screen 82 (U-211, U-112, D-W52-69): what the pages of the languages write and how the choice behaves —
 * pure. Lines of the server's own catalogue only.
 */

const catalogue = (lang: 'el' | 'en' = 'el'): DoctorLanguageOptionFacts[] =>
	mapDoctorLanguageOptions(sampleLanguageOptionsView(lang)) ?? [];
const names = (rows: readonly { label: string }[]) => rows.map((row) => row.label);
const pick = (
	input: Partial<Parameters<typeof buildDoctorLanguagePick>[0]> & { locale?: 'el' | 'en' } = {}
) =>
	buildDoctorLanguagePick({
		catalogue: catalogue(input.locale ?? 'el'),
		top: ['SL001', 'SL002'],
		chosen: ['SL001', 'SL002'],
		query: '',
		locale: 'el',
		...input
	});
// D-W52-69α: the two shapes of the page — no words (two lists) and words (one list).
const lists = (input: Parameters<typeof pick>[0] = {}) => {
	const made = pick(input);
	if (made.kind !== 'lists') throw new Error(`lists expected, got ${made.kind}`);
	return made;
};
const searched = (input: Parameters<typeof pick>[0] = {}) => {
	const made = pick(input);
	if (made.kind !== 'search') throw new Error(`search expected, got ${made.kind}`);
	return made;
};
const TEN = [
	'SL001',
	'SL002',
	'SL003',
	'SL010',
	'SL017',
	'SL036',
	'SL044',
	'SL050',
	'SL054',
	'SL067'
];

describe('sortDoctorLanguages (D-W52-69)', () => {
	it('🔴 U-211 / D-W52-69: Greek first, then by name as the page’s own language orders letters (`Intl.Collator`) — in Greek and in English, whatever order the server sent', () => {
		expect(sortDoctorLanguages(catalogue('el'), 'el').map((line) => line.name)).toEqual([
			'Ελληνικά',
			'Αγγλικά',
			'Αλβανικά',
			'Αραβικά',
			'Βουλγαρικά',
			'Γαλλικά',
			'Γερμανικά',
			'Εβραϊκά',
			'Ελληνική Νοηματική Γλώσσα',
			'Ισπανικά',
			'Ιταλικά',
			'Ουκρανικά',
			'Ρουμανικά',
			'Ρωσικά',
			'Τουρκικά'
		]);
		expect(sortDoctorLanguages(catalogue('en'), 'en').map((line) => line.name)).toEqual([
			'Greek',
			'Albanian',
			'Arabic',
			'Bulgarian',
			'English',
			'French',
			'German',
			'Greek Sign Language',
			'Hebrew',
			'Italian',
			'Romanian',
			'Russian',
			'Spanish',
			'Turkish',
			'Ukrainian'
		]);
		// The list handed in is not touched.
		const list = catalogue('el');
		const before = list.map((line) => line.code);
		sortDoctorLanguages(list, 'el');
		expect(list.map((line) => line.code)).toEqual(before);
		// An accent does not move a name: «Άλφα» stands with the «Α», not after «Ω».
		expect(
			sortDoctorLanguages(
				[
					{ code: 'SL900', name: 'Ωμέγα' },
					{ code: 'SL901', name: 'Άλφα' },
					{ code: 'SL902', name: 'Βήτα' }
				],
				'el'
			).map((line) => line.name)
		).toEqual(['Άλφα', 'Βήτα', 'Ωμέγα']);
	});
});

describe('the search of the catalogue (D-W52-69)', () => {
	const found = (query: string, lang: 'el' | 'en' = 'el') =>
		catalogue(lang)
			.filter((line) => doctorLanguageMatches(line, doctorLanguageSearchWords(query)))
			.map((line) => line.name);

	it('🔴 U-211 / D-W52-69: the search finds INSIDE a word and whatever the accents or the case, by the catalogue’s `normalized` — «γα» finds «Βουλγαρικά» and «Γαλλικά»', () => {
		expect(found('γα')).toEqual(['Βουλγαρικά', 'Γαλλικά']);
		expect(found('ΓΑΛΛΙΚΆ')).toEqual(['Γαλλικά']);
		expect(found('γαλλικά')).toEqual(['Γαλλικά']);
		expect(found('γαλλικα')).toEqual(['Γαλλικά']);
		expect(found('εβραϊ')).toEqual(['Εβραϊκά']);
		expect(found('εβραι')).toEqual(['Εβραϊκά']);
		expect(found('νοημ')).toEqual(['Ελληνική Νοηματική Γλώσσα']);
		expect(found('ελλην')).toEqual(['Ελληνικά', 'Ελληνική Νοηματική Γλώσσα']);
		// Every word typed must be somewhere in the name, in any order.
		expect(found('γλωσσα ελληνικη')).toEqual(['Ελληνική Νοηματική Γλώσσα']);
		expect(found('ελληνικη ρωσ')).toEqual([]);
		// A final sigma typed in the middle of a word is still the same letter.
		expect(found('ρως')).toEqual(['Ρωσικά']);
		expect(found('  γα  ')).toEqual(['Βουλγαρικά', 'Γαλλικά']);
		expect(found('zz')).toEqual([]);
		// On the English page the catalogue is the English one.
		expect(found('AN', 'en')).toEqual([
			'German',
			'Bulgarian',
			'Spanish',
			'Greek Sign Language',
			'Italian',
			'Romanian',
			'Russian',
			'Albanian',
			'Ukrainian'
		]);
		expect(found('γα', 'en')).toEqual([]);
	});

	it('🔴 D-W52-69: no words is no search — every language answers', () => {
		expect(doctorLanguageSearchWords('')).toEqual([]);
		expect(doctorLanguageSearchWords('   ')).toEqual([]);
		expect(found('')).toHaveLength(15);
	});

	it('🔴 U-65.6 (negative): what is typed is words to compare, never a pattern — `.*`, `(`, `[`, markup and a backslash find nothing and break nothing', () => {
		for (const query of ['.*', '(', '[α-ω]', '\\', '<b>γα</b>', '%', "' OR 1=1 --", '\u202Eγα']) {
			expect(found(query), query).toEqual([]);
		}
	});
});

describe('buildDoctorLanguagePick (D-W52-69, U-112)', () => {
	it('🔴 U-211 / D-W52-69: «Οι γλώσσες σας» — the doctor’s own, Greek first — over «Όλες οι γλώσσες», every other one, Greek first and then by name; no language twice', () => {
		const made = lists({ top: ['SL002', 'SL001'] });
		expect(names(made.yours)).toEqual(['Ελληνικά', 'Αγγλικά']);
		expect(names(made.all)).toEqual([
			'Αλβανικά',
			'Αραβικά',
			'Βουλγαρικά',
			'Γαλλικά',
			'Γερμανικά',
			'Εβραϊκά',
			'Ελληνική Νοηματική Γλώσσα',
			'Ισπανικά',
			'Ιταλικά',
			'Ουκρανικά',
			'Ρουμανικά',
			'Ρωσικά',
			'Τουρκικά'
		]);
		expect(made).not.toHaveProperty('none');
		expect([...made.yours, ...made.all].map((row) => row.value)).toHaveLength(15);
		expect(made.yours[0]).toEqual({ value: 'SL001', label: 'Ελληνικά', disabled: false });
		// A doctor without a language: no «Οι γλώσσες σας», and Greek leads «Όλες οι γλώσσες».
		const empty = lists({ top: [], chosen: [] });
		expect(empty.yours).toEqual([]);
		expect(names(empty.all).slice(0, 2)).toEqual(['Ελληνικά', 'Αγγλικά']);
	});

	it('🔴 D-W52-69 (`82-langs.html`): «Οι γλώσσες σας» keep their place while the page is open — a tick taken out leaves the row where it is, and a language chosen further down stays where it was pressed', () => {
		const made = lists({ chosen: ['SL001', 'SL044'] });
		expect(names(made.yours)).toEqual(['Ελληνικά', 'Αγγλικά']);
		expect(names(made.all)).toContain('Γαλλικά');
	});

	it('🔴 D-W52-69α (`sw.js` `slPickPage`, `82-langs/shots/m-find.png`): with words, ONE list without a heading — every language of the catalogue that answers them, Greek first and then by name; a chosen one that answers is IN it, one that does not is NOT', () => {
		// D-W52-69α: was «a search narrows «Όλες οι γλώσσες» and NEVER hides «Οι γλώσσες σας»».
		const made = searched({ query: 'γα' });
		expect(names(made.found)).toEqual(['Βουλγαρικά', 'Γαλλικά']);
		expect(made.none).toBeNull();
		expect(made).not.toHaveProperty('yours');
		expect(made).not.toHaveProperty('all');
		// The doctor's own (chosen) do not answer «γα»: they are not in the list.
		expect(made.found.map((row) => row.value)).not.toContain('SL001');
		expect(made.found.map((row) => row.value)).not.toContain('SL002');
		// A chosen one that answers is in the ONE list, among the others, as a row like them (the page ticks it).
		const own = searched({ query: 'ελλην' });
		expect(own.found).toEqual([
			{ value: 'SL001', label: 'Ελληνικά', disabled: false },
			{ value: 'SL050', label: 'Ελληνική Νοηματική Γλώσσα', disabled: false }
		]);
		// A language chosen on the page answers as any other — it joins nothing.
		expect(names(searched({ chosen: ['SL001', 'SL044'], query: 'γαλ' }).found)).toEqual([
			'Γαλλικά'
		]);
		expect(names(searched({ chosen: ['SL001', 'SL044'], query: 'ρωσ' }).found)).toEqual(['Ρωσικά']);
		// Greek first under words too, then by name — in Greek and in English.
		expect(names(searched({ query: 'ικα' }).found).slice(0, 3)).toEqual([
			'Ελληνικά',
			'Αγγλικά',
			'Αλβανικά'
		]);
		expect(names(searched({ query: 'E', locale: 'en', catalogue: catalogue('en') }).found)).toEqual(
			['Greek', 'English', 'French', 'German', 'Greek Sign Language', 'Hebrew']
		);
		// No words is no search: the two lists again.
		expect(pick({ query: '   ' }).kind).toBe('lists');
		expect(pick({ query: '' }).kind).toBe('lists');
	});

	it('🔴 U-140 / D-W52-69 / 69α: «Καμία γλώσσα με «…».» when the words find NO language — the words as typed, trimmed, as plain text', () => {
		expect(pick({ query: ' zz ' })).toEqual({
			kind: 'search',
			found: [],
			none: 'Καμία γλώσσα με «zz».'
		});
		// D-W52-69α: words that find only one of the doctor's own show it, ticked, in the one list — nothing says «Καμία».
		const own = searched({ query: 'αγγλ' });
		expect(own.found).toEqual([{ value: 'SL002', label: 'Αγγλικά', disabled: false }]);
		expect(own.none).toBeNull();
		expect(searched({ query: '<b>x</b>' }).none).toBe('Καμία γλώσσα με «<b>x</b>».');
		expect(searched({ query: 'zz', locale: 'en', catalogue: catalogue('en') }).none).toBe(
			'No language with “zz”.'
		);
		expect(lists({ query: '   ' })).not.toHaveProperty('none');
	});

	it('🔴 U-211 / D-W52-69 / 69α: at ten every row that is not chosen goes out, in both lists and in the one list of a search; the chosen ones never do', () => {
		const made = lists({ top: ['SL001', 'SL002'], chosen: TEN });
		const rows = [...made.yours, ...made.all];
		expect(
			rows
				.filter((row) => !row.disabled)
				.map((row) => row.value)
				.sort()
		).toEqual([...TEN].sort());
		expect(rows.filter((row) => row.disabled)).toHaveLength(5);
		const below = lists({ chosen: TEN.slice(0, 9) });
		expect([...below.yours, ...below.all].some((row) => row.disabled)).toBe(false);
		// D-W52-69α: under words the chosen that answer are in the same list, and they are not held back.
		const found = searched({ chosen: TEN, query: 'ρ' }).found;
		expect(found.filter((row) => row.disabled).map((row) => row.label)).toEqual([
			'Ουκρανικά',
			'Ρουμανικά',
			'Ρωσικά',
			'Τουρκικά'
		]);
		expect(found.filter((row) => !row.disabled).map((row) => row.label)).toEqual([
			'Αραβικά',
			'Βουλγαρικά',
			'Γερμανικά',
			'Εβραϊκά'
		]);
	});
});

describe('the choice (D-W52-69)', () => {
	it('🔴 U-211 / D-W52-69 (negative): never an eleventh — a press on another language at ten changes nothing; a chosen one always goes out', () => {
		expect(toggleDoctorLanguage(['SL001'], 'SL002')).toEqual(['SL001', 'SL002']);
		expect(toggleDoctorLanguage(['SL001', 'SL002'], 'SL001')).toEqual(['SL002']);
		expect(toggleDoctorLanguage(TEN, 'SL125')).toEqual(TEN);
		expect(toggleDoctorLanguage(TEN, 'SL001')).toEqual(TEN.slice(1));
		expect(toggleDoctorLanguage(TEN.slice(0, 9), 'SL125')).toEqual([...TEN.slice(0, 9), 'SL125']);
	});

	it('D-W52-69: the same codes in any order are the same choice', () => {
		expect(sameDoctorLanguages(['SL001', 'SL002'], ['SL002', 'SL001'])).toBe(true);
		expect(sameDoctorLanguages(['SL001'], ['SL001', 'SL002'])).toBe(false);
		expect(sameDoctorLanguages(['SL001', 'SL003'], ['SL001', 'SL002'])).toBe(false);
		expect(sameDoctorLanguages([], [])).toBe(true);
	});

	it('🔴 U-140 · D-W52-59α / D-W52-69: «N από 10» under the lists; at ten «Διαλέξατε 10. Για να διαλέξετε άλλη, βγάλτε μία.» for the bar — nothing below it — word for word, in both languages', () => {
		expect(doctorLanguagesCountText(0, 'el')).toBe('0 από 10');
		expect(doctorLanguagesCountText(2, 'el')).toBe('2 από 10');
		expect(doctorLanguagesCountText(10, 'el')).toBe('10 από 10');
		expect(doctorLanguagesCountText(2, 'en')).toBe('2 of 10');
		expect(doctorLanguagesLimitNote(9, 'el')).toBe('');
		expect(doctorLanguagesLimitNote(10, 'el')).toBe(
			'Διαλέξατε 10. Για να διαλέξετε άλλη, βγάλτε μία.'
		);
		expect(doctorLanguagesLimitNote(11, 'el')).toBe(
			'Διαλέξατε 10. Για να διαλέξετε άλλη, βγάλτε μία.'
		);
		expect(doctorLanguagesLimitNote(10, 'en')).toBe('You picked 10. To pick another, remove one.');
	});
});

describe('the row of screen 82 and the refusals (D-W52-69)', () => {
	it('🔴 U-140 / D-W52-69: «Ελληνικά, Αγγλικά» over «2 γλώσσες»; «1 γλώσσα»; Greek first whatever order came; none ⇒ `null` — in both languages', () => {
		const languages = [
			{ code: 'SL044', name: 'Γαλλικά' },
			{ code: 'SL002', name: 'Αγγλικά' },
			{ code: 'SL001', name: 'Ελληνικά' }
		];
		expect(buildDoctorLanguagesSummary(languages, 'el')).toEqual({
			names: 'Ελληνικά, Αγγλικά, Γαλλικά',
			count: '3 γλώσσες'
		});
		expect(buildDoctorLanguagesSummary(languages.slice(2), 'el')).toEqual({
			names: 'Ελληνικά',
			count: '1 γλώσσα'
		});
		expect(buildDoctorLanguagesSummary([], 'el')).toBeNull();
		expect(
			buildDoctorLanguagesSummary(
				[
					{ code: 'SL002', name: 'English' },
					{ code: 'SL001', name: 'Greek' }
				],
				'en'
			)
		).toEqual({ names: 'Greek, English', count: '2 languages' });
		expect(buildDoctorLanguagesSummary([{ code: 'SL001', name: 'Greek' }], 'en')?.count).toBe(
			'1 language'
		);
	});

	it('🔴 D-W52-69: the page’s words for a refused save — past ten, a catalogue that changed, too many writes, and «δεν αποθηκεύτηκε» for the rest', () => {
		expect(doctorLanguagesFailureText('invalid', 'el')).toBe(
			'Διαλέξατε 10. Για να διαλέξετε άλλη, βγάλτε μία.'
		);
		expect(doctorLanguagesFailureText('not-in-catalogue', 'el')).toBe(
			'Ο κατάλογος άλλαξε. Διαλέξτε ξανά και αποθηκεύστε.'
		);
		expect(doctorLanguagesFailureText('rate-limited', 'el')).toBe(
			'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		);
		for (const reason of ['conflict', 'forbidden', 'unknown'] as const) {
			expect(doctorLanguagesFailureText(reason, 'el')).toBe(
				'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
			);
		}
	});
});
