<script lang="ts">
	import { ContextCard } from '$shared/ui/molecules/context-card';
	import type { AppointmentContext } from '$modules/appointments/lib/change';
	import DoctorPhoto from '$modules/appointments/ui/doctor-photo';

	let { context }: { context: AppointmentContext } = $props();
</script>

{#snippet photo()}
	<DoctorPhoto
		photo={context.photo ? { src: context.photo.url, alt: context.photo.alt } : null}
		class="size-row"
	/>
{/snippet}

<!-- `appt.css:301-307` · «Το ραντεβού σας» over a screen the appointment opens (record §8.2, §9.2): the shared box
     (D-W51-50) with the doctor's photo 56 (the 8 corner), the day and the hour, «γιατρός · υπηρεσία · διάρκεια», the
     address and «Για: …» for a relative. -->
<ContextCard
	leading={photo}
	label={context.label}
	title={context.when}
	lines={[context.line, context.address, context.forWhom]}
	testId="appointment-context"
/>
