import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { m } from '$paraglide/messages.js';
import { createForm } from '$shared/lib/form';
import { ApiError } from '$shared/lib/http';
import { readServerNow } from '$shared/lib/server-clock';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	doctorMyPracticeLicenceQuery,
	doctorMyProfileQuery
} from '$modules/doctor-dashboard/api/profile';
import {
	createDoctorService,
	deleteDoctorService,
	doctorAllowedServicesQuery,
	doctorServicesListQuery,
	readDoctorServicesFailure,
	updateDoctorService,
	type DoctorServiceDraft
} from '$modules/doctor-dashboard/api/services';
import {
	doctorServiceError,
	doctorServiceErrorText,
	doctorServiceSuggestion,
	doctorServiceSuggestionOffer,
	doctorServicesFailureText,
	doctorServiceYearsLimit,
	keepDoctorServiceDigits,
	newDoctorServiceValues,
	toDoctorServiceDraft,
	toDoctorServiceValues,
	type DoctorServiceField,
	type DoctorServiceValues
} from '$modules/doctor-dashboard/lib/services';
import type { DoctorServiceState, DoctorServiceSubject } from '../types';

type Act = 'save' | 'delete';

/**
 * Wave 5.2 · screen 83, the page of ONE service (U-212, U-214, U-217.3, D-W52-82).
 * - Its reads: the doctor's services (the one it is, and whether it is the last), the catalogue of the specialty (the
 *   new one, and eDoctor's texts for the button of U-214), the practice licence (the most years). What the page is —
 *   the service as stored, a new one, one that is no longer there, one the doctor already offers — is settled by the
 *   FIRST answer; a read that comes back later never writes over what is typed.
 * - 🔴 U-214.1 / U-214.4: the fields hold the DOCTOR's texts alone — a new one starts empty — and only the button
 *   copies eDoctor's into them; nothing is kept before «Αποθήκευση». 🔴 U-217.3: a new one starts with no price.
 * - The rules (price 1–9999, years up to the licence's) speak only once «Αποθήκευση» was pressed, then at every change.
 * - «Αποθήκευση» is ONE write (`POST` a new one, `PATCH` a stored one); «Διαγραφή» is asked first. Done ⇒ «Το προφίλ μου»,
 *   this list and the lists of 70 / 72 are read again, «Αποθηκεύτηκε.» / «Η υπηρεσία διαγράφηκε.», the page closes.
 * - A refusal says why in the page's words and what was typed STAYS; the last service is never deleted (D-W52-74: the
 *   page's own sentence, and the server's 409 says the same). A `401` ends the session.
 */
