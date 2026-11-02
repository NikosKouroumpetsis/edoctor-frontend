<script lang="ts">
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { createQueryClient } from '$shared/query';
	import type { DoctorDetailPageProps } from '../types';
	import DoctorDetail from './index.svelte';

	/** Tests only: the page inside the app's own query client (each render its own, so no read leaks between tests). */
	let props: DoctorDetailPageProps = $props();
	const client = createQueryClient();
</script>

<QueryClientProvider {client}>
	<DoctorDetail {...props} />
</QueryClientProvider>
