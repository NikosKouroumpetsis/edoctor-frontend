<script lang="ts">
	import HomeScreen from '$screens/home';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<HomeScreen {data} />
