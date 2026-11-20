import { describe, expect, it } from 'vitest';
import { buildDoctorMenuGroups } from './index';

const rowsOf = (locale: 'el' | 'en') => buildDoctorMenuGroups(locale).flat();

describe('the doctor menu on the web (D-W51-04, D-W51-16; since wave 5.2 D-W52-22)', () => {
	// Rewrites the four groups of card w51-w1: 🔴 D-W51-04 «Οι ασθενείς μου (από το βήμα 9)» · D-W51-73 (card w51-w9).
	// Rewritten by D-W52-22 (wave 5.2, card w52-w1; task doc §6): «Το προφίλ μου» is the first row of the first group
	// of the page — in the ☰ the group after the bell's own row.
	// Widened by D-W52-91 (wave 5.2, card w52-w8; task doc §1.3, «Κριτικές» comes with screen 84): its row after «Οι
	// ασθενείς μου» (`64-switch/sw.js:192`).
	// Widened by D-W52-102 (wave 5.2, card w52-w9; the card «Από τη γραμμή του Μενού (76)»): «Τα άρθρα μου» after
	// «Κριτικές» (`sw.js:192`).
	it('D-W51-04 · D-W51-73 · 🔴 D-W52-22 · D-W52-91 · D-W52-102: Ειδοποιήσεις · Το προφίλ μου · Οι ασθενείς μου · Κριτικές · Τα άρθρα μου · Ρυθμίσεις λογαριασμού · Κέντρο βοήθειας · Όροι γιατρών · Αποσύνδεση, in five groups', () => {
		expect(buildDoctorMenuGroups('el').map((group) => group.map((row) => row.label))).toEqual([
			['Ειδοποιήσεις'],
			['Το προφίλ μου', 'Οι ασθενείς μου', 'Κριτικές', 'Τα άρθρα μου'],
			['Ρυθμίσεις λογαριασμού'],
			['Κέντρο βοήθειας', 'Όροι γιατρών'],
			['Αποσύνδεση']
		]);
	});

	// Rewrites «U-186.2: πλαίσιο γιατρού χωρίς Προφίλ / Συγγενείς …» by D-W52-22 (task doc §6, U-186.2 word for word): the
	// frame has no TAB «Προφίλ» and no «Οι συγγενείς μου», ever (the bar and the capsule: `ui/frame/page/index.test.ts`);
	// «Το προφίλ μου» IS a row of the «Μενού» — the one row with the word, and exactly that row.
	it('🔴 U-186.2 · D-W52-22: «Το προφίλ μου» is a ROW of the Μενού and the only one that says «προφίλ» — never the patient’s «Προφίλ», never «Οι συγγενείς μου»; no «Ρυθμίσεις ιατρείου» / «Ταμείο» on the web yet', () => {
		for (const locale of ['el', 'en'] as const) {
			for (const place of ['menu', 'page'] as const) {
				const rows = buildDoctorMenuGroups(locale, place).flat();
				const words = rows.map((row) => row.label).join(' | ');
				// Rewrites «no «Οι ασθενείς μου» until step 9» of card w51-w1 (D-W51-04, D-W51-73): the row is there since step 9.
				expect(words, locale).not.toMatch(/συγγενείς|Ρυθμίσεις ιατρείου|Ταμείο/iu);
				expect(words, locale).not.toMatch(/relatives|Practice settings|Till/iu);
				const profile = rows.filter((row) => /προφίλ|profile/iu.test(row.label));
				expect(
					profile.map((row) => [row.id, row.label]),
					`${locale} ${place}`
				).toEqual([['profile', locale === 'el' ? 'Το προφίλ μου' : 'My profile']]);
				// The patient's tab is the bare word; the doctor's row never is.
				expect(rows.map((row) => row.label)).not.toContain(locale === 'el' ? 'Προφίλ' : 'Profile');
			}
		}
		// Widened by D-W52-91 (card w52-w8): the row «Κριτικές» of screen 84 after «Οι ασθενείς μου».
		// Widened by D-W52-102 (card w52-w9): the row «Τα άρθρα μου» of screen 85 after «Κριτικές».
		expect(rowsOf('el').map((row) => row.id)).toEqual([
			'notifications',
			'profile',
			'patients',
			'reviews',
			'articles',
			'account-settings',
			'help',
			'terms',
			'sign-out'
		]);
	});

	// Widened by D-W52-91 (card w52-w8): «Κριτικές» after «Οι ασθενείς μου» in the same group.
	// Widened by D-W52-102 (card w52-w9): «Τα άρθρα μου» after «Κριτικές» in the same group (`create-outline`, the pen).
	it('🔴 D-W52-22 · D-W52-91 · D-W52-102: «Το προφίλ μου» is the FIRST row of the first group of the page «Μενού», before «Οι ασθενείς μου» and «Κριτικές» — and of the same group in the ☰', () => {
		const [first] = buildDoctorMenuGroups('el', 'page');
		expect(first.map((row) => row.id)).toEqual(['profile', 'patients', 'reviews', 'articles']);
		expect(first[0]).toEqual({ id: 'profile', label: 'Το προφίλ μου', icon: 'person-outline' });
		expect(first[2]).toEqual({ id: 'reviews', label: 'Κριτικές', icon: 'star-outline' });
		expect(first[3]).toEqual({ id: 'articles', label: 'Τα άρθρα μου', icon: 'create-outline' });
		expect(buildDoctorMenuGroups('el', 'menu')[1].map((row) => row.id)).toEqual([
			'profile',
			'patients',
			'reviews',
			'articles'
		]);
		expect(buildDoctorMenuGroups('en', 'menu')[1].map((row) => row.label)).toEqual([
			'My profile',
			'My patients',
			'Reviews',
			'My articles'
		]);
	});

	it('round 2 (U-81.2, `76-menu` m-51): the page «Μενού» — no row «Ειδοποιήσεις» (its bell is at the title), «Βρείτε βοήθεια» as the «Προφίλ» says it; the ☰ keeps both', () => {
		expect(
			buildDoctorMenuGroups('el', 'page').map((group) => group.map((row) => row.label))
		).toEqual([
			// D-W52-22 (wave 5.2): «Το προφίλ μου» first; D-W52-91: «Κριτικές» after «Οι ασθενείς μου»; D-W52-102 «Τα άρθρα μου».
			['Το προφίλ μου', 'Οι ασθενείς μου', 'Κριτικές', 'Τα άρθρα μου'],
			['Ρυθμίσεις λογαριασμού'],
			['Βρείτε βοήθεια', 'Όροι γιατρών'],
			['Αποσύνδεση']
		]);
		expect(buildDoctorMenuGroups('en', 'page')[0]?.map((row) => row.label)).toEqual([
			'My profile',
			'My patients',
			'Reviews',
			'My articles'
		]);
		expect(
			buildDoctorMenuGroups('el', 'menu')
				.flat()
				.map((row) => row.label)
		).toContain('Ειδοποιήσεις');
		expect(
			buildDoctorMenuGroups('el', 'menu')
				.flat()
				.map((row) => row.label)
		).toContain('Κέντρο βοήθειας');
	});
});
