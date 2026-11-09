import { createQueries } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { readQueryState } from '$shared/lib/query-state';
import {
	DOCTOR_AVAILABILITY_WINDOW_DAYS,
	doctorAvailabilitySlotsQuery
} from '$modules/doctor/api/availability';
import type {
	DoctorAvailabilityByOffice,
	DoctorAvailabilityReadState
} from '$modules/doctor/lib/detail';
import type { DoctorOfficeSlotsOptions } from '../types';

/**
 * 🔴 U-37.1 / D-103: every office's 28-day window for one service, asked the moment the page lives, one read per office
 * (TanStack's cache: the profile, its window and the booking's screens read the SAME keys). What answered, by office;
 * where the reads stand — `idle` (nothing to ask: no doctor, no service, no office), `waiting` (also on the server's
 * page: the slots are the browser's), `failed`, else `answered` — and the retry of only those that failed.
 */
export function useDoctorOfficeSlots(options: DoctorOfficeSlotsOptions) {
	const queries = createQueries(() => {
		const doctorId = options.doctorId();
		const serviceId = options.serviceId();
		return {
			queries: options.officeIds().map((officeId) => ({
				...doctorAvailabilitySlotsQuery({
					doctorId: doctorId ?? '',
					officeId,
					doctorServiceId: serviceId ?? '',
					days: DOCTOR_AVAILABILITY_WINDOW_DAYS
				}),
				enabled: browser && Boolean(doctorId) && Boolean(serviceId)
			}))
		};
	});

	const byOffice: DoctorAvailabilityByOffice = $derived.by(() => {
		const answered: DoctorAvailabilityByOffice = {};
		const officeIds = options.officeIds();
		queries.forEach((query, index) => {
			const officeId = officeIds[index];
			if (officeId && query.data) answered[officeId] = query.data;
		});
		return answered;
	});

	// Every read's every field is read (a TanStack result tells only the fields read).
	const state: DoctorAvailabilityReadState = $derived.by(() => {
		const states = queries.map((query) => readQueryState(query));
		if (!options.doctorId() || !options.serviceId() || states.length === 0) return 'idle';
		if (!browser) return 'waiting';
		if (states.some((entry) => entry === 'waiting')) return 'waiting';
		if (states.some((entry) => entry === 'failed' || entry === 'unavailable')) return 'failed';
		return 'answered';
	});

	return {
		get byOffice() {
			return byOffice;
		},
		get state() {
			return state;
		},
		/** «Δοκιμάστε ξανά»: asks again ONLY the windows that failed (lesson 7). */
		retry: () => {
			for (const query of queries) {
				if (query.isError || query.fetchStatus === 'paused') void query.refetch();
			}
		}
	};
}
