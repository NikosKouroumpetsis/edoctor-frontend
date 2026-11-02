import { legalSlugs, type LegalSlug } from '$modules/shell/config/legal';

/** Whether a route's `[slug]` is one of the legal pages (any other is SvelteKit's 404). */
export const isLegalSlug = (value: string): value is LegalSlug =>
	(legalSlugs as readonly string[]).includes(value);

/** The path of a legal page, before its language (`/legal/<slug>`). */
export const legalPath = (slug: LegalSlug): `/legal/${LegalSlug}` => `/legal/${slug}`;
