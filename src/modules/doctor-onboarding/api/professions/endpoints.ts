import type { ProfessionalListResponseView } from '$shared/lib/api-client';
import { httpSessionGet } from '$shared/lib/http';

/** The specialties' catalogue (B-6: a signed-in read, every specialty with its names in each language). */
export function getDoctorOnboardingProfessions(
	signal?: AbortSignal
): Promise<ProfessionalListResponseView> {
	return httpSessionGet<ProfessionalListResponseView>('/professional/professionals', { signal });
}
