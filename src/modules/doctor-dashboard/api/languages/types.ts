import type { ApiResponseData } from '$shared/lib/api-client';

/** `GET /doctor/public/speak-languages/options` as the contract writes it (D-W52-64 / 68); it stays inside `api/`. */
export type DoctorLanguageOptionsView = ApiResponseData<'listSpeakLanguageOptions', 200>;

/** `GET` and `PUT /doctor/profile/speak-languages` as the contract writes them (D-W52-66 / 68); they stay inside `api/`. */
export type DoctorLanguagesView = ApiResponseData<'listDoctorSpeakLanguages', 200>;

/**
 * FACTS of one line of the catalogue of languages (screen 82, D-W52-64): the catalogue's code, its name in the page's
 * language as the server wrote it (CLDR's; never a name of the client's), and that name as a search reads it — lower
 * case, without accents (`normalized`).
 */
export type DoctorLanguageOptionFacts = {
	code: string;
	name: string;
	normalized: string;
};

/** FACTS of one language the doctor speaks: the catalogue's code and its name in the page's language. */
export type DoctorLanguageFacts = {
	code: string;
	name: string;
};

/**
 * Why the server refused a save of the languages (`w52-b6` §5): the session ended; more than ten, one twice or a code
 * out of shape (`invalid`: the page never sends one — its own state is stale); a code the catalogue no longer holds
 * (`not-in-catalogue`: read the catalogue again); the doctor's record is being written elsewhere (`conflict`); too
 * many writes; no licence; else nobody decided.
 */
export type DoctorLanguagesFailure =
	| 'session'
	| 'invalid'
	| 'not-in-catalogue'
	| 'conflict'
	| 'rate-limited'
	| 'forbidden'
	| 'unknown';
