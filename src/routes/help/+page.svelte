<script lang="ts">
	import HelpScreen from '$screens/help';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<HelpScreen {data} />
