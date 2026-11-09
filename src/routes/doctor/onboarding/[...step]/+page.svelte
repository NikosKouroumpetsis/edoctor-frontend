<script lang="ts">
	import DoctorOnboardingScreen from '$screens/doctor/onboarding/[...step]';

	let { data } = $props();
</script>

<DoctorOnboardingScreen {data} />
