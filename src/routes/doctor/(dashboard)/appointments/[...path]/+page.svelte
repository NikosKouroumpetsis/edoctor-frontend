<script lang="ts">
	import DoctorAppointmentsScreen from '$screens/doctor/appointments/[...path]';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<DoctorAppointmentsScreen {data} />
