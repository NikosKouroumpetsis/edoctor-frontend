import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { m } from '$paraglide/messages.js';
import { isPlainClick } from '$shared/lib/navigation';
import { personalQueryMeta } from '$shared/query';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import {
	createAppointment,
	readAppointmentFailure,
	type AppointmentCreateRequest
} from '$modules/appointments/api/appointment';
import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
import { bookingPatientQuery } from '$modules/appointments/api/patient';
import { bookingReadinessQuery } from '$modules/appointments/api/readiness';
import {
	asksFirstVisit,
	bookingDoctorName,
	bookingFailureActionLabel,
	bookingNoteCounter,
	bookingPath,
	bookingSuccessPath,
	buildBookingCard,
	buildBookingFailureNotice,
	buildBookingRequest,
	clampBookingNote,
	findOfferedSlot,
	hintsKey,
	hintsOf,
	readBookingHints,
	resolveBookingSubmit,
	resolveSlotState,
	type BookingFailureNotice,
	type BookingStep
} from '$modules/appointments/lib/booking';
import { withDoctorTitle } from '$shared/lib/text';
import { useBookingEntry } from './use-entry.svelte';
import { useBookingNavigation } from './use-navigation.svelte';
import type { BookingReviewProps } from '../types';

/**
 * Screen 30's state (record §3.2, P-W3 §3.2.3): the draft met through the address, the person's reads (only for a
 * member, only in the browser: `personalQueryMeta`), the card, what the main button does, and the one write. The address
 * follows the draft's hour and service by a real navigation (D-W3-31), never a person's fact (P-W3 §3.2.5).
 */
