import {
	httpSessionDelete,
	httpSessionGet,
	httpSessionPatch,
	httpSessionPost,
	httpSessionPut
} from '$shared/lib/http';
import {
	mapDoctorAllowedServices,
	mapDoctorService,
	mapDoctorServices,
	toDoctorServiceCreateBody,
	toDoctorServiceUpdateBody
} from './map';
import type {
	DoctorAllowedServiceFacts,
	DoctorAllowedServicesView,
	DoctorServiceDraft,
	DoctorServiceFacts,
	DoctorServicesView,
	DoctorServiceView
} from './types';

const SERVICES_PATH = '/doctor-service/doctor-services';
const ALLOWED_PATH = '/doctor-service/allowed-services';
const servicePath = (id: string) => `${SERVICES_PATH}/${encodeURIComponent(id)}`;

/**
 * D-W52-73: the services of the session's own doctor in the DOCTOR's order (`no-store`, with the cookies), each titled
 * in the page's language. Nothing in the request names a doctor. `null` for an answer that is no list of services.
 */
export async function getDoctorServices(
	signal?: AbortSignal
): Promise<DoctorServiceFacts[] | null> {
	return mapDoctorServices(await httpSessionGet<DoctorServicesView>(SERVICES_PATH, { signal }));
}

/**
 * D-W52-79: the catalogue of the session's doctor's specialty — what «Νέα υπηρεσία» offers (those it does not offer
 * yet) and eDoctor's texts behind the button of U-214. `null` for an answer that is no list.
 */
export async function getDoctorAllowedServices(
	signal?: AbortSignal
): Promise<DoctorAllowedServiceFacts[] | null> {
	return mapDoctorAllowedServices(
		await httpSessionGet<DoctorAllowedServicesView>(ALLOWED_PATH, { signal })
	);
}

/** 🔴 D-W52-72 / 73: a new service of the catalogue, last in the order. The service as stored; `null` for no service. */
export async function createDoctorService(
	doctorId: string,
	serviceId: string,
	draft: DoctorServiceDraft & { durationInMinutes: number }
): Promise<DoctorServiceFacts | null> {
	return mapDoctorService(
		await httpSessionPost<DoctorServiceView>(SERVICES_PATH, {
			body: toDoctorServiceCreateBody(doctorId, serviceId, draft)
		})
	);
}

/** 🔴 D-W52-82: «Αποθήκευση» of one service, in ONE call. The service as stored; `null` for no service. */
export async function updateDoctorService(
	id: string,
	draft: DoctorServiceDraft
): Promise<DoctorServiceFacts | null> {
	return mapDoctorService(
		await httpSessionPatch<DoctorServiceView>(servicePath(id), {
			body: toDoctorServiceUpdateBody(draft)
		})
	);
}

/** 🔴 D-W52-74: one service goes — never the last one (the server answers 409 `DOCTOR_SERVICE_LAST_ONE`). */
export async function deleteDoctorService(id: string): Promise<void> {
	await httpSessionDelete<unknown>(servicePath(id));
}

/**
 * 🔴 D-W52-73: the whole order in ONE call — every service of the doctor once. The list as the server now keeps it;
 * `null` for an answer that is no list of services.
 */
export async function reorderDoctorServices(
	ids: readonly string[]
): Promise<DoctorServiceFacts[] | null> {
	return mapDoctorServices(
		await httpSessionPut<DoctorServicesView>(`${SERVICES_PATH}/order`, { body: { ids: [...ids] } })
	);
}
