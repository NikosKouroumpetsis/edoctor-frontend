import type { DoctorPublicMarketplaceOfficeResponseView } from '$shared/lib/api-client';
import { mapDoctorOfficeFacts, type DoctorOfficeFacts } from '$modules/doctor/api/profile';

/**
 * One office's answer as its location FACTS (U-39.1, the profile's own mapper: one reading of the same view). The
 * answer's availability summary is not read: the slots are `api/availability`'s (one source of «free»).
 */
export function mapDoctorOffice(
	data: DoctorPublicMarketplaceOfficeResponseView,
	officeId: string
): DoctorOfficeFacts | null {
	const facts = mapDoctorOfficeFacts(data.office);
	return facts ? { ...facts, officeId } : null;
}
