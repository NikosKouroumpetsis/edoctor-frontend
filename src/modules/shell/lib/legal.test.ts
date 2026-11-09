import { describe, expect, it } from 'vitest';
import { legalSlugs } from '$modules/shell/config/legal';
import { isLegalSlug, legalPath, legalTitle } from './legal';

describe('legal slugs', () => {
	// D-W3-15: U-59.1's list grows by the doctors' terms (Ε2 = Α, U-102: a new screen), by decision, not by hand.
	it('U-20 ⇒ U-69.2 ⇒ D-W3-15: the application’s three slugs, «Πολιτική κριτικών» (screen 12) and the doctors’ terms; any other is a 404', () => {
		expect(legalSlugs).toEqual([
			'terms-of-use',
			'privacy-policy',
			'cookies-policy',
			'review-policy',
			'doctor-marketplace-terms'
		]);
		for (const slug of legalSlugs) expect(isLegalSlug(slug)).toBe(true);
		for (const slug of ['terms', 'privacy', 'cookies', '', 'Terms-Of-Use']) {
			expect(isLegalSlug(slug)).toBe(false);
		}
	});

	it('U-29 (MINOR-2): every legal link is built from the ONE list — `/legal/<slug>`, before its language', () => {
		expect(legalSlugs.map(legalPath)).toEqual([
			'/legal/terms-of-use',
			'/legal/privacy-policy',
			'/legal/cookies-policy',
			'/legal/review-policy',
			'/legal/doctor-marketplace-terms'
		]);
	});

	it('D-W3-15 / U-114: the doctors’ terms are named in the site’s approved words, in each language', () => {
		expect(legalTitle('doctor-marketplace-terms', 'el')).toBe('Όροι για γιατρούς');
		expect(legalTitle('doctor-marketplace-terms', 'en')).toBe('Terms for doctors');
		expect(isLegalSlug('doctor-marketplace-terms')).toBe(true);
		for (const slug of ['doctor-terms', 'DOCTOR_MARKETPLACE_TERMS', 'doctor-marketplace-terms/'])
			expect(isLegalSlug(slug)).toBe(false);
	});
});
