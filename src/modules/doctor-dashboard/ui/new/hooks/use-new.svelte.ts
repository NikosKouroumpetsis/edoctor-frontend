import { untrack } from 'svelte';
import {
	createInfiniteQuery,
	createMutation,
	createQuery,
	useQueryClient
} from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { m } from '$paraglide/messages.js';
import { useDebouncedValue } from '$shared/lib/debounce';
import { createForm } from '$shared/lib/form';
import { readServerNow } from '$shared/lib/server-clock';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import {
	createDoctorAppointment,
	doctorNewSlotsQuery,
	doctorServicesQuery,
	readDoctorBookFailure,
	type DoctorAppointmentDetailFacts,
	type DoctorNewAppointmentRequest,
	type DoctorNewPatientField
} from '$modules/doctor-dashboard/api/appointments';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { doctorOfficesQuery } from '$modules/doctor-dashboard/api/offices';
import {
	doctorPatientPhoneQuery,
	doctorPatientQuery,
	doctorPatientSearchQuery
} from '$modules/doctor-dashboard/api/patients';
import { doctorSmsBalanceQuery, doctorSmsSettingsQuery } from '$modules/doctor-dashboard/api/sms';
import {
	DOCTOR_PATIENT_SEARCH_DEBOUNCE_MS,
	DOCTOR_TODAY_POLL_MS
} from '$modules/doctor-dashboard/config';
import { buildDoctorMoveDays, doctorMoveSelectedDay } from '$modules/doctor-dashboard/lib/move';
import {
	buildDoctorNewOfficeChoices,
	clampDoctorPatientSearch,
	doctorNewChannels,
	doctorNewPatientForm,
	doctorPatientKeyOf,
	isDoctorNewPatientComplete,
	readDoctorGreekMobile,
	toDoctorNewAppointmentRequest,
	type DoctorNewChannel,
	type DoctorNewPatientValues,
	type DoctorNewPerson
} from '$modules/doctor-dashboard/lib/new';
import type { DoctorNewAppointmentPatientKey } from '$modules/doctor-dashboard/lib/paths';
import { getDoctorAppointmentMemoryOptional } from '$modules/doctor-dashboard/ui/memory';
import type { DoctorNewPatientStep, DoctorNewReadState, DoctorNewState } from '../types';

/**
 * Wave 5.1 · screen 72 «Νέο ραντεβού» (D-W51-69 / 70): the doctor's offices and services (screen 67's and 70's reads),
 * the patient — the search of «οι ασθενείς μου» (quiet a moment, 40 at most), «Νέος ασθενής» in the shared form with the
 * server's bounds and «ίδιο κινητό», or the one the address names (`?kind=&id=`) —, the office (with more than one), ONE
 * service, the doctor's REAL free hours of screen 70, the SMS switch and what is left of the packages, and the ONE write
 * (`POST /appointment/appointments`, `booked`, U-197.2). After the write (D-W51-70):
 * - success ⇒ the answer IS the new appointment's detail, put in its cache; the lists and the people read again; the
 *   summary's channels remembered for its 68's green card «Το ραντεβού κλείστηκε.» (never in the address); its 68;
 * - `409` (the hour taken meanwhile) ⇒ its words, the hour leaves the grid and the hours are read again;
 * - `422` ⇒ the fields the server named under them (the new patient's), else its words; `404` ⇒ the person is no longer
 *   the doctor's: back to the search; a lost request, `5xx`, `403`, `429` ⇒ its words, the form STAYS; `401` ⇒ the
 *   sign-in over the screen (U-84). A failed write with a new patient reads the people again: the record the server kept
 *   (D-W51-56) then shows as «ίδιο κινητό», never a second one by mistake.
 * 🔴 No second press: the button waits while one is on its way, and none goes once the server took it.
 */
