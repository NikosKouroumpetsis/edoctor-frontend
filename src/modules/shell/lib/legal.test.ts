import { describe, expect, it } from 'vitest';
import { legalSlugs } from '$modules/shell/config/legal';
import { isLegalSlug, legalPath } from './legal';

describe('legal slugs', () => {
	it('U-20 ⇒ U-69.2: the application’s three slugs and «Πολιτική κριτικών» (screen 12); any other is a 404', () => {
		expect(legalSlugs).toEqual([
			'terms-of-use',
			'privacy-policy',
			'cookies-policy',
			'review-policy'
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
			'/legal/review-policy'
		]);
	});
});
