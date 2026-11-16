import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	doctorPatientCardQuery,
	mergeDoctorPatientRecord,
	readDoctorPatientMergeFailure
} from '$modules/doctor-dashboard/api/patients';
import { doctorPatientKeyOf } from '$modules/doctor-dashboard/lib/new';
import {
	buildDoctorPatientMergeLines,
	doctorPatientMergeFailureMessage
} from '$modules/doctor-dashboard/lib/patients';
import { getDoctorPatientMemoryOptional } from '$modules/doctor-dashboard/ui/memory';
import type { DoctorMergeState } from '../types';

/**
 * Wave 5.1 · screen 73's join (U-198.2, D-W51-67): the doctor's record, read as its card (the same read), the account it
 * may be the same as (`mergeCandidate`, the server's only) and the ONE write — only on the doctor's side:
 * - done ⇒ «Οι ασθενείς μου», the cards and their lists read again; the card says «Οι καρτέλες ενώθηκαν.» (the memory),
 *   and the record's address now answers the account's card;
 * - `409` / `404` / `403` ⇒ «δεν είναι πια δυνατή» (the card is read again); `429`, a lost request ⇒ its words, the
 *   question STAYS; `401` ⇒ the sign-in (U-84).
 */
export function useDoctorMerge(options: {
	recordId: () => string;
	locale: () => SupportedLocale;
	onDone: () => void;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const memory = getDoctorPatientMemoryOptional();
	const key = $derived({ kind: 'record' as const, id: options.recordId() });

	const card = createQuery(() => ({ ...doctorPatientCardQuery(key), enabled: browser }));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const read = $derived({
		data: card.data,
		error: card.error,
		isError: card.isError,
		isSuccess: card.isSuccess
	});
	const facts = $derived(read.data ?? null);
	const candidate = $derived(
		facts?.key.kind === 'record' && facts.editable ? facts.mergeCandidate : null
	);
	let failure = $state<string | null>(null);
	let sent = $state(false);

	const state = $derived.by((): DoctorMergeState => {
		if (facts) return candidate || sent ? 'ready' : 'closed';
		if (
			(read.error instanceof ApiError && [403, 404].includes(read.error.status)) ||
			(read.isSuccess && read.data === null)
		) {
			return 'missing';
		}
		return read.isError ? 'failed' : 'loading';
	});
	const lines = $derived(facts ? buildDoctorPatientMergeLines(facts, options.locale()) : []);

	const write = createMutation<unknown, unknown, string>(() => ({
		networkMode: 'always' as const,
		mutationFn: (patientId: string) => mergeDoctorPatientRecord(options.recordId(), patientId),
		onSuccess: () => {
			sent = true;
			memory?.remember(doctorPatientKeyOf(key), 'merged');
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.patients() });
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.appointments() });
			options.onDone();
		},
		onError: (error: unknown) => {
			const outcome = readDoctorPatientMergeFailure(error);
			if (outcome.kind === 'session') {
				session?.expire({});
				return;
			}
			if (outcome.kind === 'gone') {
				void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.patients() });
			}
			failure = doctorPatientMergeFailureMessage(outcome, options.locale());
		}
	}));

	return {
		get state() {
			return state;
		},
		/** The question in words: the two names, the app, «δεν αναιρείται». */
		get lines() {
			return lines;
		},
		get failure() {
			return failure;
		},
		get sending() {
			return write.isPending;
		},
		/** One press, one write: to the account the server named, never another. */
		send() {
			if (write.isPending || sent || !candidate) return;
			failure = null;
			write.mutate(candidate.key.id);
		},
		retry() {
			void card.refetch();
		}
	};
}

export type DoctorMergeRead = ReturnType<typeof useDoctorMerge>;
