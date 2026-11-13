import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectRoot, readSourceFiles, stripComments, type SourceFile } from './source-scan';

/**
 * 🔴 U-173 (wave 4.5, cards w45-w8; D-W45-53, D-W45-54; the owner: «δεν θα λέμε αλλού κριτικές αλλού αξιολογήσεις,
 * παντού θα είναι το ίδιο … προφανώς και στα νομικά»): ONE word for what a patient writes about a visit — «κριτική /
 * κριτικές», “review” in English. Read where the site keeps its words: the Greek catalog, key by key, and every string
 * a component, a story or a helper of `src/` writes by hand (comments are not read). «Βαθμολογία» — the number with
 * the stars — stays, and so does the English of the stars and of a percentage (“Rating”, “Rated {score} out of 5”,
 * “Highest rated first”, “Response rate”). Names (keys, addresses `/ratings/…`, types, `data-testid`) are not words.
 */
type Catalog = Record<string, string>;

const OLD_WORD = /ξιολ[οό]γ|ΞΙΟΛ[ΟΌ]Γ/u;
/** The English that called a review a “rating” (D-W45-53; the card's three first). */
const OLD_ENGLISH = [
	'rating invitation',
	'new ratings',
	'rate your visit',
	'rate this visit',
	'rate the visit',
	'rating the visit',
	'your rating',
	'receive ratings',
	'rating overview',
	'been rated',
	'rate a visit'
];

const readCatalog = (locale: 'el' | 'en'): Catalog =>
	JSON.parse(readFileSync(join(projectRoot, `messages/${locale}.json`), 'utf8')) as Catalog;

/** Every key of the Greek catalog that says the old word, and every English one that says a review is a rating. */
function findCatalogIssues(el: Catalog, en: Catalog): string[] {
	const issues: string[] = [];
	for (const [key, text] of Object.entries(el)) {
		if (OLD_WORD.test(text)) issues.push(`el ${key}: the old word (U-173)`);
	}
	for (const [key, text] of Object.entries(en)) {
		const lower = text.toLowerCase();
		for (const phrase of OLD_ENGLISH) {
			if (lower.includes(phrase)) issues.push(`en ${key}: “${phrase}” (U-173)`);
		}
	}
	return issues;
}

/** Every line of a source file whose own text (a string, markup — never a comment) says the old word. */
function findSourceIssues(files: SourceFile[]): string[] {
	return files.flatMap((file) =>
		file.text
			.split('\n')
			.flatMap((line, index) =>
				OLD_WORD.test(line) ? [`${file.path}:${index + 1}: the old word (U-173)`] : []
			)
	);
}

/** D-W45-53, line by line: the web's keys of the table, the same words as the application's and the server's. */
const D_W45_53: Record<string, { el: string; en: string }> = {
	appointments_list_rate: { el: 'Γράψτε κριτική για την επίσκεψη', en: 'Review your visit' },
	ratings_form_title: { el: 'Κριτική επίσκεψης', en: 'Review your visit' },
	ratings_done_title: { el: 'Η κριτική υποβλήθηκε.', en: 'Your review has been submitted.' },
	ratings_form_then_until: {
		el: 'Μπορείτε να γράψετε κριτική για την επίσκεψη έως {date}.',
		en: 'You can review this visit until {date}.'
	},
	ratings_invitation_refused_body: {
		el: 'Η πρόσκληση κριτικής δεν ανήκει σε αυτόν τον λογαριασμό ή δεν υπάρχει πια.',
		en: 'This review invitation does not belong to this account or no longer exists.'
	},
	ratings_submit_blocker_rating_doctor_license_inactive: {
		el: 'Ο γιατρός δεν μπορεί να δεχτεί κριτικές αυτή τη στιγμή.',
		en: 'This doctor cannot receive reviews right now.'
	},
	ratings_submit_blocker_rating_invitation_expired: {
		el: 'Ο χρόνος για να γράψετε κριτική για αυτή την επίσκεψη έληξε.',
		en: 'The time to review this visit has passed.'
	},
	ratings_submit_blocker_rating_invitation_not_open: {
		el: 'Για την επίσκεψη έχει ήδη γραφτεί κριτική ή η πρόσκλησή της έκλεισε.',
		en: 'This visit has already been reviewed, or its invitation was closed.'
	},
	ratings_submit_blocker_rating_patient_is_the_doctor: {
		el: 'Δεν μπορείτε να γράψετε κριτική για επίσκεψη στο δικό σας ιατρείο.',
		en: 'You cannot review a visit to your own practice.'
	}
};

const planted = (path: string, text: string): SourceFile => ({ path, text: stripComments(text) });

