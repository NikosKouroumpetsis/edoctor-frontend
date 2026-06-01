<script lang="ts">
	import type { Snippet } from 'svelte';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { createQueryClient } from '$shared/query';

	let { children }: { children: Snippet } = $props();

	const queryClient = createQueryClient();
</script>

<QueryClientProvider client={queryClient}>
	{@render children()}
</QueryClientProvider>
