import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { m } from '$paraglide/messages.js';
import { createForm, type ValidatorFn } from '$shared/lib/form';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import {
	changeDoctorCredentialGroup,
	doctorCredentialsQuery,
	readDoctorCredentialsFailure,
	type DoctorCredentialFacts,
	type DoctorCredentialGroupChange,
	type DoctorCredentialKind
} from '$modules/doctor-dashboard/api/credentials';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { DOCTOR_CREDENTIAL_LIMIT } from '$modules/doctor-dashboard/config';
import {
	doctorCredentialError,
	doctorCredentialLastYear,
	doctorCredentialMessages,
	doctorCredentialRemoved,
	doctorCredentialSaved,
	doctorCredentialsFailureText,
	emptyDoctorCredentialValues,
	keepDoctorCredentialYearInput,
	toDoctorCredentialItem,
	toDoctorCredentialValues,
	type DoctorCredentialField,
	type DoctorCredentialValues
} from '$modules/doctor-dashboard/lib/cv';
import type { DoctorCredentialState } from '../types';

type Change = { act: 'save' | 'delete'; change: DoctorCredentialGroupChange };

/**
 * Wave 5.2 · screen 81, the page of ONE row of the biography (U-210, D-W52-61 / 63).
 * - ONE read of the session's own doctor (the biography, Greek alone). What the page is — the row as the server keeps
 *   it, a new one, a row that is no longer there, a group that already holds twenty — is settled by the FIRST answer;
 *   a read that comes back later never writes over what is typed.
 * - The rules are the server's, said before the save — and only once «Αποθήκευση» was pressed (then at every keystroke).
 * - «Αποθήκευση» / «Διαγραφή»: the biography is read AGAIN and the WHOLE group goes back from that answer with the one
 *   change, in ONE write. Done ⇒ the cache holds the server's answer, «Το προφίλ μου» and everything under it are read
 *   again, «Αποθηκεύτηκε.» / «Διαγράφηκε.», and the page closes. Nothing is shown as saved before the server says so.
 * - A refusal says why in the page's words and what was typed STAYS. A `401` ends the session.
 */
