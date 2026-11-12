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
 *
 * 🔴 Σ1 (live check w4-live-web): the reads are told through `combine` as ONE object with ONE constant key, each read
 * beside its own office — never as the library's array, whose proxy throws «'deleteProperty' on proxy» once the offices
 * shrink by two or more at once (`@tanstack/svelte-query` 6.1.27, `dist/containers.svelte.js:73-95`; the reason whole
 * in `ui/public-profiles`).
 */
export function useDoctorOfficeSlots(options: DoctorOfficeSlotsOptions) {
	const slots = createQueries(() => {
		const doctorId = options.doctorId();
		const serviceId = options.serviceId();
		const officeIds = options.officeIds();
		return {
			queries: officeIds.map((officeId) => ({
				...doctorAvailabilitySlotsQuery({
					doctorId: doctorId ?? '',
					officeId,
					doctorServiceId: serviceId ?? '',
					days: DOCTOR_AVAILABILITY_WINDOW_DAYS
				}),
				enabled: browser && Boolean(doctorId) && Boolean(serviceId)
			})),
			// Every read's every field is read HERE (a TanStack result tells only the fields read).
			combine: (results) => ({
				reads: results.map((query, index) => ({
					officeId: officeIds[index],
					data: query.data,
					state: readQueryState(query),
					stuck: query.isError || query.fetchStatus === 'paused',
					refetch: query.refetch
				}))
			})
		};
	});

	const byOffice: DoctorAvailabilityByOffice = $derived.by(() => {
		const answered: DoctorAvailabilityByOffice = {};
		for (const read of slots.reads) {
			if (read.officeId && read.data) answered[read.officeId] = read.data;
		}
		return answered;
	});

	const state: DoctorAvailabilityReadState = $derived.by(() => {
		const states = slots.reads.map((read) => read.state);
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
			for (const read of slots.reads) {
				if (read.stuck) void read.refetch();
			}
		}
	};
}
