<script lang="ts">
	import DoctorProfile from '$modules/doctor-dashboard/ui/profile';
	import { useDoctorProfileScreen } from '../hooks';
	import type { DoctorProfileScreenProps } from '../types';

	let { data }: DoctorProfileScreenProps = $props();

	const screen = useDoctorProfileScreen(() => data);
</script>

<!-- Wave 5.2 · screens 77 … 82 (D-W52-23, D-W52-41, D-W52-49, D-W52-59, D-W52-63, D-W52-69 / 70): «Το προφίλ μου» of the doctor inside the doctor's
     frame, with the section its address names — beside the list from 950, in its place below it. 🔴 D-W52-48: the
     description of screen 79 is read by the public page's own reader, composed here (a module never imports another). -->
<DoctorProfile
	locale={screen.locale}
	address={screen.address}
	readDescription={screen.readDescription}
/>
