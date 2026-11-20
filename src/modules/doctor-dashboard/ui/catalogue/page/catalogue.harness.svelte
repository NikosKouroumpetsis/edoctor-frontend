<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { doctorProfileNewServiceItemPath } from '$modules/doctor-dashboard/lib/paths';
	import DoctorServiceCatalogue from './index.svelte';

	let {
		client,
		locale = 'el'
	}: {
		client: QueryClient;
		locale?: 'el' | 'en';
	} = $props();
</script>

<!-- Tests only: «Νέα υπηρεσία» under the page tree's query client. -->
<QueryClientProvider {client}>
	<DoctorServiceCatalogue
		{locale}
		servicesHref="/doctor/profile/services"
		item={(serviceId) => doctorProfileNewServiceItemPath(serviceId)}
		onClose={() => {}}
	/>
</QueryClientProvider>
