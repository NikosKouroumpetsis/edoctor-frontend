<script lang="ts">
	import DoctorDetailsScreen from '$screens/doctors/[slug]/details/[section]';

	let { data } = $props();
</script>

<DoctorDetailsScreen {data} />
