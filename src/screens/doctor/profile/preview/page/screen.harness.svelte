<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import DoctorProfilePreviewScreen from './index.svelte';

	let { client }: { client: QueryClient } = $props();
</script>

<!-- Tests only: the `/doctor/profile/preview` screen under the page tree's query client. -->
<QueryClientProvider {client}>
	<DoctorProfilePreviewScreen />
</QueryClientProvider>
