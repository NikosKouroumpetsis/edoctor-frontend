<script lang="ts">
	import { setQueryClientContext } from '@tanstack/svelte-query';
	import { createQueryClient } from '$shared/query';
	import { useDoctorProfileScreen } from './use-screen.svelte';

	/** Tests only: the profile screen's composition in its own query client, handed to the spec. */
	let {
		slug,
		onScreen
	}: { slug: string; onScreen: (screen: ReturnType<typeof useDoctorProfileScreen>) => void } =
		$props();
	setQueryClientContext(createQueryClient());
	// svelte-ignore state_referenced_locally
	onScreen(useDoctorProfileScreen(() => slug));
</script>
