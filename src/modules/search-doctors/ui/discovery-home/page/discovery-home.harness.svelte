<script lang="ts">
	import type { Snippet } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSearchDock, type SearchDock } from '$shared/state/search-dock';
	import type { HomePageData } from '$modules/search-doctors/types';
	import DiscoveryHome from './index.svelte';

	/**
	 * Tests only: the home inside its own query client (or `client`, one a test reads or filled first) and, as in the
	 * frame, the page tree's search dock.
	 */
	let {
		data,
		dock,
		after,
		client: given
	}: { data: HomePageData; dock?: SearchDock; after?: Snippet; client?: QueryClient } = $props();

	// svelte-ignore state_referenced_locally
	if (dock) setSearchDock(dock);
	// svelte-ignore state_referenced_locally
	const client =
		given ??
		new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: Infinity } }
		});
</script>

<QueryClientProvider {client}>
	<DiscoveryHome {data} {after} />
</QueryClientProvider>