export function useBookingReview(props: () => BookingReviewProps) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	const navigation = useBookingNavigation();
	const draft = useBookingEntry(() => props().slug, 'review');
	const options = () => ({ locale: props().locale });
	const signedIn = $derived(session?.isMember ?? false);

	let failure = $state<BookingFailureNotice | null>(null);

	const hints = $derived(hintsOf(draft.slot, props().serviceId ?? null));
	const offered = $derived(findOfferedSlot(props().availability, draft.slot));
	const relativeId = $derived(draft.visitor.kind === 'relative' ? draft.visitor.relativeId : null);

	const patientRead = createQuery(() => ({
		...bookingPatientQuery(),
		enabled: browser && signedIn
	}));
	const readinessRead = createQuery(() => {
		const doctorId = props().doctor.doctorId ?? '';
		const slot = draft.slot;
		return {
			...bookingReadinessQuery({
				doctorId,
				slot: offered && slot ? { officeId: slot.officeId, startTime: offered.startTime } : null,
				relativeId
			}),
			enabled: browser && signedIn && Boolean(doctorId)
		};
	});
	const patient = $derived(signedIn ? patientRead.data : undefined);
	const readiness = $derived(signedIn ? readinessRead.data : undefined);

	const slotState = $derived(
		resolveSlotState({
			availability: props().availabilityState === 'answered' ? props().availability : undefined,
			slot: draft.slot,
			serviceChanged:
				draft.slotServiceId !== null && draft.slotServiceId !== (props().serviceId ?? null)
		})
	);

	const card = $derived(
		buildBookingCard({
			doctor: props().doctor,
			slot: draft.slot,
			slotState,
			serviceId: props().serviceId,
			visitor: draft.visitor,
			signedIn,
			patient,
			readiness,
			locale: props().locale
		})
	);

	const decision = $derived(
		resolveBookingSubmit({
			signedIn,
			slotState,
			patient,
			readiness,
			serviceId: props().serviceId,
			visitor: draft.visitor,
			locale: props().locale
		})
	);
	// Review w3-w2 R1 MAJOR-2: a read of the person or of the readiness that failed is said, with «Δοκιμάστε ξανά» (the
	// application's `ErrorState`), never a button locked in silence.
	const readFailed = $derived(signedIn && (patientRead.isError || readinessRead.isError));
	const asked = $derived(signedIn && asksFirstVisit(readiness));

	const pathOf = (step: BookingStep | null) => props().href(bookingPath(props().slug, step, hints));

	const toast = (message: string, danger = false) =>
		toasts?.show({ message, lift: 'page-bar', ...(danger ? { tone: 'danger' as const } : {}) });

	// 🔴 D-W3-31 (review w3-w2 R1 BLOCKER-1): the address follows the hour and the service CHOSEN by a REAL navigation in
	// place — never a shallow `replaceState`, whose entry a «back» would return to with the old hour — so the page's
	// address, the bar's and the sign-in's `returnPath` are one. It moves only when a «Αλλαγή» saved something and the
	// reader came back (the router runs by then): at a page's first load the draft IS its address.
	$effect(() => {
		const key = hintsKey(draft.hints);
		const shown = hintsKey(readBookingHints(page.url.searchParams));
		untrack(() => {
			if (key === shown || !draft.slot) return;
			// The page's own address, already resolved by the screen.
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(props().href(bookingPath(props().slug, null, draft.hints)), {
				replaceState: true,
				noScroll: true,
				keepFocus: true,
				state: page.state
			}).then(() => {
				// Review w3-w3 R1 NIT-2: agreed only once the entry holds it — a move cut short by another press leaves the
				// entry on the old hint, and a later «back» to it must still find the draft speaking.
				if (hintsKey(readBookingHints(page.url.searchParams)) === key) draft.syncedHints = key;
			});
		});
	});

	// U-80.1 Ε4: «Σύνδεση για συνέχεια» that went through `/login` or a provider's redirect comes back here, once.
	$effect(() => {
		if (signedIn && session?.takeResumed('book')) {
			untrack(() => toast(m.booking_guest_signed_in({}, options())));
		}
	});

	const submission = createMutation(() => ({
		// Without a network it fails at once and says so, rather than waiting for one unseen.
		networkMode: 'always' as const,
		mutationFn: (request: AppointmentCreateRequest) => createAppointment(request),
		onSuccess: (appointment) => {
			void client.invalidateQueries({ queryKey: [...appointmentsQueryKeys.all, 'readiness'] });
			if (!appointment) {
				failure = buildBookingFailureNotice(
					{ kind: 'unknown', status: 0, blockers: [], fields: [] },
					props().locale
				);
				return;
			}
			// 🔴 Review w3-w2 R1 MAJOR-1: the appointment written by hand wears the sign-out's mark, as every read of it does.
			client.setQueryDefaults(appointmentsQueryKeys.all, { meta: personalQueryMeta });
			client.setQueryData(appointmentsQueryKeys.detail(appointment.id), appointment);
			// Screen 31 takes this page's place: «back» from it is the doctor's page, nothing is sent twice.
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(props().href(bookingSuccessPath(props().slug, appointment.id)), {
				replaceState: true
			}).then(() => draft.forget());
		},
		onError: (error) => {
			const notice = buildBookingFailureNotice(readAppointmentFailure(error), props().locale);
			void client.invalidateQueries({ queryKey: [...appointmentsQueryKeys.all, 'readiness'] });
			if (notice.action === 'sign-in') {
				// 🔴 U-84: the session ended under the page; the note and the choices stay for the same person.
				session?.expire({ action: 'book' });
				return;
			}
			if (notice.action === 'pick-slot') props().onRetrySlots();
			failure = notice;
		}
	}));

	/**
	 * «×» / «←» (review w3-w2 R1 MINOR-1): back through the history only when the doctor's page of THIS site opened the
	 * booking forward (its mark in the entry's state, kept through every move of this page); otherwise the link.
	 */
	function close(event: MouseEvent) {
		if (!isPlainClick(event) || !page.state.siteBack) return;
		event.preventDefault();
		history.back();
	}

	/** The refusal's way out (MINOR-3): another hour, or the doctor's page. */
	function followFailure() {
		if (failure?.action === 'pick-slot') openStep('time');
		// The doctor's page, already resolved by the screen.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		else if (failure?.action === 'open-doctor') void goto(props().profileHref);
	}

	function openStep(step: BookingStep, event?: MouseEvent) {
		if (event && !isPlainClick(event)) return;
		event?.preventDefault();
		navigation.open(pathOf(step), 1);
	}

	function press() {
		failure = null;
		const now = decision;
		if (now.kind === 'sign-in') {
			session?.requireSignIn({
				action: 'book',
				onSignedIn: () => toast(m.booking_guest_signed_in({}, options()))
			});
			return;
		}
		if (now.kind === 'open') {
			openStep(now.step);
			return;
		}
		if (now.kind !== 'submit' || submission.isPending) return;
		const slot = draft.slot;
		const request = slot
			? buildBookingRequest({
					doctorId: props().doctor.doctorId,
					officeId: slot.officeId,
					startTime: offered?.startTime ?? null,
					serviceId: props().serviceId,
					patient,
					visitor: draft.visitor,
					note: draft.note,
					firstVisit: { asked, answer: draft.firstVisit }
				})
			: null;
		if (!request) {
			failure = buildBookingFailureNotice(
				{ kind: 'unknown', status: 0, blockers: [], fields: [] },
				props().locale
			);
			return;
		}
		submission.mutate(request);
	}

	return {
		get card() {
			return card;
		},
		get signedIn() {
			return signedIn;
		},
		get decision() {
			return decision;
		},
		get asksFirstVisit() {
			return asked;
		},
		get firstVisit() {
			return draft.firstVisit;
		},
		setFirstVisit(value: 'yes' | 'no') {
			draft.firstVisit = value;
		},
		get note() {
			return draft.note;
		},
		setNote(value: string) {
			draft.note = clampBookingNote(value);
			if (failure?.noteError) failure = null;
		},
		get noteCounter() {
			return bookingNoteCounter(draft.note, props().locale);
		},
		get failure() {
			return failure;
		},
		get failureActionLabel() {
			return failure ? bookingFailureActionLabel(failure.action, props().locale) : null;
		},
		followFailure,
		get readFailed() {
			return readFailed;
		},
		retryReads() {
			if (patientRead.isError) void patientRead.refetch();
			if (readinessRead.isError) void readinessRead.refetch();
		},
		close,
		get submitting() {
			return submission.isPending;
		},
		get slotsFailed() {
			return props().availabilityState === 'failed';
		},
		/** «Είναι το πρώτο σας ραντεβού με Dr. …;» (U-99.1: the doctor's name in a sentence wears its title). */
		get firstVisitTitle() {
			const name = bookingDoctorName(props().doctor, props().locale);
			return m.booking_first_visit_title(
				{ doctor: props().doctor.name?.trim() ? withDoctorTitle(name) : name },
				options()
			);
		},
		stepHref: (step: BookingStep) => pathOf(step),
		openStep,
		press
	};
}
