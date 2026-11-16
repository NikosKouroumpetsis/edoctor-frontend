import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { createForm } from '$shared/lib/form';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	doctorPatientCardQuery,
	readDoctorPatientRecordFailure,
	updateDoctorPatientRecord,
	type DoctorPatientRecordPatch
} from '$modules/doctor-dashboard/api/patients';
import { doctorPatientKeyOf } from '$modules/doctor-dashboard/lib/new';
import {
	doctorPatientRecordFailureMessage,
	doctorPatientRecordFieldMessage,
	doctorPatientRecordForm,
	toDoctorPatientRecordPatch,
	toDoctorPatientRecordValues,
	type DoctorPatientRecordValues
} from '$modules/doctor-dashboard/lib/patients';
import { getDoctorPatientMemoryOptional } from '$modules/doctor-dashboard/ui/memory';
import type { DoctorRecordState } from '../types';

/**
 * Wave 5.1 · screen 73 «Στοιχεία ασθενή» (D-W51-66, D-W51-76): the doctor's own record, read as its card (the same read,
 * the same cache), its six fields in the shared form — opened with the record as the doctor keeps it, the rules said
 * before the write (U-65.6; the server checks them again) — and the ONE write:
 * - done ⇒ «Οι ασθενείς μου», the cards and their lists read again; the card says «Αποθηκεύτηκε.» (the memory);
 * - `422` ⇒ the fields the server named, under each its own words; `409` ⇒ «δεν αλλάζει πια» (joined to an account);
 *   `404` / `403` ⇒ the card is gone; `429`, a lost request ⇒ its words, the form STAYS; `401` ⇒ the sign-in (U-84).
 */
export function useDoctorRecord(options: {
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

	const form = createForm<DoctorPatientRecordValues>({
		...doctorPatientRecordForm(untrack(() => options.locale())),
		onSubmit: (values) => save(values)
	});
	// The form opens with the record as it was read, once (a read again never writes over what is typed).
	let filled = false;
	$effect(() => {
		const current = facts;
		if (filled || !current || current.key.kind !== 'record') return;
		filled = true;
		untrack(() => {
			form.values = toDoctorPatientRecordValues(current);
		});
	});

	let failure = $state<string | null>(null);
	let closedNow = $state(false);

	const state = $derived.by((): DoctorRecordState => {
		if (closedNow) return 'closed';
		if (facts) {
			// A record joined meanwhile answers the account's card (D-W51-67): it no longer changes.
			return facts.key.kind === 'record' && facts.editable ? 'form' : 'closed';
		}
		if (
			(read.error instanceof ApiError && [403, 404].includes(read.error.status)) ||
			(read.isSuccess && read.data === null)
		) {
			return 'missing';
		}
		return read.isError ? 'failed' : 'loading';
	});

	const write = createMutation<unknown, unknown, DoctorPatientRecordPatch>(() => ({
		networkMode: 'always' as const,
		mutationFn: (patch: DoctorPatientRecordPatch) =>
			updateDoctorPatientRecord(options.recordId(), patch),
		onSuccess: () => {
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.patients() });
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.appointments() });
			memory?.remember(doctorPatientKeyOf(key), 'saved');
			options.onDone();
		},
		onError: (error: unknown) => {
			const locale = options.locale();
			const outcome = readDoctorPatientRecordFailure(error);
			if (outcome.kind === 'session') {
				// 🔴 U-84: the session ended under the screen; what was typed stays for the same person.
				session?.expire({});
				return;
			}
			for (const field of outcome.fields) {
				form.errors[field] = doctorPatientRecordFieldMessage(field, outcome, locale);
				form.setTouched(field);
			}
			if (outcome.kind === 'merged') {
				closedNow = true;
				void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.patients() });
			}
			failure = doctorPatientRecordFailureMessage(outcome, locale);
		}
	}));

	/** One press, one write: only a form whole by its rules leaves (the server checks it again). */
	function save(values: DoctorPatientRecordValues) {
		if (write.isPending) return;
		const patch = toDoctorPatientRecordPatch(values);
		if (!patch) return;
		failure = null;
		write.mutate(patch);
	}

	return {
		get state() {
			return state;
		},
		get form() {
			return form;
		},
		/** The words of a refused write, over the bar (`null`: none). */
		get failure() {
			return failure;
		},
		get sending() {
			return write.isPending;
		},
		submit() {
			void form.handleSubmit();
		},
		retry() {
			void card.refetch();
		}
	};
}

export type DoctorRecordRead = ReturnType<typeof useDoctorRecord>;