export function useDoctorNew(options: {
	locale: () => SupportedLocale;
	patient: () => DoctorNewAppointmentPatientKey | null;
	/** The new appointment's 68, once the server took it. */
	onDone: (appointmentId: string) => void;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const memory = getDoctorAppointmentMemoryOptional();

	const offices = createQuery(() => ({ ...doctorOfficesQuery(), enabled: browser }));
	const services = createQuery(() => ({
		...doctorServicesQuery(options.locale()),
		enabled: browser
	}));
	const smsSettings = createQuery(() => ({ ...doctorSmsSettingsQuery(), enabled: browser }));
	const smsBalance = createQuery(() => ({ ...doctorSmsBalanceQuery(), enabled: browser }));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const base = $derived({
		offices: offices.data,
		officesError: offices.isError,
		services: services.data,
		servicesError: services.isError,
		smsOn: smsSettings.data?.confirmed ?? false,
		balance: smsBalance.data?.remaining ?? null
	});

	let now = $state(readServerNow());
	// An hour that passes while the doctor looks leaves the grid (the minute's clock of the desk).
	$effect(() => {
		const tick = setInterval(() => (now = readServerNow()), DOCTOR_TODAY_POLL_MS);
		return () => clearInterval(tick);
	});

	let step = $state<DoctorNewPatientStep>(untrack(() => (options.patient() ? 'picked' : 'search')));
	// The chosen patient by its KEY (its facts live in the cache, never in a rune: the contract's «Form state»).
	let pickedKey = $state<DoctorNewAppointmentPatientKey | null>(untrack(() => options.patient()));
	let query = $state('');
	let missing = $state(false);
	let chosenOffice = $state<string | null>(null);
	let chosenService = $state<string | null>(null);
	let chosenDay = $state<string | null>(null);
	let slot = $state<string | null>(null);
	let gone = $state<string[]>([]);
	let failure = $state<string | null>(null);
	let sent = $state(false);

	const form = createForm<DoctorNewPatientValues>({
		...untrack(() => doctorNewPatientForm(options.locale()))
	});

	// D-W51-69: the chosen patient — a row put in the cache when pressed, or the one the address names, read once; one
	// that is not the doctor's (404) leaves the search open with «δεν βρέθηκε».
	const chosen = createQuery(() => {
		const key = pickedKey;
		return {
			...doctorPatientQuery(key ?? { kind: 'account', id: '' }),
			enabled: browser && key !== null
		};
	});
	const chosenRead = $derived({
		data: chosen.data,
		error: chosen.error,
		isSuccess: chosen.isSuccess
	});
	const picked = $derived(step === 'picked' && pickedKey ? (chosenRead.data ?? null) : null);
	$effect(() => {
		const read = chosenRead;
		untrack(() => {
			if (step !== 'picked' || !pickedKey) return;
			if (read.error || (read.isSuccess && read.data === null)) {
				step = 'search';
				pickedKey = null;
				missing = true;
			}
		});
	});

	// The search, quiet a moment (D-W51-70), cut at 40 (U-65.6); none ⇒ the most recent.
	const words = useDebouncedValue(
		() => clampDoctorPatientSearch(query).trim(),
		DOCTOR_PATIENT_SEARCH_DEBOUNCE_MS
	);
	const search = createQuery(() => ({
		...doctorPatientSearchQuery(words.current),
		enabled: browser && step === 'search'
	}));
	const searchRead = $derived({
		data: search.data,
		isError: search.isError
	});
	const searchState = $derived.by((): DoctorNewReadState => {
		if (searchRead.data) return 'ready';
		return searchRead.isError ? 'failed' : 'loading';
	});

	// «Ίδιο κινητό» (D-W51-70): asked once the mobile typed is a Greek one; a warning, never a refusal.
	const mobile = $derived(step === 'new' ? readDoctorGreekMobile(form.values.phone) : null);
	const samePhone = createQuery(() => ({
		...doctorPatientPhoneQuery(mobile ?? ''),
		enabled: browser && mobile !== null
	}));
	const sameRead = $derived(samePhone.data ?? []);
	const matches = $derived(mobile ? sameRead : []);

	const officeChoices = $derived(buildDoctorNewOfficeChoices(base.offices ?? [], options.locale()));
	const office = $derived(
		officeChoices.find((choice) => choice.value === chosenOffice) ?? officeChoices[0] ?? null
	);
	const doctorId = $derived(
		(base.offices ?? []).find((entry) => entry.id === office?.value)?.doctorId ?? null
	);
	const service = $derived(
		(base.services ?? []).find((entry) => entry.id === chosenService) ?? null
	);

	const slots = createInfiniteQuery(() => ({
		...doctorNewSlotsQuery(office?.value ?? '', service ? [service.id] : []),
		enabled: browser && office !== null && service !== null && !sent
	}));
	const slotsRead = $derived({
		data: slots.data,
		isError: slots.isError,
		hasNextPage: slots.hasNextPage,
		isFetchingNextPage: slots.isFetchingNextPage
	});
	const pages = $derived(slotsRead.data?.pages ?? []);
	const days = $derived(buildDoctorMoveDays({ pages, gone, now, locale: options.locale() }));
	const day = $derived(doctorMoveSelectedDay(days, chosenDay));
	const timeZone = $derived(pages[0]?.timeZone ?? '');
	const slotsState = $derived.by((): DoctorNewReadState => {
		if (slotsRead.data) return 'ready';
		return slotsRead.isError ? 'failed' : 'loading';
	});
	// The hour chosen counts only while the grid still offers it (one taken, one that passed, goes with it).
	const slotOffered = $derived(
		slot !== null && days.some((entry) => entry.slots.some((item) => item.startTime === slot))
	);

	const person = $derived.by((): DoctorNewPerson | null => {
		if (step === 'picked') return picked ? { kind: 'patient', patient: picked } : null;
		if (step === 'new' && isDoctorNewPatientComplete(form.values)) {
			return { kind: 'new', values: { ...form.values } };
		}
		return null;
	});
	const channels = $derived.by((): DoctorNewChannel[] => {
		if (!person) return [];
		const hasAccount = person.kind === 'patient' && person.patient.hasAccount;
		const hasEmail =
			person.kind === 'patient' ? person.patient.email !== null : person.values.email.trim() !== '';
		return doctorNewChannels({ hasAccount, hasEmail, smsOn: base.smsOn });
	});

	const state = $derived.by((): DoctorNewState => {
		if (base.officesError || base.servicesError) return 'failed';
		if (!base.offices || !base.services) return 'loading';
		return base.offices.length === 0 || base.services.length === 0 ? 'empty' : 'form';
	});

	const ready = $derived(
		person !== null && office !== null && doctorId !== null && service !== null && slotOffered
	);

	// The searches and «ίδιο κινητό» read again (a new record, a new visit); the chosen one stays as it was read. Since
	// step 9 (D-W51-73) «Οι ασθενείς μου», its cards and their lists too: the new visit is their «Επόμενο».
	const readPeopleAgain = () => {
		for (const part of ['search', 'phone', 'list', 'card', 'appointments']) {
			void client.invalidateQueries({ queryKey: [...doctorDashboardQueryKeys.patients(), part] });
		}
	};
	const readAgain = () => {
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.appointments() });
		readPeopleAgain();
	};

	type Write = {
		request: DoctorNewAppointmentRequest;
		told: DoctorNewChannel[];
		startTime: string;
	};
	const write = createMutation<DoctorAppointmentDetailFacts | null, unknown, Write>(() => ({
		networkMode: 'always' as const,
		mutationFn: ({ request }: Write) => createDoctorAppointment(request),
		onSuccess: (answered: DoctorAppointmentDetailFacts | null, { told }: Write) => {
			if (!answered) {
				failure = m.doctor_new_failed({}, { locale: options.locale() });
				readAgain();
				return;
			}
			sent = true;
			client.setQueryData(doctorDashboardQueryKeys.detail(answered.id), answered);
			readAgain();
			client.removeQueries({ queryKey: [...doctorDashboardQueryKeys.all, 'new-slots'] });
			memory?.remember(answered.id, { kind: 'booked', told });
			options.onDone(answered.id);
		},
		onError: (error: unknown, { request, startTime }: Write) => {
			const locale = options.locale();
			const outcome = readDoctorBookFailure(error);
			if (outcome.kind === 'session') {
				// 🔴 U-84: the session ended under the screen; what was chosen and typed stays for the same person.
				session?.expire({});
				return;
			}
			// D-W51-56: a new patient's record stays when the hour then fails — read the people again («ίδιο κινητό»).
			if (request.newPatient) readPeopleAgain();
			if (outcome.kind === 'taken') {
				gone = [...gone, startTime];
				slot = null;
				failure = m.booking_blocker_slot_unavailable({}, { locale });
				void slots.refetch();
				return;
			}
			if (outcome.kind === 'missing') {
				pickedKey = null;
				step = 'search';
				failure = m.doctor_new_patient_missing({}, { locale });
				return;
			}
			if (outcome.kind === 'invalid' && step === 'new' && outcome.fields.length > 0) {
				markRefused(outcome.fields);
				failure = m.doctor_new_check_fields({}, { locale });
				return;
			}
			failure =
				outcome.kind === 'rate-limited'
					? m.doctor_reason_rate_limited({}, { locale })
					: m.doctor_new_failed({}, { locale });
		}
	}));

	/** The fields the server refused, under each with the form's own words for it. */
	function markRefused(fields: readonly DoctorNewPatientField[]) {
		const words = doctorNewPatientForm(options.locale()).messages ?? {};
		for (const field of fields) {
			const message = Object.values(words[field] ?? {})[0];
			form.setTouched(field);
			form.errors[field] = message;
		}
	}

	return {
		/** What the page draws: its wait, the form, a read that failed, nothing to book with. */
		get state() {
			return state;
		},
		get step() {
			return step;
		},
		/** The patient the address names, while it is being read. */
		get naming() {
			return step === 'picked' && picked === null;
		},
		get picked() {
			return picked;
		},
		get form() {
			return form;
		},
		get query() {
			return query;
		},
		/** The words the rows answer (the quiet ones), `''` for the most recent. */
		get words() {
			return words.current;
		},
		get searchState() {
			return searchState;
		},
		get results() {
			return searchRead.data ?? [];
		},
		/** «Ίδιο κινητό»: the doctor's people with the mobile typed. */
		get matches() {
			return matches;
		},
		get officeChoices() {
			return officeChoices;
		},
		get office() {
			return office;
		},
		get services() {
			return base.services ?? [];
		},
		get service() {
			return service;
		},
		get slotsState() {
			return slotsState;
		},
		get days() {
			return days;
		},
		get day() {
			return day;
		},
		get timeZone() {
			return timeZone;
		},
		get hasMoreDays() {
			return slotsRead.hasNextPage;
		},
		get readingMoreDays() {
			return slotsRead.isFetchingNextPage;
		},
		/** The hour chosen, while the grid still offers it; `null` for none. */
		get slot() {
			return slotOffered ? slot : null;
		},
		get person() {
			return person;
		},
		get channels() {
			return channels;
		},
		get balance() {
			return base.balance;
		},
		/** Everything chosen: the summary shows and «Κλείσιμο ραντεβού» wakes. */
		get ready() {
			return ready;
		},
		get failure() {
			return failure;
		},
		get sending() {
			return write.isPending;
		},
		/** 🔴 D-W51-06: the patient the address named is not the doctor's (or is gone): «δεν βρέθηκε» over the search. */
		get missing() {
			return missing;
		},
		type(value: string) {
			query = clampDoctorPatientSearch(value);
		},
		/** A row of the search, or «Είναι το ίδιο πρόσωπο»: that person is chosen (`sw.js:1085`). */
		choose(key: string) {
			const found =
				[...(searchRead.data ?? []), ...sameRead].find(
					(patient) => doctorPatientKeyOf(patient.key) === key
				) ?? null;
			if (!found) return;
			client.setQueryData(doctorDashboardQueryKeys.patient(found.key.kind, found.key.id), found);
			pickedKey = found.key;
			step = 'picked';
			missing = false;
			failure = null;
		},
		/** «Νέος ασθενής» (`sw.js:1087`). */
		startNew() {
			step = 'new';
			failure = null;
		},
		/** «Αλλαγή» of the chosen one and «Πίσω στην αναζήτηση» (`sw.js:1086`). */
		backToSearch() {
			pickedKey = null;
			step = 'search';
			failure = null;
		},
		chooseOffice(id: string) {
			if (id === office?.value) return;
			chosenOffice = id;
			slot = null;
			chosenDay = null;
		},
		chooseService(id: string) {
			if (id === chosenService) return;
			chosenService = id;
			slot = null;
			chosenDay = null;
		},
		/** Another day: the hour chosen on the last one goes (`sw.js:1000`). */
		chooseDay(date: string) {
			if (date === day?.date) return;
			chosenDay = date;
			slot = null;
		},
		pick(startTime: string) {
			slot = startTime;
			failure = null;
		},
		moreDays() {
			if (slots.hasNextPage && !slots.isFetchingNextPage) void slots.fetchNextPage();
		},
		/** 🔴 D-W51-70: ONE press, only with everything chosen — refused while one is on its way or once taken. */
		send() {
			if (write.isPending || sent) return;
			if (step === 'new' && !isDoctorNewPatientComplete(form.values)) {
				void form.handleSubmit();
				return;
			}
			const who = person;
			const at = slotOffered ? slot : null;
			if (!who || !office || !doctorId || !service || !at) return;
			failure = null;
			write.mutate({
				request: toDoctorNewAppointmentRequest({
					doctorId,
					officeId: office.value,
					serviceId: service.id,
					startTime: at,
					person: who
				}),
				told: [...channels],
				startTime: at
			});
		},
		retry() {
			if (offices.isError) void offices.refetch();
			if (services.isError) void services.refetch();
		},
		retrySearch() {
			void search.refetch();
		},
		retryHours() {
			void slots.refetch();
		}
	};
}

export type DoctorNewRead = ReturnType<typeof useDoctorNew>;