export function useDoctorService(options: {
	locale: () => SupportedLocale;
	subject: () => DoctorServiceSubject;
	onDone: () => void;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	// The page is made anew for each address (its host keys it): the subject never changes under it.
	const subject = untrack(() => options.subject());
	const locale = untrack(() => options.locale());
	const messages = () => ({ locale: options.locale() });

	const list = createQuery(() => ({ ...doctorServicesListQuery(locale), enabled: browser }));
	const allowed = createQuery(() => ({ ...doctorAllowedServicesQuery(locale), enabled: browser }));
	const licence = createQuery(() => ({ ...doctorMyPracticeLicenceQuery(), enabled: browser }));
	const profile = createQuery(() => ({
		...doctorMyProfileQuery(locale),
		enabled: browser && subject.view === 'new'
	}));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const answers = $derived({
		services: list.data,
		servicesFailed: list.isError,
		options: allowed.data,
		optionsFailed: allowed.isError,
		licence: licence.data,
		doctorId: profile.data?.doctorId,
		errors: [list.error, allowed.error, licence.error, profile.error]
	});

	const form = createForm<DoctorServiceValues>({
		initialValues: { price: '', durationInMinutes: null, subtitle: '', description: '', years: '' }
	});

	// Settled ONCE, by the first answer.
	let opened = $state<Exclude<DoctorServiceState, 'loading' | 'failed'> | null>(null);
	let title = $state('');
	let serviceId = $state<string | null>(subject.view === 'new' ? subject.serviceId : null);
	$effect(() => {
		const services = answers.services;
		const catalogue = answers.options;
		if (opened !== null) return;
		untrack(() => {
			if (subject.view === 'service') {
				if (services === undefined) return;
				const service = services.find((entry) => entry.id === subject.id);
				if (!service) {
					opened = 'missing';
					return;
				}
				form.values = toDoctorServiceValues(service);
				title = service.title;
				serviceId = service.serviceId;
				opened = 'ready';
				return;
			}
			if (catalogue === undefined) return;
			const option = catalogue.find((entry) => entry.serviceId === subject.serviceId);
			if (!option) {
				opened = 'missing';
				return;
			}
			title = option.title;
			if (option.owned) {
				opened = 'owned';
				return;
			}
			form.values = newDoctorServiceValues(option);
			opened = 'ready';
		});
	});
	// A write found the service gone, or the new one already offered: the page has nothing left to offer.
	let closed = $state<'missing' | 'owned' | null>(null);

	const state = $derived.by((): DoctorServiceState => {
		if (closed) return closed;
		if (opened) return opened;
		const failed = subject.view === 'service' ? answers.servicesFailed : answers.optionsFailed;
		return failed ? 'failed' : 'loading';
	});

	let ended: unknown = null;
	$effect(() => {
		const error = answers.errors.find((entry) => entry instanceof ApiError && entry.status === 401);
		if (!error || error === ended) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	// 🔴 U-212.1: the years never past those of the practice licence, on the server's clock; without one the server's 70.
	const yearsLimit = $derived(
		doctorServiceYearsLimit(answers.licence?.obtainedDay ?? null, readServerNow())
	);
	// 🔴 U-214: eDoctor's texts of THIS service, behind the button only.
	const suggestion = $derived(
		doctorServiceSuggestion(answers.options?.find((option) => option.serviceId === serviceId))
	);
	const offer = $derived(doctorServiceSuggestionOffer(form.values, suggestion));
	// The last service is never deleted (D-W52-74): the page says so in the place of «Διαγραφή υπηρεσίας».
	const last = $derived(subject.view === 'service' && (answers.services?.length ?? 0) <= 1);

	// The rules speak only after the first «Αποθήκευση» (`sw.js` `usShowErr`); from then on at every change.
	let checked = $state(false);
	// The server said the years are past the licence (its clock, its licence): said under the field until it changes.
	let refusedYears = $state(false);
	const errorOf = (field: DoctorServiceField) => {
		if (field === 'years' && refusedYears)
			return doctorServiceErrorText('years', locale, yearsLimit);
		if (!checked) return undefined;
		return doctorServiceError(field, form.values, yearsLimit)
			? doctorServiceErrorText(field, locale, yearsLimit)
			: undefined;
	};
	const errors = $derived({ price: errorOf('price'), years: errorOf('years') });

	let failure = $state<string | null>(null);
	let deleteFailure = $state<string | null>(null);
	// The write's own gate: the library tells of a write that began only a timer later.
	let writing = $state<Act | null>(null);

	function finish(act: Act) {
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.profile() });
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.servicesAll() });
		toasts?.show({
			message:
				act === 'save'
					? m.doctor_photos_saved({}, messages())
					: m.doctor_my_service_deleted({}, messages())
		});
		options.onDone();
	}

	async function send(draft: DoctorServiceDraft): Promise<unknown> {
		if (subject.view === 'service') return updateDoctorService(subject.id, draft);
		if (draft.durationInMinutes === null) throw new ApiError('No length', 0, '');
		const doctorId =
			answers.doctorId ?? (await client.fetchQuery(doctorMyProfileQuery(locale))).doctorId;
		return createDoctorService(doctorId, subject.serviceId, {
			...draft,
			durationInMinutes: draft.durationInMinutes
		});
	}

	const write = createMutation<unknown, unknown, { act: Act; draft?: DoctorServiceDraft }>(() => ({
		networkMode: 'always' as const,
		mutationFn: ({ act, draft }) =>
			act === 'delete' && subject.view === 'service'
				? deleteDoctorService(subject.id)
				: send(draft as DoctorServiceDraft),
		onSettled: () => {
			writing = null;
		},
		onSuccess: (_answer, { act }) => finish(act),
		onError: (error: unknown, { act }) => {
			const reason = readDoctorServicesFailure(error);
			if (reason === 'session') {
				// 🔴 U-84: the session ended under the page; what was typed stays for the same person.
				session?.expire({});
				return;
			}
			if (act === 'delete') {
				// Deleted elsewhere in the meantime: the service is gone, which is what was asked.
				if (reason === 'gone') {
					finish(act);
					return;
				}
				deleteFailure =
					reason === 'last' || reason === 'rate-limited'
						? doctorServicesFailureText(reason, options.locale())
						: m.doctor_photos_delete_failed({}, messages());
				if (reason === 'last')
					void client.invalidateQueries({
						queryKey: doctorDashboardQueryKeys.profileServices(locale)
					});
				return;
			}
			if (reason === 'years') {
				refusedYears = true;
				return;
			}
			if (reason === 'gone') closed = 'missing';
			if (reason === 'owned' && subject.view === 'new') closed = 'owned';
			if (reason !== 'rate-limited' && reason !== 'unknown') {
				void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.profile() });
			}
			failure = doctorServicesFailureText(reason, options.locale());
		}
	}));

	/** Something was typed or picked: the refusal's words go, the rules speak again once they spoke. */
	function changed() {
		failure = null;
	}

	return {
		get state() {
			return state;
		},
		get values() {
			return form.values;
		},
		/** The catalogue's title of the service: the page's heading, and what a deletion asks about. */
		get title() {
			return title;
		},
		get errors() {
			return errors;
		},
		get yearsLimit() {
			return yearsLimit;
		},
		/** The button of U-214, and whether it replaces what is written; `null`: no button. */
		get offer() {
			return offer;
		},
		/** The doctor's only service: never deleted (D-W52-74). */
		get last() {
			return last;
		},
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
		/** A field of digits keeps its digits alone (four for the price, two for the years). */
		setDigits(field: DoctorServiceField, typed: string) {
			form.setValue(field, keepDoctorServiceDigits(typed, field));
			if (field === 'years') refusedYears = false;
			changed();
		},
		setText(field: 'subtitle' | 'description', typed: string) {
			form.setValue(field, typed);
			changed();
		},
		/** A length of the list (D-W52-10). */
		setDuration(minutes: number) {
			if (writing) return;
			form.setValue('durationInMinutes', minutes);
			changed();
		},
		/** 🔴 U-214.1: «Συμπλήρωση με την πρόταση του eDoctor» — both fields get eDoctor's texts; nothing is sent. */
		suggest(): boolean {
			if (!suggestion || writing) return false;
			form.setValue('subtitle', suggestion.subtitle);
			form.setValue('description', suggestion.description);
			changed();
			toasts?.show({ message: m.doctor_my_service_suggested({}, messages()) });
			return true;
		},
		/** One press, one write: only a page whole by its rules leaves (the server checks it again). */
		submit() {
			if (writing || state !== 'ready') return;
			checked = true;
			const draft = toDoctorServiceDraft(form.values, yearsLimit);
			if (!draft || refusedYears) return;
			writing = 'save';
			failure = null;
			write.mutate({ act: 'save', draft });
		},
		/** «Διαγραφή», confirmed. Never the last one. */
		remove() {
			if (writing || subject.view !== 'service' || last) return;
			writing = 'delete';
			deleteFailure = null;
			write.mutate({ act: 'delete' });
		},
		clearDeleteFailure() {
			deleteFailure = null;
		},
		retry() {
			void (subject.view === 'service' ? list.refetch() : allowed.refetch());
		}
	};
}

export type DoctorService = ReturnType<typeof useDoctorService>;
