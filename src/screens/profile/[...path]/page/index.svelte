<script lang="ts">
	import { online } from 'svelte/reactivity/window';
	import { m } from '$paraglide/messages.js';
	import { getSessionOptional } from '$shared/state/session';
	import { appointmentsViewerOf } from '$modules/appointments/lib/list';
	import Relatives, { useRelativeUpcoming } from '$modules/appointments/ui/relatives';
	import { useDoctorPublicProfiles } from '$modules/doctor/ui/public-profiles';
	import ProfileTab from '$modules/profile/ui/tab';
	import { useProfileScreen } from '../hooks';
	import type { ProfileScreenProps } from '../types';

	let { data }: ProfileScreenProps = $props();

	const screen = useProfileScreen(() => data);
	const options = $derived({ locale: screen.locale });

	// The page's server knows nobody (U-80.1 Ε6): it draws the wait, and the browser fills it in.
	const session = getSessionOptional();
	const viewer = $derived(appointmentsViewerOf(session));
	const isMember = $derived(viewer === 'member');
	const offline = $derived(online.current === false);

	// 🔴 D-W4-21 · D-W4-29: «Διαγραφή συγγενή;» reads the person's upcoming visits once while it is open, and the screen
	// names the doctor of the first — one public profile, never an id on screen (a module never imports another).
	const upcoming = useRelativeUpcoming({ enabled: () => isMember });
	const doctors = useDoctorPublicProfiles({
		ids: () => (upcoming.doctorId ? [upcoming.doctorId] : []),
		lang: () => screen.locale,
		enabled: () => isMember
	});
</script>

<svelte:head>
	{#if screen.address.view !== 'tab'}
		<!-- 🔴 U-65.6: the tab's title never names a relative — it stays in the history. -->
		<title>{m.relatives_title({}, options)} | {m.brand_name({}, options)}</title>
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

{#if screen.address.view === 'tab' || !screen.relativesAddress}
	<!-- The phone's «Προφίλ» (U-81.1): the application's tab, a page of the site. -->
	<ProfileTab locale={screen.locale} hrefOf={screen.hrefOf} onRow={screen.onRow} />
{:else}
	<!-- Wave 4.0 · screen 55 (record §11, U-139): «Οι συγγενείς μου» and the relative's form under one route, so the list
	     keeps its place and its scroll while the right column changes — the capsule on the list alone (P-W4 Σ-25), no
	     footer (D-W4-55). -->
	<main
		data-testid="relatives-page"
		data-view={screen.address.view}
		class="min-h-page bg-card split:min-h-0"
	>
		<Relatives
			locale={screen.locale}
			address={screen.relativesAddress}
			links={screen.relativesLinks}
			{viewer}
			{offline}
			toMobilePhone={screen.toMobilePhone}
			splitMobilePhone={screen.splitMobilePhone}
			{upcoming}
			doctorNameOf={(doctorId) => {
				const doctor = doctors.of(doctorId);
				return doctor === undefined ? undefined : (doctor?.name ?? null);
			}}
			onSignIn={() => session?.requireSignIn()}
			onRetrySession={() => session?.retryRead()}
		/>
	</main>
{/if}
