import type { DeviceCoordinates } from '$shared/state/device-location';
import type { ResultsPress } from '$modules/search-doctors/api/results/prefetch';
import { criteriaWithDeviceLocation } from '$modules/search-doctors/lib/device-location';
import { readSearchDoctorsCriteria } from '$modules/search-doctors/lib/search-criteria';
import { readSearchDoctorsFilters } from '$modules/search-doctors/lib/search-filters';
import {
	buildSearchDoctorsScope,
	type SearchDoctorsScope
} from '$modules/search-doctors/lib/search-query';

/**
 * 🔴 U-32.1: the scope a results address searches, read by the results' readers (`readSearchDoctorsCriteria`,
 * `readSearchDoctorsFilters`), «Κοντά μου» with `position` (this visit's, `readFreshDeviceLocation()`; the server has
 * none) — `null` while it has none: nothing is searched then, never the default Αττική (S-32.2, S-07.3 rule 11).
 */
export function readResultsScope(
	params: URLSearchParams,
	position: DeviceCoordinates | null
): SearchDoctorsScope | null {
	const criteria = criteriaWithDeviceLocation(readSearchDoctorsCriteria(params), position);
	return criteria ? buildSearchDoctorsScope(criteria, readSearchDoctorsFilters(params)) : null;
}

/**
 * A press that goes to the results (D-103, MINOR-7 of r1): the scope its address (`href`, `/doctors?…`) searches and,
 * when it goes to the page already shown (`current`, the same path), that page's scope (NIT-r2-2: the same search is
 * not asked twice). `api/results` `prefetchSearchResults` reads it ahead.
 */
export function readResultsPress(
	href: string,
	position: DeviceCoordinates | null,
	current?: URL
): ResultsPress {
	const start = href.indexOf('?');
	const path = start < 0 ? href : href.slice(0, start);
	return {
		scope: readResultsScope(new URLSearchParams(start < 0 ? '' : href.slice(start + 1)), position),
		shown:
			current && current.pathname === path ? readResultsScope(current.searchParams, position) : null
	};
}
