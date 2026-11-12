<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { m } from '$paraglide/messages.js';
	import { getSessionOptional } from '$shared/state/session';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { Button } from '$shared/ui/primitives/button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { appointmentDetailQuery } from '$modules/appointments/api/appointment';
	import { bookingPatientQuery } from '$modules/appointments/api/patient';
	import { bookingReadinessQuery } from '$modules/appointments/api/readiness';
	import {
		bookingDoctorName,
		bookingSlotOfAppointment,
		buildBookingCard,
		buildBookingSuccess
	} from '$modules/appointments/lib/booking';
	import { RoundLink } from '$modules/appointments/ui/change-screen';
	import SummaryCard from '../components/summary-card.svelte';
	import type { BookingSuccessProps } from '../types';

	let props: BookingSuccessProps = $props();

	const session = getSessionOptional();
	const signedIn = $derived(session?.isMember ?? false);
	const options = $derived({ locale: props.locale });

	// The appointment read back by its id (the server's answer, D-01): the 30 left it in the cache, a reload asks again.
	const appointmentRead = createQuery(() => ({
		...appointmentDetailQuery(props.appointmentId),
		enabled: browser && signedIn
	}));
	const appointment = $derived(signedIn ? appointmentRead.data : undefined);
	const patientRead = createQuery(() => ({
		...bookingPatientQuery(),
		enabled: browser && signedIn
	}));
	// 🔴 P-B3-review A-3, U-103.3 / D-09: «και SMS» only when the server says one leaves — the readiness of THIS booking's
	// hour and person, asked again after a reload (the views of an appointment do not carry it).
	const readinessRead = createQuery(() => {
		const booked = appointment;
		return {
			...bookingReadinessQuery({
				doctorId: booked?.doctorId ?? '',
				slot: booked ? { officeId: booked.officeId, startTime: booked.startTime } : null,
				relativeId: booked?.relativeId ?? null
			}),
			enabled: browser && signedIn && Boolean(booked)
		};
	});

	const content = $derived(
		buildBookingSuccess({
			appointment,
			doctorName: bookingDoctorName(props.doctor, props.locale),
			smsExpected: signedIn ? (readinessRead.data?.patientSmsExpected ?? null) : null,
			locale: props.locale
		})
	);
	const slot = $derived(appointment ? bookingSlotOfAppointment(appointment) : null);
	const card = $derived(
		appointment
			? buildBookingCard({
					doctor: props.doctor,
					slot,
					slotState: 'offered',
					serviceId: appointment.serviceIds[0],
					visitor: appointment.relativeId
						? { kind: 'relative', relativeId: appointment.relativeId }
						: { kind: 'self' },
					signedIn,
					patient: patientRead.data,
					readiness: undefined,
					// Review w3-w3 R1 MINOR-2 (D-06): the reason, the visitor and the cost as the appointment froze them;
					// U-139.5: the relative with the word of their frozen relationship and gender.
					readOnly: {
						confirmed: content.confirmed,
						note: appointment.patientNote,
						snapshot: appointment.snapshot,
						relative: appointment.relative
					},
					locale: props.locale
				})
			: null
	);
	// The server's page knows nobody (U-80.1 Ε6): until the browser knows the session, the words wait with the read.
	const waiting = $derived(
		session?.status === 'unknown' ||
			(signedIn && appointmentRead.isPending && !appointmentRead.isError)
	);
</script>

