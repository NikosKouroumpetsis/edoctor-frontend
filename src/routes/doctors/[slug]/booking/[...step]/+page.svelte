<script lang="ts">
	import BookingScreen from '$screens/doctors/[slug]/booking/[...step]';

	let { data } = $props();
</script>

<BookingScreen {data} />
