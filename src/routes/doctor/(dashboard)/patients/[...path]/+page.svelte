<script lang="ts">
	import DoctorPatientsScreen from '$screens/doctor/patients/[...path]';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<DoctorPatientsScreen {data} />
