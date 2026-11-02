import type { DeviceCoordinates } from '$shared/state/device-location';
import type { SearchDoctorsCriteria } from '$modules/search-doctors/lib/search-criteria';

/**
 * The criteria a search sends (the results' read, and the read a press starts ahead of the page, D-103): «Κοντά μου»
 * with this visit's `position` (`readFreshDeviceLocation()` of `$shared/state/device-location`), `null` while it has
 * none (then nothing is searched — never the default Αττική, S-32.2); any other «Πού» as it is. Pure (U-29.1).
 */
export function criteriaWithDeviceLocation(
	criteria: SearchDoctorsCriteria,
	position: DeviceCoordinates | null
): SearchDoctorsCriteria | null {
	const selection = criteria.whereSelection;
	if (selection?.kind !== 'current-location') return criteria;
	if (!position) return null;
	return {
		...criteria,
		whereSelection: { ...selection, latitude: position.latitude, longitude: position.longitude }
	};
}
