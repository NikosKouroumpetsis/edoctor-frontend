<script lang="ts">
	import DoctorArticlesRow from '$modules/articles/ui/doctor-row';
	import DoctorDetail from '$modules/doctor/ui/detail';
	import { buildDoctorContactFacts } from '$modules/doctor/lib/detail';
	import ContactDialog, { ContactButton, useContactDoctor } from '$modules/messages/ui/contact';
	import { useDoctorDetailsScreen } from '../hooks';
	import type { DoctorDetailsScreenProps } from '../types';

	let { data }: DoctorDetailsScreenProps = $props();

	const profile = $derived(data.load.profile);
	const doctorId = $derived(profile.doctorId);
	const screen = useDoctorDetailsScreen(() => data.load.profile.doctorSlug);
	const favorite = $derived.by(() => {
		const id = doctorId;
		if (!id) return undefined;
		return {
			saved: screen.favorites.isSaved(id),
			pop: screen.favorites.isPopping(id),
			onToggle: () => screen.favorites.toggle({ id, imageUrl: profile.images[0]?.thumbUrl })
		};
	});
	// 🔴 U-84.6: drawn with nothing from the server; only its press asks (D-103). The toast clears the booking bar.
	const contactFacts = $derived(buildDoctorContactFacts(profile, screen.locale));
	const contactFlow = useContactDoctor({
		doctor: () => contactFacts,
		locale: () => screen.locale,
		conversationHref: screen.conversationHref,
		lift: 'page-bar'
	});
</script>

<!-- 🔴 Π7 (app = web): a window's own address — the profile drawn whole by the server with the window open on it
     (deep link), «×» / Escape / «back» leave the profile. -->
<main data-slot="doctor-profile" class="bg-card">
	<DoctorDetail
		load={data.load}
		locale={screen.locale}
		routeSection={data.section}
		localize={screen.localize}
		similarHref={screen.similarHref}
		similarAreaQuery={screen.similarAreaQuery}
		bookingHref={screen.bookingHref}
		kept={screen.kept}
		canonicalUrl={screen.canonicalUrl}
		alternateUrls={screen.alternateUrls}
		backHref={screen.backHref}
		signedIn={screen.signedIn}
		onSignIn={screen.onSignIn}
		reviewLinks={screen.reviewLinks}
		knowLinks={screen.knowLinks}
		{favorite}
	>
		{#snippet contact()}
			{#if contactFacts}
				<ContactButton flow={contactFlow} locale={screen.locale} />
			{/if}
		{/snippet}
		{#snippet articles()}
			{#if doctorId && profile.articlesSummary}
				<DoctorArticlesRow
					{doctorId}
					counts={profile.articlesSummary}
					locale={screen.locale}
					articleHref={screen.articleHref}
					allHref={screen.doctorArticlesHref}
				/>
			{/if}
		{/snippet}
	</DoctorDetail>
</main>

<ContactDialog
	flow={contactFlow}
	doctor={contactFacts}
	locale={screen.locale}
	bookHref={screen.bookHref}
/>
