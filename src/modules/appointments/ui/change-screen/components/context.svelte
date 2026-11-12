<script lang="ts">
	import type { AppointmentContext } from '$modules/appointments/lib/change';
	import DoctorPhoto from '$modules/appointments/ui/doctor-photo';

	let { context }: { context: AppointmentContext } = $props();
</script>

<!-- `appt.css:301-307` · «Το ραντεβού σας» over a screen the appointment opens (record §8.2, §9.2): the photo 56 (the 8
     corner), the word 12 muted, the day and the hour 15/600, «γιατρός · υπηρεσία · διάρκεια» and the address 13 muted,
     «Για: …» for a relative; the band with its line, the 12 corner. Every word a text node (U-65.6). -->
<div
	data-slot="appointment-context"
	data-testid="appointment-context"
	class="mb-5 flex flex-row items-center gap-3 rounded-md border border-line bg-background px-3.5 py-3"
>
	<DoctorPhoto
		photo={context.photo ? { src: context.photo.url, alt: context.photo.alt } : null}
		class="size-row"
	/>
	<div class="grid min-w-0">
		<span class="text-label-md font-medium text-muted-foreground">{context.label}</span>
		<span class="text-body-md font-semibold text-foreground">{context.when}</span>
		{#if context.line}
			<span class="text-label-lg font-normal text-muted-foreground">{context.line}</span>
		{/if}
		{#if context.address}
			<span class="text-label-lg font-normal text-muted-foreground">{context.address}</span>
		{/if}
		{#if context.forWhom}
			<span class="text-label-lg font-normal text-muted-foreground">{context.forWhom}</span>
		{/if}
	</div>
</div>