<svelte:head>
	<title>{m.booking_meta_title({ title: content.title }, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet cta(placement: 'bar' | 'panel')}
	<!-- 🔴 U-103.1: the web's ONE way on is the doctor's page — no «Τα ραντεβού μου»; U-104.2 fully round, U-100 no hover. -->
	<Button
		label={m.booking_cta_doctor({}, options)}
		href={props.profileHref}
		tone="accent"
		radius="full"
		hover={false}
		textClass="text-body-lg"
		data-testid={`booking-success-doctor-${placement}`}
		class={placement === 'bar' ? 'w-full' : undefined}
	/>
{/snippet}

<!-- Screen 31 · «Η κράτησή σας καταχωρήθηκε» (record §4, U-105). Below 744 the application's (U-81.2): «×» at the top right,
     the ✓ in a dark circle of 48, the title, who it waits for, «Τι ακολουθεί» (D-W4-54: no «Για αλλαγή ή ακύρωση…»), then
     the SAME card as screen 30 without a «Αλλαγή», its state first; the button pinned to the bottom. From 744 one column
     of 440, from 950 Airbnb's two: the words and the button on the left, the card on the right. «Back» never returns
     to screen 30: this page took its place (nothing is sent twice). White to the bottom however short (W8-Δ1). -->
<main
	data-slot="booking-done"
	data-testid="booking-success"
	class="min-h-dvh bg-card px-gutter-sm pt-3 pb-page-bar tablet:min-h-page tablet:px-gutter-lg tablet:pt-section tablet:pb-section-lg"
>
	<div class="relative mx-auto w-full tablet:max-w-checkout-main-lg split:w-fit split:max-w-none">
		<div
			class="flex flex-row justify-end tablet:mb-4 tablet:justify-start split:absolute split:top-0 split:right-full split:mr-5 split:mb-0"
		>
			<RoundLink
				href={props.profileHref}
				label={m.booking_close({}, options)}
				icon="close"
				testId="booking-success-close"
			/>
		</div>

		<div
			class="mt-2 flex flex-col gap-6 tablet:mt-0 split:grid split:grid-checkout split:items-start"
		>
			<section
				data-slot="booking-done-text"
				class="flex flex-col split:col-start-1 split:row-start-1"
			>
				<span
					aria-hidden="true"
					class="mb-4 flex size-control-md items-center justify-center rounded-full bg-foreground text-card"
				>
					<Ionicon name="checkmark" class="icon-md" />
				</span>
				<h1 class="mb-2 text-heading-lg font-semibold text-foreground tablet:text-heading-xl">
					{content.title}
				</h1>
				{#if waiting}
					<div class="flex flex-col gap-3" data-testid="booking-success-waiting">
						<Skeleton class="h-6 w-full rounded-sm" />
						<Skeleton class="h-6 w-2/3 rounded-sm" />
					</div>
				{:else}
					<p class="mb-6 text-body-lg text-foreground" data-testid="booking-success-body">
						{content.body}
					</p>
					{#if content.next.length > 0}
						<h2 class="mb-3 text-body-lg font-semibold text-foreground">{content.nextTitle}</h2>
						<ul
							class="mb-4 flex list-disc flex-col gap-2 ps-5 text-body-sm text-foreground"
							data-testid="booking-success-next"
						>
							{#each content.next as line (line)}
								<li>{line}</li>
							{/each}
						</ul>
					{/if}
				{/if}
				{#if appointmentRead.isError}
					<InlineNotice
						variant="danger"
						message={m.booking_error_body({}, options)}
						actionLabel={m.booking_error_retry({}, options)}
						onAction={() => void appointmentRead.refetch()}
						testId="booking-success-failed"
					/>
				{/if}
				<div class="hidden flex-row justify-end pt-2 tablet:flex">
					{@render cta('panel')}
				</div>
			</section>

			{#if card}
				<div
					data-slot="booking-done-card"
					class="split:sticky split:top-card-sticky-top split:col-start-2 split:row-start-1"
				>
					<SummaryCard
						{card}
						stepHref={() => props.profileHref}
						onOpenStep={() => undefined}
						testId="booking-success-card"
					/>
				</div>
			{/if}
		</div>
	</div>

	<div
		data-slot="booking-bar"
		class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-gutter-sm pt-3 pb-safe-area-3 tablet:hidden"
	>
		{@render cta('bar')}
	</div>
</main>
