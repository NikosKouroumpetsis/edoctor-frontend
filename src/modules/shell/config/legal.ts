/**
 * 🔴 MINOR-2 (U-29): the legal pages' ONE list, at the application's slugs (`app/legal/[slug]`, the CMS pages of wave
 * 1.5, screen 7). The route's 404, the screen, the footer's links and the consent card's links all read it. 🔴 U-69.2:
 * the review policy is a legal text too (screen 12 links to it).
 */
export const legalSlugs = [
	'terms-of-use',
	'privacy-policy',
	'cookies-policy',
	'review-policy'
] as const;

export type LegalSlug = (typeof legalSlugs)[number];
