<script lang="ts">
	import DoctorProfileScreen from '$screens/doctors/[slug]';

	let { data } = $props();
</script>

<DoctorProfileScreen {data} />
