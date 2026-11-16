<script lang="ts">
	import DoctorNotificationsScreen from '$screens/doctor/notifications';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<DoctorNotificationsScreen {data} />
