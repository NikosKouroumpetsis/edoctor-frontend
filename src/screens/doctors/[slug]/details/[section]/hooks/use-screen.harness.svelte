<script lang="ts">
	import { setQueryClientContext } from '@tanstack/svelte-query';
	import { createQueryClient } from '$shared/query';
	import { useDoctorDetailsScreen } from './use-screen.svelte';

	/** Tests only: the details screen's composition in its own query client, handed to the spec. */
	let {
		slug,
		onScreen
	}: { slug: string; onScreen: (screen: ReturnType<typeof useDoctorDetailsScreen>) => void } =
		$props();
	setQueryClientContext(createQueryClient());
	// svelte-ignore state_referenced_locally
	onScreen(useDoctorDetailsScreen(() => slug));
</script>
