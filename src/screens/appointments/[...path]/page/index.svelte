<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { appointmentChangeOpen } from '$modules/appointments/lib/change';
	import { appointmentDoctorName } from '$modules/appointments/lib/list';
	import { buildOwnReviewCard } from '$modules/appointments/lib/rating';
	import AppointmentCancel from '$modules/appointments/ui/cancel';
	import AppointmentChange from '$modules/appointments/ui/change';
	import AppointmentDetail from '$modules/appointments/ui/detail';
	import AppointmentsList, { useAppointmentsPages } from '$modules/appointments/ui/list';
	import { OwnReview, useOwnReview } from '$modules/appointments/ui/rating';
	import { buildDoctorContactFacts, reviewAuthorName } from '$modules/doctor/lib/detail';
	import AvailabilityPicker from '$modules/doctor/ui/availability-picker';
	import { useDoctorPublicProfiles } from '$modules/doctor/ui/public-profiles';
	import ContactDialog, { useContactDoctor } from '$modules/messages/ui/contact';
	import { useAppointmentsScreen, useAppointmentTime } from '../hooks';
	import type { AppointmentsScreenProps } from '../types';

	let { data }: AppointmentsScreenProps = $props();

	const screen = useAppointmentsScreen(() => data);
	const options = $derived({ locale: screen.locale });
	// 🔴 U-65.6 (P-W4 §4.2): the tab's title never names the doctor, the day or a relative — it stays in the history.
	const title = $derived(
		screen.address.view === 'list'
			? m.appointments_page_title({}, options)
			: m.appointments_detail_nav_title({}, options)
	);

	// The feature's rules — who reads, the list's tab, when the list is read, U-139.1, the page's memory — are the
	// module's (`useAppointmentsPages`, review w4-arch-frontend L-1); the screen joins the other modules to them.
	const pages = useAppointmentsPages({ page: 'appointments', address: () => screen.address });
	const detail = pages.visit;

	// D-W4-29: one public profile per different doctor of the loaded pages and of the open appointment.
	const doctors = useDoctorPublicProfiles({
		ids: () => pages.doctorIds,
		lang: () => screen.locale,
		enabled: () => pages.isMember
	});
	const openDoctor = $derived(
		detail.appointment ? doctors.of(detail.appointment.doctorId) : undefined
	);

	// «Μήνυμα στον γιατρό» (P-W4 §4.2): the composition of screen 18 — the messages' flow and its window — on the doctor
	// of the open appointment (a module never imports another: the screen joins them).
	const contactFacts = $derived(
		openDoctor ? buildDoctorContactFacts(openDoctor, screen.locale) : null
	);
	const contact = useContactDoctor({
		doctor: () => contactFacts,
		locale: () => screen.locale,
		conversationHref: screen.conversationHref
	});
	const message = $derived(contactFacts ? { press: contact.press, busy: contact.asking } : null);

	// 🔴 U-138.5 · P-B4 §13.3.5 (card rule 5): «Η κριτική σας» on the 51, read by the `ratingId` its appointment names —
	// the name it is published under by the profile's rule (`reviewAuthorName`), «Δείτε τη στο προφίλ του γιατρού» on the
	// doctor's reviews at this one, «Πολιτική κριτικών», «Απάντηση από Dr. …».
	const ownReview = useOwnReview({
		ratingId: () => detail.appointment?.ratingId ?? null,
		enabled: () => pages.isMember
	});
	const reviewCard = $derived(
		ownReview.review
			? buildOwnReviewCard({
					review: ownReview.review,
					authorName: reviewAuthorName(
						ownReview.review.patientName ?? '',
						ownReview.review.patientInitial ?? ''
					),
					doctorName: appointmentDoctorName(openDoctor),
					locale: screen.locale
				})
			: null
	);
	const reviewProfileHref = $derived(
		ownReview.review && openDoctor?.doctorSlug
			? screen.doctorReviewHref(openDoctor.doctorSlug, ownReview.review.ratingId)
			: null
	);

	// «Αλλαγή ώρας»: the profile's picker on the appointment's one office, read only while it is open AND may open (review
	// w4-w5 R1 NIT-4, D-103: never the doctor's hours for a screen about to give way to the appointment); another screen
	// on the right starts it again (`paneKey`).
	const time = useAppointmentTime({
		appointment: () =>
			pages.step === 'time' && pages.opened && appointmentChangeOpen('time', pages.opened)
				? pages.opened
				: null,
		locale: () => screen.locale,
		paneKey: () => pages.paneKey
	});
