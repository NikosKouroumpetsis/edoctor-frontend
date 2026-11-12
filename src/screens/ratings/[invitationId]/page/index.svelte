<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { readServerNow } from '$shared/lib/server-clock';
	import type { RatingPreviewCard } from '$modules/appointments/lib/rating';
	import AppointmentsList, { useAppointmentsPages } from '$modules/appointments/ui/list';
	import AppointmentRating from '$modules/appointments/ui/rating';
	import {
		buildDoctorReviewHowBlocks,
		buildDoctorReviewHowLinks,
		buildDoctorReviewListCard,
		reviewAuthorName
	} from '$modules/doctor/lib/detail';
	import { useDoctorPublicProfiles } from '$modules/doctor/ui/public-profiles';
	import { useRatingInvitationScreen } from '../hooks';
	import type { RatingInvitationScreenProps } from '../types';

	let { invitationId }: RatingInvitationScreenProps = $props();

	const screen = useRatingInvitationScreen(() => invitationId);
	const options = $derived({ locale: screen.locale });

	// The feature's rules — who reads, the invitation and its visit, the visit's tab beside the form from 950 (P-W4 §4.5,
	// U-136.2, D-103), U-139.1, the sign-in opened once for a guest (U-138.3) — are the module's (`useAppointmentsPages`,
	// review w4-arch-frontend L-1); the screen joins the doctor's module to them.
	const pages = useAppointmentsPages({ page: 'rating', invitationId: () => screen.invitationId });
	const read = pages.invitation;
	const visit = pages.visit;

	// D-W4-29: one public profile per different doctor of the loaded pages and of the visit.
	const doctors = useDoctorPublicProfiles({
		ids: () => pages.doctorIds,
		lang: () => screen.locale,
		enabled: () => pages.isMember
	});
	const doctor = $derived(visit.appointment ? doctors.of(visit.appointment.doctorId) : undefined);

	// 🔴 D-W4-26: the name the review will carry is the server's own, written by the profile's rule — none of the client's.
	const patientName = $derived(read.invitation?.patientName ?? null);
	const patientInitial = $derived(read.invitation?.patientInitial ?? '');
	const authorName = $derived(patientName ? reviewAuthorName(patientName, patientInitial) : null);

	/**
	 * U-138.4 · D-W4-25: «Έτσι θα φαίνεται στο προφίλ του γιατρού» — the profile's own card of its reviews' list for a
	 * review published now (its day as the profile writes today's, its half stars), by the doctor's builder; none without
	 * the server's name.
	 */
	function previewOf(draft: { stars: number; body: string }): RatingPreviewCard | null {
		if (!patientName) return null;
		const now = readServerNow();
		const card = buildDoctorReviewListCard(
			{
				id: 'preview',
				body: draft.body,
				patientName,
				patientInitial,
				publishedAt: new Date(now).toISOString(),
				rating: draft.stars
			},
			{ doctorName: '', locale: screen.locale, now }
		);
		return {
			authorName: card.authorName,
			authorInitial: card.authorInitial,
			dateLabel: card.relativeLabel,
			rating: card.rating,
			ratingLabel: card.ratingLabel,
			body: card.body
		};
	}

	// D-W4-24: «Πώς λειτουργούν οι κριτικές» is the profile's window, its words and its two ways on.
	const how = $derived({
		blocks: buildDoctorReviewHowBlocks(screen.locale),
		links: buildDoctorReviewHowLinks(screen.locale, screen.reviewLinks).map((link) => ({
			label: link.label,
			href: link.href,
			testId: `appointment-rating-how-${link.id}`
		}))
	});
</script>

<svelte:head>
	<title>{m.ratings_form_title({}, options)} | {m.brand_name({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet pane()}
	<AppointmentRating
		locale={screen.locale}
		viewer={pages.viewer}
		{read}
		{visit}
		{doctor}
		links={screen.links}
		offline={pages.offline}
		{authorName}
		{previewOf}
		{how}
		policyHref={screen.reviewLinks.policyHref}
		onSignIn={pages.signIn}
		onRetrySession={pages.retrySession}
	/>
{/snippet}

<!-- Wave 4.0 · screen 54 (record §10, U-138; P-W4 §4.5, Σ-6): the email's address opens the form at once (U-138.3) —
     below 950 its own page over the capsule, from 950 the right column beside the visit's «Ιστορικό», the visit
     selected (U-136.2); the list never opens another appointment here (`autoOpen`). No footer (D-W4-55), never a map
     (U-132.1). -->
<main data-testid="rating-page" class="min-h-page bg-card split:min-h-0">
	<AppointmentsList
		locale={screen.locale}
		tab={pages.tab}
		list={pages.list}
		viewer={pages.viewer}
		offline={pages.offline}
		openId={pages.openId}
		open
		autoOpen={false}
		paneKey={pages.paneKey}
		paneEmpty={pages.paneEmpty}
		doctorOf={doctors.of}
		links={screen.links}
		onSignIn={pages.signIn}
		onRetry={pages.retry}
		{pane}
	/>
</main>
