<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import type { DoctorProfileScreenData } from '../types';
	import DoctorProfileScreen from './index.svelte';

	let { client, data }: { client: QueryClient; data: DoctorProfileScreenData } = $props();
</script>

<!-- Tests only: the `/doctor/profile/[...path]` screen under the page tree's query client. -->
<QueryClientProvider {client}>
	<DoctorProfileScreen {data} />
</QueryClientProvider>
