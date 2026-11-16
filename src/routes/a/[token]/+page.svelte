<script lang="ts">
	import AppointmentCancelLinkScreen from '$screens/a/[token]';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<AppointmentCancelLinkScreen token={data.token} />
