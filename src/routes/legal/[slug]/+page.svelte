<script lang="ts">
	import LegalScreen from '$screens/legal/[slug]';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<LegalScreen slug={data.slug} />
