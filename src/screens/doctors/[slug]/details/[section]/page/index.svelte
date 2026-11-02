<script lang="ts">
	import DoctorDetail from '$modules/doctor/ui/detail';
	import { useDoctorDetailsScreen } from '../hooks';
	import type { DoctorDetailsScreenProps } from '../types';

	let { data }: DoctorDetailsScreenProps = $props();

	const screen = useDoctorDetailsScreen(() => data.load.profile.doctorSlug);
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
		canonicalUrl={screen.canonicalUrl}
		alternateUrls={screen.alternateUrls}
		backHref={screen.backHref}
		signedIn={false}
		onSignIn={screen.onSignIn}
	/>
</main>
