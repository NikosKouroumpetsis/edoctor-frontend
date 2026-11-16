import { describe, expect, it } from 'vitest';
import { buildDoctorMenuGroups } from './index';

const rowsOf = (locale: 'el' | 'en') => buildDoctorMenuGroups(locale).flat();

describe('the doctor menu on the web in 5.1 (D-W51-04, D-W51-16)', () => {
	// Rewrites the four groups of card w51-w1: 🔴 D-W51-04 «Οι ασθενείς μου (από το βήμα 9)» · D-W51-73 (card w51-w9).
	it('D-W51-04 · D-W51-73: Ειδοποιήσεις · Οι ασθενείς μου · Ρυθμίσεις λογαριασμού · Κέντρο βοήθειας · Όροι γιατρών · Αποσύνδεση, in five groups', () => {
		expect(buildDoctorMenuGroups('el').map((group) => group.map((row) => row.label))).toEqual([
			['Ειδοποιήσεις'],
			['Οι ασθενείς μου'],
			['Ρυθμίσεις λογαριασμού'],
			['Κέντρο βοήθειας', 'Όροι γιατρών'],
			['Αποσύνδεση']
		]);
	});

	it('U-186.2: πλαίσιο γιατρού χωρίς Προφίλ / Συγγενείς — and no «Ρυθμίσεις ιατρείου» / «Ταμείο» on the web in 5.1', () => {
		for (const locale of ['el', 'en'] as const) {
			const words = rowsOf(locale)
				.map((row) => row.label)
				.join(' | ');
			// Rewrites «no «Οι ασθενείς μου» until step 9» of card w51-w1 (D-W51-04, D-W51-73): the row is there since step 9.
			expect(words, locale).not.toMatch(/Προφίλ|συγγενείς|Ρυθμίσεις ιατρείου|Ταμείο/iu);
			expect(words, locale).not.toMatch(/Profile|relatives|Practice settings|Till/iu);
		}
		expect(rowsOf('el').map((row) => row.id)).toEqual([
			'notifications',
			'patients',
			'account-settings',
			'help',
			'terms',
			'sign-out'
		]);
	});

	it('round 2 (U-81.2, `76-menu` m-51): the page «Μενού» — no row «Ειδοποιήσεις» (its bell is at the title), «Βρείτε βοήθεια» as the «Προφίλ» says it; the ☰ keeps both', () => {
		expect(
			buildDoctorMenuGroups('el', 'page').map((group) => group.map((row) => row.label))
		).toEqual([
			['Οι ασθενείς μου'],
			['Ρυθμίσεις λογαριασμού'],
			['Βρείτε βοήθεια', 'Όροι γιατρών'],
			['Αποσύνδεση']
		]);
		expect(buildDoctorMenuGroups('en', 'page')[0]?.map((row) => row.label)).toEqual([
			'My patients'
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
