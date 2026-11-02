<script lang="ts">
	import ArticlesScreen from '$screens/articles';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ArticlesScreen {data} />
