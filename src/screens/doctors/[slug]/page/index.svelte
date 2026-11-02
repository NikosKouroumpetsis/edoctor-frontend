<script lang="ts">
	import DoctorDetail from '$modules/doctor/ui/detail';
	import { useDoctorProfileScreen } from '../hooks';
	import type { DoctorProfileScreenProps } from '../types';

	let { data }: DoctorProfileScreenProps = $props();

	const screen = useDoctorProfileScreen(() => data.load.profile.doctorSlug);
</script>

<!-- A doctor's profile (wave 1.5, screen 5): the doctor module's page, drawn whole by the server (U-28.4). -->
<main data-slot="doctor-profile" class="bg-card">
	<DoctorDetail
		load={data.load}
		locale={screen.locale}
		routeSection={null}
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
