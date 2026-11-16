<script lang="ts">
	import DoctorMessagesScreen from '$screens/doctor/messages/[...path]';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<DoctorMessagesScreen {data} />
