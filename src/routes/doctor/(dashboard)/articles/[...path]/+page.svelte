<script lang="ts">
	import DoctorArticlesScreen from '$screens/doctor/articles/[...path]';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<DoctorArticlesScreen {data} />
