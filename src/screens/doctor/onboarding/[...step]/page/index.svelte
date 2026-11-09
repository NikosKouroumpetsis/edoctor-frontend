<script lang="ts">
	import { DoctorOnboardingSteps } from '$modules/doctor-onboarding/ui/steps';
	import { useDoctorOnboardingScreen } from '../hooks';
	import type { DoctorOnboardingScreenProps } from '../types';

	let { data }: DoctorOnboardingScreenProps = $props();

	const screen = useDoctorOnboardingScreen(() => data);
</script>

<!-- Wave 3 · screens 33–42 (record §6): the doctor's sign-up, the doctor-onboarding module's pages. -->
<DoctorOnboardingSteps screen={screen.screen} {...screen.context} />
