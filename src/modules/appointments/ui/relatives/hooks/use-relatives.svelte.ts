import { createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { bookingPatientQuery } from '$modules/appointments/api/patient';
import { relativesQuery } from '$modules/appointments/api/relatives';

/**
 * Screen 55 (P-W4 §4.6): the person (`GET /patient/me`, for its id) and its relatives whole for their forms
 * (`GET /patient/{patientId}/relatives`) — read in the browser for a member only (U-80.1 Ε6: the page's server knows
 * nobody), gone at a sign-out (`personalQueryMeta`). `blocked`: the server keeps no patient for the session (a doctor's
 * account): no relative to read or add, the application's «Φορτώνουμε ακόμη τον λογαριασμό σας…».
 */
export function useRelatives(options: { enabled: () => boolean }) {
	const patientRead = createQuery(() => ({
		...bookingPatientQuery(),
		enabled: browser && options.enabled()
	}));
	const patientId = $derived(options.enabled() ? (patientRead.data?.patientId ?? null) : null);
	const relativesRead = createQuery(() => ({
		...relativesQuery(patientId ?? ''),
		enabled: browser && patientId !== null
	}));

	const patientFailed = $derived(patientRead.isError && patientRead.data === undefined);
	const blocked = $derived(options.enabled() && patientRead.isSuccess && patientId === null);
	const relatives = $derived(patientId !== null ? relativesRead.data : undefined);
	const relativesFailed = $derived(
		patientId !== null && relativesRead.isError && relatives === undefined
	);

	return {
		/** The person's id once read (the writes name it), `null` before or without one. */
		get patientId() {
			return patientId;
		},
		/** Every relative, in the server's order; `[]` until read. */
		get rows() {
			return relatives ?? [];
		},
		get loaded() {
			return relatives !== undefined;
		},
		get loading() {
			return options.enabled() && !patientFailed && !blocked && !relativesFailed && !relatives;
		},
		get failed() {
			return options.enabled() && (patientFailed || relativesFailed);
		},
		get blocked() {
			return blocked;
		},
		/**
		 * «Δοκιμάστε ξανά» (review w4-w7 R1 MINOR-1): the person's own read until it gives an id, then the relatives' —
		 * never the relatives of nobody (a `refetch` runs a read that is not enabled: `/patient//relatives`), and
		 * nothing at all for a session with no patient to read.
		 */
		retry() {
			if (!options.enabled()) return;
			if (patientId === null) void patientRead.refetch();
			else void relativesRead.refetch();
		}
	};
}

export type Relatives = ReturnType<typeof useRelatives>;
