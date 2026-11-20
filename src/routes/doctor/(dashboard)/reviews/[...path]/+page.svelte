<script lang="ts">
	import DoctorReviewsScreen from '$screens/doctor/reviews/[...path]';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<DoctorReviewsScreen {data} />
