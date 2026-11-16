import { infiniteQueryOptions, queryOptions } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { isFinalDoctorRefusal } from '$modules/doctor-dashboard/api/appointments';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	DOCTOR_PATIENT_APPOINTMENTS_LIMIT,
	DOCTOR_PATIENTS_LIST_LIMIT,
	DOCTOR_PATIENTS_PAGE_LIMIT
} from '$modules/doctor-dashboard/config';
import {
	getDoctorPatient,
	getDoctorPatientCard,
	listDoctorPatientAppointments,
	listDoctorPatients,
	matchDoctorPatientsByPhone,
	searchDoctorPatients
} from './endpoints';
import type { DoctorPatientAppointmentsSection, DoctorPatientKey } from './types';

/**
 * 🔴 Screen 72 (D-W51-55, D-W51-70): the search of «οι ασθενείς μου» for the words typed (already quiet for a moment and
 * cut at 40 by the caller), the most recent for none; one page. Personal (the mobiles and emails WHOLE, U-182.7), gone at
 * a sign-out. The caller enables it in the browser.
 */
export function doctorPatientSearchQuery(query: string) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.patientSearch(query),
		queryFn: ({ signal }) =>
			searchDoctorPatients({ query, limit: DOCTOR_PATIENTS_PAGE_LIMIT }, signal),
		staleTime: 30_000,
		retry: (failures, error) => !isFinalDoctorRefusal(error) && failures < 1,
		meta: personalQueryMeta
	});
}

/** 🔴 «Ίδιο κινητό» (D-W51-55): the doctor's people with this mobile (the caller asks only with a valid one). */
export function doctorPatientPhoneQuery(phone: string) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.patientPhone(phone),
		queryFn: ({ signal }) => matchDoctorPatientsByPhone(phone, signal),
		staleTime: 30_000,
		retry: (failures, error) => !isFinalDoctorRefusal(error) && failures < 1,
		meta: personalQueryMeta
	});
}

/**
 * 🔴 D-W51-69: the patient chosen on screen 72 — a row of the search put here as it was read, or the one the address
 * names (`?kind=&id=`), read once (never again on its own while the screen is open).
 */
export function doctorPatientQuery(key: DoctorPatientKey) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.patient(key.kind, key.id),
		queryFn: ({ signal }) => getDoctorPatient(key, signal),
		staleTime: Infinity,
		retry: (failures, error) => !isFinalDoctorRefusal(error) && failures < 1,
		meta: personalQueryMeta
	});
}

/**
 * 🔴 Screen 73 (D-W51-64, D-W51-74): «Οι ασθενείς μου» for the words typed (quiet a moment, cut at 40 by the caller),
 * page after page as the end of the list nears the screen, each next one by its `nextCursor`, in the server's order.
 * Personal (the mobiles WHOLE, U-182.7), gone at a sign-out; read again when the page comes back to the front.
 */
export function doctorPatientsQuery(query: string) {
	return infiniteQueryOptions({
		queryKey: doctorDashboardQueryKeys.patientList(query),
		queryFn: ({ pageParam, signal }) =>
			listDoctorPatients({ query, limit: DOCTOR_PATIENTS_LIST_LIMIT, cursor: pageParam }, signal),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (page) => page.nextCursor ?? undefined,
		staleTime: 30_000,
		retry: (failures, error) => !isFinalDoctorRefusal(error) && failures < 1,
		meta: personalQueryMeta
	});
}

/**
 * 🔴 Screen 73 (D-W51-65): one patient's card, with the first page of each list — its own key beside the 72's facts of
 * the same person (another shape). A final refusal (the one `404` of another doctor's) is never asked again.
 */
export function doctorPatientCardQuery(key: DoctorPatientKey) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.patientCard(key.kind, key.id),
		queryFn: ({ signal }) => getDoctorPatientCard(key, signal),
		retry: (failures, error) => !isFinalDoctorRefusal(error) && failures < 1,
		meta: personalQueryMeta
	});
}

/**
 * 🔴 D-W51-65 / 75: the pages of the card's «Επόμενα» or «Προηγούμενα» AFTER the card's first — from its `nextCursor`
 * (`first`), each next by its own; the caller asks only on «Περισσότερα».
 */
export function doctorPatientAppointmentsQuery(
	key: DoctorPatientKey,
	section: DoctorPatientAppointmentsSection,
	first: string
) {
	return infiniteQueryOptions({
		queryKey: [...doctorDashboardQueryKeys.patientAppointments(key.kind, key.id, section), first],
		queryFn: ({ pageParam, signal }) =>
			listDoctorPatientAppointments(
				key,
				{ section, limit: DOCTOR_PATIENT_APPOINTMENTS_LIMIT, cursor: pageParam },
				signal
			),
		initialPageParam: first,
		getNextPageParam: (page) => page.nextCursor ?? undefined,
		retry: (failures, error) => !isFinalDoctorRefusal(error) && failures < 1,
		meta: personalQueryMeta
	});
}
