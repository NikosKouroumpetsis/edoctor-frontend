<script lang="ts">
	import { untrack } from 'svelte';
	import { useDoctorOfficeSlots } from './use-office-slots.svelte';

	let {
		officeIds: first,
		doctorId = 'doc-a',
		serviceId = 'svc-a',
		onReady
	}: {
		officeIds: string[];
		doctorId?: string;
		serviceId?: string;
		onReady?: (handle: { ask: (next: string[]) => void; retry: () => void }) => void;
	} = $props();

	// The page's offices as the page derives them: one value the test replaces (another doctor, another appointment).
	let officeIds = $state<string[]>(untrack(() => first));
	const slots = useDoctorOfficeSlots({
		doctorId: () => doctorId,
		officeIds: () => officeIds,
		serviceId: () => serviceId
	});
	untrack(() => onReady?.({ ask: (next) => (officeIds = next), retry: () => slots.retry() }));
</script>

<!-- Tests only: where the reads stand, and every asked office's line — its zone once answered, «none» until then. -->
<p data-testid="office-slots-state">{slots.state}</p>
<ul>
	{#each officeIds as officeId (officeId)}
		<li data-testid={`office-slots-${officeId}`}>{slots.byOffice[officeId]?.timezone ?? 'none'}</li>
	{/each}
</ul>
