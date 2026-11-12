<script lang="ts">
	import type { AppointmentTerms } from '$modules/appointments/lib/detail';

	let { terms }: { terms: AppointmentTerms } = $props();
</script>

<!-- «Όροι του γιατρού» (record §7.2, U-135.6, P-B4 §13.3.1): the application's quiet band, only while the patient can still
     cancel — how it is confirmed, then the cancellation's line and its very instant. -->
<section data-testid="appointment-terms" class="mt-3 rounded-md bg-foreground/5 p-4">
	<h3 class="text-label-md font-medium text-muted-foreground">{terms.title}</h3>
	{#each terms.lines as line, index (index)}
		<p
			class={index === 0
				? 'mt-1.5 text-body-sm font-semibold text-foreground'
				: 'text-body-sm text-muted-foreground'}
		>
			{line}
		</p>
	{/each}
</section>
