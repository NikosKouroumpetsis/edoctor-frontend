/**
 * 🔴 MINOR-2 (U-29): the legal pages' ONE list, at the application's slugs (`app/legal/[slug]`, the CMS pages of wave
 * 1.5, screen 7). The route's 404, the screen, the footer's links and the consent card's links all read it. 🔴 U-69.2:
 * the review policy is a legal text too (screen 12 links to it). 🔴 D-W3-15 / U-59.1 (Ε2 = Α, U-102): the doctors'
 * terms are one more, the new screen the doctor's sign-up opens (the backend publishes them at this slug).
 */
export const legalSlugs = [
	'terms-of-use',
	'privacy-policy',
	'cookies-policy',
	'review-policy',
	'doctor-marketplace-terms'
] as const;

export type LegalSlug = (typeof legalSlugs)[number];
