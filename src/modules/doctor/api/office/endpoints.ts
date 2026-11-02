import { httpGet } from '$shared/lib/http';
import type { DoctorPublicMarketplaceOfficeResponseView } from '$shared/lib/api-client';
import type { DoctorRequestContext } from '$modules/doctor/api/profile';

/**
 * One public office of one doctor (`GET /doctor/public/doctors/{doctorId}/offices/{officeId}`, the application's
 * `getDoctorPublicOffice`): anonymous, both ids path-encoded, `lang` the localized address.
 */
export function getDoctorPublicOffice(
	doctorId: string,
	officeId: string,
	lang: string,
	context: DoctorRequestContext = {}
): Promise<DoctorPublicMarketplaceOfficeResponseView> {
	return httpGet<DoctorPublicMarketplaceOfficeResponseView>(
		`/doctor/public/doctors/${encodeURIComponent(doctorId)}/offices/${encodeURIComponent(officeId)}`,
		{ params: { lang }, signal: context.signal, fetch: context.fetch }
	);
}
