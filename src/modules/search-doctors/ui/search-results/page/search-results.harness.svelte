<script lang="ts">
	import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
	import { createQueryClient } from '$shared/query';
	import { setSearchDock, type SearchDock } from '$shared/state/search-dock';
	import type { ResultsPageData } from '$modules/search-doctors/api/results';
	import SearchResults from './index.svelte';

	/**
	 * Tests only: the results inside the app's OWN query client (`createQueryClient`: 30 s fresh, as every page), so a
	 * first page the server drew is read as fresh — the page asks nothing again while it hydrates. `client`: a client
	 * the test already used (a press's prefetch); `dock`: the page tree's search dock, as in the frame.
	 */
	let {
		data,
		client: given,
		dock
	}: { data: ResultsPageData; client?: QueryClient; dock?: SearchDock } = $props();
	// svelte-ignore state_referenced_locally
	if (dock) setSearchDock(dock);
	// svelte-ignore state_referenced_locally
	const client = given ?? createQueryClient();
</script>

<QueryClientProvider {client}>
	<SearchResults {data} />
</QueryClientProvider>