export function useDoctorCredential(options: {
	locale: () => SupportedLocale;
	kind: () => DoctorCredentialKind;
	id: () => string | null;
	onDone: () => void;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	// The page is made anew for each row (its host keys it by the address): the group and the id never change under it.
	const kind = untrack(() => options.kind());
	const id = untrack(() => options.id());
	// The last year a row may name is the one of the moment the page opened (the server checks on its own clock).
	const lastYear = doctorCredentialLastYear(Date.now());

	const read = createQuery(() => ({ ...doctorCredentialsQuery(), enabled: browser }));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const answer = $derived({ data: read.data, isError: read.isError, error: read.error });

	// The rules speak only after the first «Αποθήκευση» (`sw.js` `cvShowErr`); from then on at every change.
	let checked = $state(false);
	const rule =
		(field: DoctorCredentialField): ValidatorFn =>
		() => {
			if (!checked) return null;
			const broken = doctorCredentialError(field, kind, form.values, lastYear);
			return broken ? { [broken]: true } : null;
		};
	const form = createForm<DoctorCredentialValues>({
		initialValues: emptyDoctorCredentialValues(),
		validators: {
			title: [rule('title')],
			startYear: [rule('startYear')],
			endYear: [rule('endYear')]
		},
		messages: doctorCredentialMessages(
			kind,
			untrack(() => options.locale()),
			lastYear
		),
		onSubmit: (values) => save(values)
	});

	// Settled ONCE, by the first answer: the page of a row that exists opens with the row as it was read.
	let opened = $state<Exclude<DoctorCredentialState, 'loading' | 'failed'> | null>(null);
	// What a deletion asks about: the row's title as the server keeps it (never what is being typed).
	let savedTitle = $state('');
	$effect(() => {
		const rows = answer.data;
		if (opened !== null || rows === undefined) return;
		untrack(() => {
			const group = rows.filter((row) => row.kind === kind);
			if (id === null) {
				opened = group.length >= DOCTOR_CREDENTIAL_LIMIT ? 'full' : 'ready';
				return;
			}
			const row = group.find((entry) => entry.id === id);
			if (!row) {
				opened = 'missing';
				return;
			}
			form.values = toDoctorCredentialValues(row);
			savedTitle = row.title;
			opened = 'ready';
		});
	});
	// A save found the row gone, or the group full, on the server's last answer: the page has nothing left to offer.
	let closed = $state<'missing' | 'full' | null>(null);

	const state = $derived.by((): DoctorCredentialState => {
		if (closed) return closed;
		if (opened) return opened;
		return answer.data === undefined && answer.isError ? 'failed' : 'loading';
	});

	// One refusal ends the session once, however often the page draws itself again.
	let ended: unknown = null;
	$effect(() => {
		const error = answer.error;
		if (!(error instanceof ApiError) || error.status !== 401 || error === ended) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	let failure = $state<string | null>(null);
	let deleteFailure = $state<string | null>(null);
	// The write's own gate: the library tells of a write that began only a timer later (the `writing` gate of the
	// sign-up's steps), so a second press in between would send the group twice.
	let writing = $state<'save' | 'delete' | null>(null);

	function finish(act: Change['act']) {
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.profile() });
		const messages = { locale: options.locale() };
		toasts?.show({
			message:
				act === 'save' ? m.doctor_photos_saved({}, messages) : m.doctor_cv_deleted({}, messages)
		});
		options.onDone();
	}

	const write = createMutation<DoctorCredentialFacts[] | null, unknown, Change>(() => ({
		networkMode: 'always' as const,
		mutationFn: ({ change }: Change) => changeDoctorCredentialGroup(kind, change),
		onSettled: () => {
			writing = null;
		},
		onSuccess: (rows, { act }) => {
			if (rows) {
				client.setQueryData<DoctorCredentialFacts[]>(
					doctorDashboardQueryKeys.profileCredentials(),
					rows
				);
			}
			finish(act);
		},
		onError: (error: unknown, { act }) => {
			const reason = readDoctorCredentialsFailure(error);
			if (reason === 'session') {
				// 🔴 U-84: the session ended under the page; what was typed stays for the same person.
				session?.expire({});
				return;
			}
			if (act === 'delete' && reason === 'gone') {
				// Deleted elsewhere in the meantime: the row is gone, which is what was asked.
				finish(act);
				return;
			}
			// The biography is no longer what the page read: everything under «Το προφίλ μου» is read again.
			if (reason !== 'rate-limited' && reason !== 'unknown') {
				void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.profile() });
			}
			if (reason === 'gone') closed = 'missing';
			if (reason === 'full') closed = 'full';
			const words = doctorCredentialsFailureText(reason, options.locale());
			if (act === 'delete') {
				deleteFailure =
					reason === 'rate-limited'
						? words
						: m.doctor_photos_delete_failed({}, { locale: options.locale() });
			} else failure = words;
		}
	}));

	/** One press, one write: only a page whole by its rules leaves (the server checks it again). */
	function save(values: DoctorCredentialValues) {
		if (writing || state !== 'ready') return;
		const item = toDoctorCredentialItem(kind, values, lastYear);
		if (!item) return;
		writing = 'save';
		failure = null;
		write.mutate({ act: 'save', change: doctorCredentialSaved(id, item) });
	}

	/** After the first «Αποθήκευση» every change is checked again, the fields beside it too. */
	function changed() {
		failure = null;
		if (checked) form.validate();
	}

	return {
		get state() {
			return state;
		},
		get form() {
			return form;
		},
		/** «Σήμερα»: the row is still going on — «Έως» reads «Σήμερα» and is not written. Never on a conference. */
		get current() {
			return kind !== 'CONFERENCE' && form.values.isCurrent;
		},
		/** The last year a row may name (next year), for the example of a year. */
		get lastYear() {
			return lastYear;
		},
		/** The title a deletion asks about, as the server keeps it. */
		get savedTitle() {
			return savedTitle;
		},
		/** The words of a refused save, over the bar (`null`: none). */
		get failure() {
			return failure;
		},
		get deleteFailure() {
			return deleteFailure;
		},
		get saving() {
			return writing === 'save';
		},
		get deleting() {
			return writing === 'delete';
		},
		/** A text field was typed in. */
		changed,
		/** A year's field keeps its digits alone, four at most. */
		setYear(field: 'startYear' | 'endYear', typed: string) {
			form.setValue(field, keepDoctorCredentialYearInput(typed));
			changed();
		},
		/** The tick «Σε εξέλιξη» / «Εργάζομαι εδώ σήμερα»: under it «Έως» is emptied. Nothing is sent. */
		toggleCurrent() {
			if (writing || kind === 'CONFERENCE') return;
			const next = !form.values.isCurrent;
			form.setValue('isCurrent', next);
			if (next) form.setValue('endYear', '');
			changed();
		},
		submit() {
			if (writing) return;
			checked = true;
			void form.handleSubmit();
		},
		/** «Διαγραφή», confirmed: the group goes back without the row. */
		remove() {
			if (writing || id === null) return;
			writing = 'delete';
			deleteFailure = null;
			write.mutate({ act: 'delete', change: doctorCredentialRemoved(id) });
		},
		/** The window of the deletion closed: its words go with it. */
		clearDeleteFailure() {
			deleteFailure = null;
		},
		/** «Δοκιμάστε ξανά»: the read without an answer is asked for again. */
		retry() {
			void read.refetch();
		}
	};
}

export type DoctorCredential = ReturnType<typeof useDoctorCredential>;
