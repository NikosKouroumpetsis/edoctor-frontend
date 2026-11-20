import { httpSessionGet, httpSessionPut } from '$shared/lib/http';
import { mapDoctorSpecializationOptions, mapDoctorSpecializations } from './map';
import type {
	DoctorSpecializationFacts,
	DoctorSpecializationOptionFacts,
	DoctorSpecializationOptionsView,
	DoctorSpecializationsView
} from './types';

const SPECIALIZATIONS_PATH = '/doctor/profile/specializations';

/**
 * D-W52-54: the specializations the specialty of the session's own doctor may pick from, named in `lang` (`no-store`,
 * with the cookies). Nothing in the request names a doctor (the backoffice's `tenantUserId` is never sent). `[]` for a
 * specialty without a list; `null` for an answer that is no list.
 */
export async function getDoctorSpecializationOptions(
	lang: string,
	signal?: AbortSignal
): Promise<DoctorSpecializationOptionFacts[] | null> {
	return mapDoctorSpecializationOptions(
		await httpSessionGet<DoctorSpecializationOptionsView>(`${SPECIALIZATIONS_PATH}/options`, {
			params: { lang },
			signal
		})
	);
}

/** D-W52-54: the picks of the session's own doctor, each with where it stands; `null` for an answer that is no list. */
export async function getDoctorSpecializations(
	lang: string,
	signal?: AbortSignal
): Promise<DoctorSpecializationFacts[] | null> {
	return mapDoctorSpecializations(
		await httpSessionGet<DoctorSpecializationsView>(SPECIALIZATIONS_PATH, {
			params: { lang },
			signal
		})
	);
}

/**
 * 🔴 D-W52-54: the WHOLE of the doctor's picks in ONE call — `{ codes }`, nothing else (the server refuses any other
 * field): every code that stays, a rejected one too until the doctor takes it out; `[]` takes them all away. The picks
 * as the server now keeps them, named in `lang`; `null` for an answer that is no list.
 */
export async function replaceDoctorSpecializations(
	codes: readonly string[],
	lang: string
): Promise<DoctorSpecializationFacts[] | null> {
	return mapDoctorSpecializations(
		await httpSessionPut<DoctorSpecializationsView>(SPECIALIZATIONS_PATH, {
			params: { lang },
			body: { codes: [...codes] }
		})
	);
}
