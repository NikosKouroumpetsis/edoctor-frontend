<script lang="ts">
	import LoginScreen from '$screens/login';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<LoginScreen {data} />