</script>

<svelte:head>
	<title>{title} | {m.brand_name({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet timePicker()}
	<AvailabilityPicker
		content={time.content}
		readState={time.readState}
		initialDate={time.initialDate}
		bind:staged={time.staged}
		locale={screen.locale}
		slotVariant="outline"
		onSelectOffice={() => undefined}
		onRetry={time.retry}
	/>
{/snippet}

{#snippet review()}
	{#if reviewCard}
		<OwnReview
			card={reviewCard}
			profileHref={reviewProfileHref}
			policyHref={screen.reviewPolicyHref}
		/>
	{/if}
{/snippet}

{#snippet pane({ opening }: { opening: boolean })}
	{@const openId = pages.openId}
	{@const step = pages.step}
	{@const opened = pages.opened}
	{#if opening}
		<!-- Review w4-w4 R1 MINOR-1: from 950 the list's first is about to open (`appt.js:535`): its wait, already beside. -->
		<AppointmentDetail
			locale={screen.locale}
			viewer={pages.viewer}
			read={detail}
			doctor={undefined}
			links={screen.links}
			offline={pages.offline}
			done={null}
			justCanceled={false}
			message={null}
			onSignIn={pages.signIn}
			onRetrySession={pages.retrySession}
		/>
	{:else if openId}
		<!-- The 51, and the screens it opens (`time`, `for-whom`, `relative`, `note` · `cancel`, D-W4-20): one screen per
		     address (`#key`), each starting its own state as a route of its own would. Screens 52 / 53 (U-136.2, U-137.2)
		     stand once a member's appointment is read (`opened`; its states — the wait, a failure, «δεν βρέθηκε», a guest —
		     are the 51's), and each gives way to the appointment itself when it may not open (P-W4 §4.3, §4.4). -->
		{#key pages.paneKey}
			{#if step && opened}
				{@const changeProps = {
					locale: screen.locale,
					appointment: opened,
					doctor: openDoctor,
					links: screen.links
				}}
				{#if step !== 'cancel'}
					<AppointmentChange
						{...changeProps}
						{step}
						picked={time.picked}
						picker={timePicker}
						onRepick={time.repick}
						onGone={time.gone}
						toMobilePhone={screen.toMobilePhone}
					/>
				{:else}
					<AppointmentCancel {...changeProps} onReread={detail.retry} />
				{/if}
			{:else}
				<AppointmentDetail
					locale={screen.locale}
					viewer={pages.viewer}
					read={detail}
					doctor={openDoctor}
					links={screen.links}
					offline={pages.offline}
					done={pages.doneOf(openId)}
					justCanceled={pages.justCanceled(openId)}
					{message}
					onSignIn={pages.signIn}
					onRetrySession={pages.retrySession}
					review={reviewCard ? review : undefined}
				/>
			{/if}
		{/key}
	{/if}
{/snippet}

<!-- Wave 4.0 · screens 50 + 51 (record §6, §7; P-W4 §3.2, §4.1, §4.2): «Τα ραντεβού μου» and the appointment it opens, one
     page under one route, so the list keeps its place and its scroll while the right column changes. The site's bar, the
     capsule on the list alone, no footer (D-W4-55), never a map (U-132.1). -->
<main
	data-testid="appointments-page"
	data-view={screen.address.view}
	class="min-h-page bg-card split:min-h-0"
>
	<AppointmentsList
		locale={screen.locale}
		tab={pages.tab}
		list={pages.list}
		viewer={pages.viewer}
		offline={pages.offline}
		openId={pages.openId}
		paneKey={pages.paneKey}
		paneEmpty={pages.paneEmpty}
		doctorOf={doctors.of}
		links={screen.links}
		onSignIn={pages.signIn}
		onRetry={pages.retry}
		{pane}
	/>
</main>

<ContactDialog
	flow={contact}
	doctor={contactFacts}
	locale={screen.locale}
	bookHref={openDoctor?.doctorSlug ? screen.bookHref(openDoctor.doctorSlug) : screen.links.search}
/>
