import type { SimilarDoctorsArea } from '$modules/search-doctors/api/marketplace';
import {
	defaultSearchDoctorsCriteria,
	type SearchDoctorsCriteria
} from '$modules/search-doctors/lib/search-criteria';

/** What «Δείτε παρόμοιους γιατρούς» searches by: the doctor's specialty and the area of the active office, if any. */
export type SimilarDoctorsSearchInput = {
	area: SimilarDoctorsArea | null;
	professionalId?: string;
	professionalName?: string;
	professionalSlug?: string;
};

/**
 * 🔴 U-37.2 (app = web, the application's `buildSimilarDoctorsCriteria`): the same specialty — by its catalogue id when
 * known, else by its words — and the area as a `location` selection with its slug, which the search applies. No area
 * resolved ⇒ no «Πού» at all (MAJOR-2 of r1).
 */
export function buildSimilarDoctorsCriteria({
	area,
	professionalId,
	professionalName,
	professionalSlug
}: SimilarDoctorsSearchInput): SearchDoctorsCriteria {
	const label = professionalName?.trim() ?? '';
	return {
		...defaultSearchDoctorsCriteria,
		what: label,
		where: area?.label ?? '',
		whatSelection:
			professionalId && label
				? {
						id: professionalId,
						kind: 'professional',
						label,
						...(professionalSlug ? { slug: professionalSlug } : {})
					}
				: null,
		whereSelection: area
			? {
					kind: 'location',
					label: area.label,
					slug: area.slug,
					...(area.locationType ? { locationType: area.locationType } : {})
				}
			: null
	};
}
