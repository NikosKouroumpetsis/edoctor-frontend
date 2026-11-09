<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import type { SignInRequest } from '$shared/state/session';
	import { doctorMemberProfileQuery } from '$modules/doctor/api/profile';
	import ProfilePage from '../components/profile-page.svelte';
	import { useSiteBack } from '$shared/lib/navigation';
	import type { DoctorDetailPageProps } from '../types';

	let {
		load,
		locale,
		routeSection,
		localize,
		similarHref,
		similarAreaQuery,
		bookingHref,
		kept,
		canonicalUrl,
		alternateUrls,
		backHref,
		signedIn,
		onSignIn,
		reviewLinks,
		knowLinks,
		articles,
		contact,
		favorite
	}: DoctorDetailPageProps = $props();

	const onBack = useSiteBack();

	// 🔴 U-34.4 / U-80.1 Ε6: the server's page is a guest's; a member's prices come with ONE read in the browser, never
	// again by itself (no focus, no reconnect: the reader's 31 statements, D-103), and they go at a sign-out.
	const memberProfile = createQuery(() => ({
		...doctorMemberProfileQuery(load.profile.doctorSlug, locale),
		enabled: signedIn
	}));
	const profile = $derived(signedIn ? (memberProfile.data ?? load.profile) : load.profile);

	// R-6: a member who still reads «Συνδεθείτε για κόστος»: that read failed. There is nothing to sign in to: it asks again.
	const askSignIn = (request?: SignInRequest) => {
		if (signedIn && request?.action === 'fee') void memberProfile.refetch();
		else onSignIn(request);
	};
</script>

<!-- 🔴 Wave 1.5 · screen 5 (app = web, the application's `DoctorProfileShell`): the profile the server drew whole (a
     missing or failed one is the route's error page, `error.svelte`). One page per doctor (`{#key}`): a new slug
     starts its own state, and so does a member's read that names other offices (each office holds its own reads). -->
{#key `${load.profile.doctorSlug}:${profile.offices?.length ?? 0}`}
	<ProfilePage
		{profile}
		serverNow={load.serverNow}
		{locale}
		{routeSection}
		{localize}
		{similarHref}
		{similarAreaQuery}
		{bookingHref}
		{kept}
		{canonicalUrl}
		{alternateUrls}
		{backHref}
		onSignIn={askSignIn}
		{onBack}
		{reviewLinks}
		{knowLinks}
		{articles}
		{contact}
		{favorite}
	/>
{/key}
