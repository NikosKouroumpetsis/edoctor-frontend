import { httpGet, httpSessionGet, httpSessionPut } from '$shared/lib/http';
import { mapDoctorLanguageOptions, mapDoctorLanguages } from './map';
import type {
	DoctorLanguageFacts,
	DoctorLanguageOptionFacts,
	DoctorLanguageOptionsView,
	DoctorLanguagesView
} from './types';

const OPTIONS_PATH = '/doctor/public/speak-languages/options';
const LANGUAGES_PATH = '/doctor/profile/speak-languages';

/**
 * D-W52-64: the whole catalogue of languages, named in `lang` — a public read, without the cookies, the same for
 * everybody. `null` for an answer that is no list.
 */
export async function getDoctorLanguageOptions(
	lang: string,
	signal?: AbortSignal
): Promise<DoctorLanguageOptionFacts[] | null> {
	return mapDoctorLanguageOptions(
		await httpGet<DoctorLanguageOptionsView>(OPTIONS_PATH, { params: { lang }, signal })
	);
}

/**
 * D-W52-66: the languages of the session's own doctor, named in `lang` (`no-store`, with the cookies). Nothing in the
 * request names a doctor (the backoffice's `tenantUserId` is never sent). `null` for an answer that is no list.
 */
export async function getDoctorLanguages(
	lang: string,
	signal?: AbortSignal
): Promise<DoctorLanguageFacts[] | null> {
	return mapDoctorLanguages(
		await httpSessionGet<DoctorLanguagesView>(LANGUAGES_PATH, { params: { lang }, signal })
	);
}

/**
 * 🔴 D-W52-66: the WHOLE of the doctor's languages in ONE call — `{ codes }`, nothing else (the server refuses any
 * other field): every code that stays; `[]` takes them all away. The languages as the server now keeps them, named in
 * `lang`; `null` for an answer that is no list.
 */
export async function replaceDoctorLanguages(
	codes: readonly string[],
	lang: string
): Promise<DoctorLanguageFacts[] | null> {
	return mapDoctorLanguages(
		await httpSessionPut<DoctorLanguagesView>(LANGUAGES_PATH, {
			params: { lang },
			body: { codes: [...codes] }
		})
	);
}
