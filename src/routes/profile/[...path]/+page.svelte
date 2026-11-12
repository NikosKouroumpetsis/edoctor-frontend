<script lang="ts">
	import ProfileScreen from '$screens/profile/[...path]';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<ProfileScreen {data} />
