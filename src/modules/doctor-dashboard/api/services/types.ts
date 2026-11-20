import type { ApiRequestBody, ApiResponseData } from '$shared/lib/api-client';

/** The calls of screen 83 as the contract writes them (D-W52-79 / 80, `w52-b7` §9); they stay inside `api/`. */
export type DoctorServicesView = ApiResponseData<'listDoctorServices', 200>;
export type DoctorServiceView = ApiResponseData<'getDoctorService', 200>;
export type DoctorAllowedServicesView = ApiResponseData<'listAllowedDoctorServices', 200>;
export type DoctorServiceCreateBody = ApiRequestBody<'createDoctorService'>;
export type DoctorServiceUpdateBody = ApiRequestBody<'updateDoctorService'>;

/**
 * FACTS of one service of the doctor (screen 83, D-W52-81): the server's id, the catalogue's service it is, its title in
 * the page's language, its price in euros, its length in minutes, and the doctor's OWN Greek texts (U-207.3, U-214: `null`
 * for none — never eDoctor's) and years (`null` for none). The list's order is the doctor's (D-W52-73).
 */
export type DoctorServiceFacts = {
	id: string;
	serviceId: string;
	title: string;
	price: number;
	durationInMinutes: number;
	subtitle: string | null;
	description: string | null;
	years: number | null;
};

/**
 * FACTS of one service the doctor's specialty allows (D-W52-79): the catalogue's id, its title, eDoctor's Greek texts
 * for the button «Συμπλήρωση με την πρόταση του eDoctor» (U-214: `null` for none, never a text of the doctor), its usual
 * length (one of D-W52-10's list), and whether the doctor already offers it (`owned`).
 */
export type DoctorAllowedServiceFacts = {
	serviceId: string;
	title: string;
	suggestedSubtitle: string | null;
	suggestedDescription: string | null;
	durationInMinutes: number;
	owned: boolean;
};

/**
 * What ONE save of a service writes (D-W52-82): the price in whole euros, the length (`null`: a stored length of before
 * the list, left as it is), the doctor's own Greek texts (`null` for none) and years (`null` for none).
 */
export type DoctorServiceDraft = {
	price: number;
	durationInMinutes: number | null;
	subtitle: string | null;
	description: string | null;
	years: number | null;
};

/**
 * Why a write of the services was refused (`w52-b7` §9): the session ended; the LAST service (`last`, 409
 * `DOCTOR_SERVICE_LAST_ONE`); a service the doctor already offers (`owned`, 409); the years past the licence (`years`);
 * any other field the server will not take (`invalid`, 422); the order no longer the doctor's (`mismatch`, 422
 * `DOCTOR_SERVICE_ORDER_MISMATCH`, or an id that is no longer there: read again); the service gone (`gone`, 403 / 404 of
 * one service: D-107 answers both alike); too many writes; no licence; else nobody decided.
 */
export type DoctorServicesFailure =
	| 'session'
	| 'last'
	| 'owned'
	| 'years'
	| 'invalid'
	| 'mismatch'
	| 'gone'
	| 'rate-limited'
	| 'forbidden'
	| 'unknown';
