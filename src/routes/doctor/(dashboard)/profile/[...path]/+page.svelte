<script lang="ts">
	import DoctorProfileScreen from '$screens/doctor/profile/[...path]';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<DoctorProfileScreen {data} />
