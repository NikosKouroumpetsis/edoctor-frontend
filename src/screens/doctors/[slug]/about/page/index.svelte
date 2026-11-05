<script lang="ts">
	import DoctorArticlesRow from '$modules/articles/ui/doctor-row';
	import { DoctorAbout } from '$modules/doctor/ui/detail';
	import { buildDoctorContactFacts } from '$modules/doctor/lib/detail';
	import ContactDialog, { ContactButton, useContactDoctor } from '$modules/messages/ui/contact';
	import { useDoctorAboutScreen } from '../hooks';
	import type { DoctorAboutScreenProps } from '../types';

	let { data }: DoctorAboutScreenProps = $props();

	const profile = $derived(data.load.profile);
	const doctorId = $derived(profile.doctorId);
	const screen = useDoctorAboutScreen(() => data.load.profile.doctorSlug);
	// 🔴 U-84.6 (Π9): the same button and the same #18 as the profile's; its press alone asks the server (D-103).
	const contactFacts = $derived(buildDoctorContactFacts(profile, screen.locale));
	const contactFlow = useContactDoctor({
		doctor: () => contactFacts,
		locale: () => screen.locale,
		conversationHref: screen.conversationHref
	});
</script>

<!-- 🔴 U-73 (screen 16): the doctor's own page, drawn whole by the server; its articles only when the row nears the screen
     (U-92.3), and none for a doctor with no article (U-92.2). -->
<main data-slot="doctor-about" class="bg-card">
	<DoctorAbout
		load={data.load}
		locale={screen.locale}
		canonicalUrl={screen.canonicalUrl}
		alternateUrls={screen.alternateUrls}
		doctorsHref={screen.doctorsHref}
		profileHref={screen.profileHref}
		reviewsHref={screen.reviewsHref}
		onOpenReview={screen.onOpenReview}
		focusBio={screen.focusBio}
	>
		{#snippet contact()}
			{#if contactFacts}
				<ContactButton flow={contactFlow} locale={screen.locale} />
			{/if}
		{/snippet}
		{#snippet articles(title)}
			{#if doctorId && profile.articlesSummary}
				<DoctorArticlesRow
					{doctorId}
					counts={profile.articlesSummary}
					locale={screen.locale}
					articleHref={screen.articleHref}
					allHref={screen.doctorArticlesHref}
					{title}
				/>
			{/if}
		{/snippet}
	</DoctorAbout>
</main>

<ContactDialog
	flow={contactFlow}
	doctor={contactFacts}
	locale={screen.locale}
	bookHref={screen.bookHref}
/>
