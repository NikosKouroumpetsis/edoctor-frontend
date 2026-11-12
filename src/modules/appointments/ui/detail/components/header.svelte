<script lang="ts">
	import type { AppointmentHeader } from '$modules/appointments/lib/detail';
	import { APPOINTMENT_DAY_TIME_SEPARATOR } from '$modules/appointments/lib/when';
	import StatusPill from '$modules/appointments/ui/status-pill';

	let { header }: { header: AppointmentHeader } = $props();
</script>

<!-- Record §7.2: the status pill, the day and the time (28/600; below 744 the time on a line of its own and a day too long
     for the screen wraps, Σ3 — never cut), and «Σε 2 ημέρες · Διάρκεια 30 λεπτά» (the history: the length alone). -->
<StatusPill pill={header.status} testId="appointment-status" />
<h2
	data-testid="appointment-when"
	class="mt-2.5 mb-1 flex flex-col text-heading-lg font-semibold text-foreground tablet:block"
>
	<span class="tablet:whitespace-nowrap">{header.day}</span><span class="hidden tablet:inline"
		>{APPOINTMENT_DAY_TIME_SEPARATOR}</span
	><span class="whitespace-nowrap">{header.time}</span>
</h2>
{#if header.sub}
	<p data-testid="appointment-sub" class="mb-5 text-body-md text-muted-foreground">{header.sub}</p>
{/if}
