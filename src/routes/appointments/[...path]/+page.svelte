<script lang="ts">
	import AppointmentsScreen from '$screens/appointments/[...path]';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<AppointmentsScreen {data} />
