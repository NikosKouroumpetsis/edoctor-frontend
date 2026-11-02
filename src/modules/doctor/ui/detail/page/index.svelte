<script lang="ts">
	import ProfilePage from '../components/profile-page.svelte';
	import { useSiteBack } from '../hooks/use-site-back.svelte';
	import type { DoctorDetailPageProps } from '../types';

	let {
		load,
		locale,
		routeSection,
		localize,
		similarHref,
		similarAreaQuery,
		canonicalUrl,
		alternateUrls,
		backHref,
		signedIn,
		onSignIn
	}: DoctorDetailPageProps = $props();

	const onBack = useSiteBack();
</script>

<!-- 🔴 Wave 1.5 · screen 5 (app = web, the application's `DoctorProfileShell`): the profile the server drew whole (a
     missing or failed one is the route's error page, `error.svelte`). One page per doctor (`{#key}`): a new slug
     starts its own state. -->
{#key load.profile.doctorSlug}
	<ProfilePage
		profile={load.profile}
		serverNow={load.serverNow}
		{locale}
		{routeSection}
		{localize}
		{similarHref}
		{similarAreaQuery}
		{canonicalUrl}
		{alternateUrls}
		{backHref}
		{signedIn}
		{onSignIn}
		{onBack}
	/>
{/key}
