<script lang="ts">
	import { page } from '$app/state';
	import { DoctorDetailError } from '$modules/doctor/ui/detail';
	import { useDoctorProfileScreen } from '../hooks';

	const screen = useDoctorProfileScreen(() => page.params.slug ?? '');
</script>

<!-- 🔴 MINOR-6 of r1, U-61.1: the error page of a profile and of its windows (`routes/doctors/[slug]/+error.svelte`)
     — the route's 404 (the site's status page) or 503 (screen 5's) with its own title, never indexed. -->
<main data-slot="doctor-profile" class="bg-card">
	<DoctorDetailError
		status={page.status}
		locale={screen.locale}
		backHref={screen.backHref}
		href={screen.href}
		onRetry={screen.onRetry}
	/>
</main>
