import { queryOptions } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { getDoctorAllowedServices, getDoctorServices } from './endpoints';
import type { DoctorAllowedServiceFacts, DoctorServiceFacts } from './types';

/** A refusal (`401` the session, `403` no licence, `404` no doctor) is an answer: asking again changes nothing. */
const retry = (failures: number, error: unknown) =>
	!(error instanceof ApiError && [401, 403, 404].includes(error.status)) && failures < 1;

/**
 * 🔴 D-W52-73 · U-65.6: the services of the session's own doctor in the doctor's order, titled in the page's language
 * (another language is another read), in the browser only, personal (gone at a sign-out), under the profile's root —
 * so every write of a section reads them again with «Το προφίλ μου». Never asked again by itself while the page is
 * worked on (a drag is not undone by a read that happened to come back); a write reads it. An answer that is no list
 * of services is a failed read.
 */
export function doctorServicesListQuery(locale: string) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.profileServices(locale),
		queryFn: async ({ signal }): Promise<DoctorServiceFacts[]> => {
			const services = await getDoctorServices(signal);
			if (!services)
				throw new ApiError('Not a list of services', 0, '/doctor-service/doctor-services');
			return services;
		},
		staleTime: 0,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		retry,
		meta: personalQueryMeta
	});
}

/**
 * 🔴 D-W52-79 (U-214): the catalogue of the doctor's specialty — what «Νέα υπηρεσία» offers and eDoctor's texts for
 * the button — titled in the page's language, personal, under the profile's root (a new service reads its `owned`
 * again). An answer that is no list is a failed read.
 */
export function doctorAllowedServicesQuery(locale: string) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.profileServiceOptions(locale),
		queryFn: async ({ signal }): Promise<DoctorAllowedServiceFacts[]> => {
			const options = await getDoctorAllowedServices(signal);
			if (!options) throw new ApiError('Not a catalogue', 0, '/doctor-service/allowed-services');
			return options;
		},
		staleTime: 0,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		retry,
		meta: personalQueryMeta
	});
}
