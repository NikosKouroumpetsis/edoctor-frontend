<script lang="ts">
	import type { HomeRowResult, StreamedHomeRow } from '$modules/search-doctors/types';
	import { useStreamedSections } from './use-streamed-sections.svelte';

	let {
		sections,
		member
	}: {
		sections: StreamedHomeRow[];
		member: boolean;
	} = $props();

	const rows = useStreamedSections(
		() => sections,
		() => 'el',
		() => member
	);
	const shown = $derived(
		Object.values(rows.results).flatMap((row: HomeRowResult) =>
			row.status === 'ok' ? row.doctors : []
		)
	);
</script>

<ul>
	{#each shown as doctor (doctor.id)}
		<li data-testid={`fee-${doctor.id}`}>{doctor.fee.label}</li>
	{/each}
</ul>