describe('🔴 U-173: ΜΙΑ λέξη παντού — «κριτική / κριτικές» (D-W45-53, D-W45-54; card w45-w8)', () => {
	it('U-173: καμία «αξιολογ…» στο `messages/el.json`, and the English never calls a review a “rating” («rating invitation», «New ratings», «Rate your visit» …)', () => {
		const el = readCatalog('el');
		const en = readCatalog('en');
		// The check is not empty: both catalogs are read whole, key for key.
		expect(Object.keys(el).length).toBeGreaterThan(1700);
		expect(Object.keys(en).sort()).toEqual(Object.keys(el).sort());
		expect(findCatalogIssues(el, en)).toEqual([]);
	});

	it('U-173: no string of `src/` — a component, a story, a helper — says the old word (comments are not words a reader meets)', () => {
		const files = readSourceFiles();
		for (const path of [
			'src/shared/ui/molecules/review-summary/review-summary.stories.svelte',
			'src/shared/ui/molecules/selectable-cards/selectable-cards.stories.svelte',
			'src/shared/ui/_showcases/filters-dialog.stories.svelte',
			'src/modules/appointments/ui/rating/page/index.svelte',
			'src/modules/account/lib/deletion-flow/index.ts'
		]) {
			expect(
				files.map((file) => file.path),
				path
			).toContain(path);
		}
		expect(findSourceIssues(files)).toEqual([]);
	});

	it('D-W45-53: the table’s lines, verbatim in both languages — the application’s and the server’s own words', () => {
		const el = readCatalog('el');
		const en = readCatalog('en');
		for (const [key, words] of Object.entries(D_W45_53)) {
			expect(el[key], `el ${key}`).toBe(words.el);
			expect(en[key], `en ${key}`).toBe(words.en);
		}
	});

	it('D-W45-53: the number with the stars stays «Βαθμολογία» / “Rating” — the search sorts by it, never by a «κριτική»', () => {
		const el = readCatalog('el');
		const en = readCatalog('en');
		expect(el.filters_sort_rating).toBe('Βαθμολογία');
		expect(el.filters_sort_rating_hint).toBe('Καλύτερη βαθμολογία πρώτα');
		expect(en.filters_sort_rating).toBe('Rating');
		expect(en.filters_sort_rating_hint).toBe('Highest rated first');
		expect(el.ratings_form_help).toMatch(/^Βαθμολογήστε/u);
		expect(en.ratings_form_help).toMatch(/^Rate all five aspects/u);
	});

	it('(negative, planted) the old word in any case and form, in a key of the catalog or a string of a component — each is reported; «Κριτικές», «Βαθμολογία» and a comment are not', () => {
		expect(
			findCatalogIssues(
				{
					one: 'Αξιολογήστε την επίσκεψη',
					two: 'Μπορείτε να αξιολογήσετε την επίσκεψη.',
					three: 'Η επίσκεψη έχει ήδη αξιολογηθεί.',
					four: 'ΝΕΕΣ ΑΞΙΟΛΟΓΗΣΕΙΣ',
					five: 'ΑΞΙΟΛΌΓΗΣΗ',
					six: 'Πρόσκληση αξιολόγησης',
					fine: 'Κριτικές',
					stars: 'Βαθμολογία',
					act: 'Γράψτε κριτική για την επίσκεψη'
				},
				{}
			)
		).toEqual([
			'el one: the old word (U-173)',
			'el two: the old word (U-173)',
			'el three: the old word (U-173)',
			'el four: the old word (U-173)',
			'el five: the old word (U-173)',
			'el six: the old word (U-173)'
		]);
		expect(
			findSourceIssues([
				planted(
					'src/shared/ui/molecules/review-summary/review-summary.stories.svelte',
					'<ReviewSummary\n\tcount="124 αξιολογήσεις"\n/>'
				),
				planted(
					'src/modules/appointments/lib/rating/index.ts',
					"// «Η αξιολόγηση υποβλήθηκε.»\nconst title = 'Κριτική επίσκεψης';\n/* αξιολογήσεις */"
				),
				planted('src/modules/doctor/lib/x.ts', "const label = 'Αξιολόγηση';")
			])
		).toEqual([
			'src/shared/ui/molecules/review-summary/review-summary.stories.svelte:2: the old word (U-173)',
			'src/modules/doctor/lib/x.ts:1: the old word (U-173)'
		]);
	});

	it('(negative, planted) English: a review called a “rating” is reported in any case; the stars’ and a percentage’s English is not', () => {
		expect(
			findCatalogIssues(
				{},
				{
					one: 'This rating invitation does not belong to this account.',
					two: 'New ratings',
					three: 'Rate your visit',
					four: 'Your rating has been submitted.',
					five: 'This visit has already been rated.',
					stars: 'Rate all five aspects. For half a star, tap the same star again.',
					score: 'Rated {score} out of 5',
					sort: 'Highest rated first',
					overall: 'Overall rating',
					percent: 'Response rate: {percent}%',
					fine: 'Review your visit'
				}
			)
		).toEqual([
			'en one: “rating invitation” (U-173)',
			'en two: “new ratings” (U-173)',
			'en three: “rate your visit” (U-173)',
			'en four: “your rating” (U-173)',
			'en five: “been rated” (U-173)'
		]);
	});
});
