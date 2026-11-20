import { httpSessionGet } from '$shared/lib/http';
import { mapDoctorMyProfile, mapDoctorPracticeLicence, mapDoctorProfileText } from './map';
import type {
	DoctorDescriptionReader,
	DoctorMyProfileFacts,
	DoctorMyProfileView,
	DoctorPracticeLicenceFacts,
	DoctorProfileBaseView,
	DoctorProfilePreviewAnswer,
	DoctorProfileTextFacts,
	DoctorProfileTextView
} from './types';

const PROFILE_PATH = '/doctor/me/profile';
// 🔴 D-W52-01 (U-207.3): the doctor's page is written in Greek; its other languages are the server's, in the last wave.
const TEXT_PATH = '/doctor/profile/translations/el';
const BASE_PATH = '/doctor/profile/base';

/**
 * D-W52-17: «Το προφίλ μου» of the session's own doctor (`no-store`, with the cookies), its names in `lang`. Nothing in
 * the request names a doctor (U-224.2). `null` for an answer that is no profile.
 */
export async function getMyProfile(
	lang: string,
	signal?: AbortSignal
): Promise<DoctorMyProfileFacts | null> {
	return mapDoctorMyProfile(
		await httpSessionGet<DoctorMyProfileView>(PROFILE_PATH, { params: { lang }, signal })
	);
}

/**
 * D-W52-18 (U-224): the public profile's own answer, read for the doctor of the session — before the search shows the
 * doctor too. As the server wrote it: its reader is the `doctor` module's, handed in by the screen (`queries.ts`).
 */
export function getMyProfilePreview(
	lang: string,
	signal?: AbortSignal
): Promise<DoctorProfilePreviewAnswer> {
	return httpSessionGet<DoctorProfilePreviewAnswer>(`${PROFILE_PATH}/preview`, {
		params: { lang },
		signal
	});
}

/**
 * D-W52-47 / D-W52-48 (screen 79): the Greek text of the public page of the session's own doctor (`no-store`, with the
 * cookies) — its name and its description, read by the public page's reader. Nothing in the request names a doctor
 * (the backoffice's `tenantUserId` is never sent). `undefined` for an answer that is no text.
 */
export async function getMyProfileText(
	read: DoctorDescriptionReader,
	signal?: AbortSignal
): Promise<DoctorProfileTextFacts | undefined> {
	return mapDoctorProfileText(
		await httpSessionGet<DoctorProfileTextView>(TEXT_PATH, { signal }),
		read
	);
}

/**
 * D-W52-59 (screen 80): the practice licence of the session's own doctor, read from the base profile (`no-store`, with
 * the cookies) — its number and the day it was obtained, nothing else. Nothing in the request names a doctor (the
 * backoffice's `tenantUserId` is never sent). `undefined` for an answer that is no base profile.
 */
export async function getMyPracticeLicence(
	signal?: AbortSignal
): Promise<DoctorPracticeLicenceFacts | undefined> {
	return mapDoctorPracticeLicence(
		await httpSessionGet<DoctorProfileBaseView>(BASE_PATH, { signal })
	);
}
