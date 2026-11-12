<script lang="ts">
	import { untrack } from 'svelte';
	import { useDoctorPublicProfiles } from './use-public-profiles.svelte';

	let {
		ids: first,
		enabled = true,
		onReady
	}: {
		ids: readonly string[];
		enabled?: boolean;
		onReady?: (handle: { ask: (next: readonly string[]) => void }) => void;
	} = $props();

	// The page's doctors as the page derives them: one value the test replaces (the screen's `doctorIds`).
	let ids = $state<readonly string[]>(untrack(() => first));
	const doctors = useDoctorPublicProfiles({
		ids: () => ids,
		lang: () => 'el',
		enabled: () => enabled
	});
	untrack(() => onReady?.({ ask: (next) => (ids = next) }));
</script>

<!-- Tests only: every asked doctor's line — its name once read, «waiting» while read, «none» for nobody to show. -->
<ul data-testid="public-profiles">
	{#each ids as doctorId (doctorId)}
		{@const doctor = doctors.of(doctorId)}
		<li data-testid={`public-profile-${doctorId}`}>
			{doctor === undefined ? 'waiting' : doctor === null ? 'none' : (doctor.name ?? '')}
		</li>
	{/each}
</ul>
