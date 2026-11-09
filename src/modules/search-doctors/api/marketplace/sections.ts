import type { SectionId } from '$modules/search-doctors/types';
import type { MarketplaceAvailability, MarketplaceSortBy } from './types';

/**
 * Page size for home section rails. Lives ONLY here, never in the shared search call. The same 8 as the
 * application's `HOME_SECTION_LIMIT`: up to 7 cards show at once from 1440 (U-20).
 */
export const HOME_SECTION_LIMIT = 8;

/**
 * A display term per language, resolved at runtime (the application's `LocalizedSpecialtyTerm` /
 * `LocalizedLocationTerm`): the backend matchers index professionals and areas by their localized name, and the
 * English area term is the transliteration the matcher accepts (`Athina`).
 */
export type LocalizedTerm = { el: string; en: string };

/**
 * One home section's fixed scope, the application's `homeSectionConfigs` (U-20: the web's rows are the
 * application's, the same query). `specialties` resolve to `professionalId`s via `/doctors/suggestions` (several
 * union their professionals), `location` to a `locationSlug` via `/locations/suggestions` — a hard scope: an
 * area-titled row that does not resolve is hidden rather than showing doctors from the wrong city.
 */
export type HomeSectionConfig = {
	id: SectionId;
	sortBy: MarketplaceSortBy;
	availability: MarketplaceAvailability;
	specialties?: LocalizedTerm[];
	location?: LocalizedTerm;
};

export const homeSectionConfigs: HomeSectionConfig[] = [
	{
		id: 'popular-athens',
		sortBy: 'popularity',
		availability: 'next7Days',
		location: { el: 'Αθήνα', en: 'Athina' }
	},
	{
		id: 'popular-psychologists',
		sortBy: 'popularity',
		availability: 'next7Days',
		specialties: [{ el: 'Ψυχολόγος', en: 'Psychologist' }]
	},
	{
		id: 'internal-medicine-gp',
		sortBy: 'popularity',
		availability: 'next7Days',
		// Κ-1: the catalogue's names (PR021, PR005), so the server's prefix match finds both specialties.
		specialties: [
			{ el: 'Παθολόγος', en: 'Internist' },
			{ el: 'Γενικός Γιατρός', en: 'General practitioner' }
		]
	}
];

/** The term for the page's language (English for any other, as the application's builder). */
export function termFor(term: LocalizedTerm, lang: string): string {
	return lang === 'el' ? term.el : term.en;
}
