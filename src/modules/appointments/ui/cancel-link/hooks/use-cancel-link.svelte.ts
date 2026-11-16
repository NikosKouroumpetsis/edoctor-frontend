import { createMutation, createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { createForm } from '$shared/lib/form';
import {
	cancelAppointmentByLink,
	getAppointmentCancelLink,
	readAppointmentCancelLinkFailure,
	type AppointmentCancelLinkFacts,
	type AppointmentCancelLinkRequest
} from '$modules/appointments/api/cancel-link';
import { appointmentCancelLinkQueryKey } from '$modules/appointments/api/keys';
import { cancelFormRules, toCancelRequest } from '$modules/appointments/lib/cancel';
import {
	appointmentCancelLinkView,
	cancelLinkFailureText,
	toCancelLinkRequest
} from '$modules/appointments/lib/cancel-link';
import type { AppointmentCancelLinkState } from '../types';

/**
 * 🔴 D-W51-72 · U-198.1: the cancel link's page — ONE read of the link (no session, never the cookies; never on its own
 * again: every read counts against the server's 30 an hour), the 53's form (a reason of the patient's five, the words at
 * most 500) and its ONE write. After the write:
 * - success ⇒ «Το ραντεβού ακυρώθηκε.» + «Ο γιατρός ενημερώθηκε.» over the link's box; nothing is read again (spent);
 * - `404` ⇒ «Ο σύνδεσμος δεν ισχύει πια.» (used, revoked, expired: one answer, D-W51-58);
 * - `403 CANCEL_AFTER_CANCELLATION_CUTOFF` and `409` ⇒ the link read again: the page shows how it stands now;
 * - `422`, a lost request, `5xx`, `429` ⇒ its words, the reason and the words STAY.
 * 🔴 No second press, and the token never leaves the address of the request (D-W51-72).
 * 🔴 D-W51-72 (round 2, live 15/11): the read leaves at once and waits for nothing — the link is the holder's, not the
 * session's, so it never wears the sign-out's mark (`personalQueryMeta`) and lives on a key of its own: the auth host
 * forgets every marked read at a guest's answer (`removePersonalQueries`), which ended this read on its way and left the
 * page «loading» (~21″ live, for ever in a test).
 */
export function useAppointmentCancelLink(options: {
	token: () => string | null;
	locale: () => SupportedLocale;
}) {
	const query = createQuery(() => {
		const token = options.token();
		return {
			queryKey: appointmentCancelLinkQueryKey(token ?? ''),
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				getAppointmentCancelLink(token as string, signal),
			enabled: browser && token !== null,
			staleTime: Infinity,
			retry: false,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false
		};
	});
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const read = $derived({
		data: query.data,
		error: query.error,
		isError: query.isError,
		isSuccess: query.isSuccess,
		isFetching: query.isFetching
	});

	// The cancel took (the page keeps the link's read: the doctor, the office and the hour did not change), or the link
	// is spent.
	let done = $state(false);
	let spent = $state(false);
	let failure = $state<string | null>(null);

	const state = $derived.by((): AppointmentCancelLinkState => {
		if (done && read.data) return 'done';
		if (!options.token() || spent) return 'gone';
		if (read.isError) {
			const reason = readAppointmentCancelLinkFailure(read.error, 'read');
			if (reason === 'gone') return 'gone';
			return reason === 'rate-limited' ? 'rate-limited' : 'failed';
		}
		if (read.isSuccess) {
			if (!read.data) return 'gone';
			const view = appointmentCancelLinkView(read.data);
			return view === 'form' ? 'form' : view;
		}
		return 'loading';
	});

	const form = createForm({
		initialValues: { reason: '', message: '' },
		validators: cancelFormRules(),
		onSubmit: (values) => {
			const request = toCancelLinkRequest(toCancelRequest(values.reason, values.message));
			if (!request) return;
			failure = null;
			write.mutate(request);
		}
	});

	const write = createMutation<
		AppointmentCancelLinkFacts | null,
		unknown,
		AppointmentCancelLinkRequest
	>(() => ({
		networkMode: 'always' as const,
		mutationFn: (request: AppointmentCancelLinkRequest) =>
			cancelAppointmentByLink(options.token() as string, request),
		onSuccess: (answered: AppointmentCancelLinkFacts | null) => {
			// The cancel took (never read again, the link is spent); an answer that names no visit ⇒ «δεν ισχύει».
			if (answered) done = true;
			else spent = true;
		},
		onError: (error: unknown) => {
			const reason = readAppointmentCancelLinkFailure(error, 'write');
			if (reason === 'gone') {
				spent = true;
				return;
			}
			if (reason === 'deadline' || reason === 'changed') {
				void query.refetch();
				return;
			}
			failure = cancelLinkFailureText(reason, options.locale());
		}
	}));

	return {
		get state() {
			return state;
		},
		/** The link's page as the server answered it (the canceled visit after the write). */
		get link() {
			return read.data ?? null;
		},
		get form() {
			return form;
		},
		get failure() {
			return failure;
		},
		get sending() {
			return write.isPending;
		},
		/** 🔴 ONE press, only with a reason; refused while one is on its way or once the server took it. */
		submit() {
			if (write.isPending || done || !form.values.reason) return;
			void form.handleSubmit();
		},
		clearFailure() {
			failure = null;
		},
		retry() {
			if (!read.isFetching) void query.refetch();
		}
	};
}

export type AppointmentCancelLinkRead = ReturnType<typeof useAppointmentCancelLink>;
