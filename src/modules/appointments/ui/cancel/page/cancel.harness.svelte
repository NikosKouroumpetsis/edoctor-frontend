<script lang="ts">
	import { untrack } from 'svelte';
	import { Session, setSession } from '$shared/state/session';
	import type { AppointmentDetailFacts } from '$modules/appointments/api/appointment';
	import { AppointmentsMemory, setAppointmentsMemory } from '$modules/appointments/ui/memory';
	import AppointmentCancel from './index.svelte';
	import type { AppointmentCancelProps } from '../types';

	let {
		props,
		memory = new AppointmentsMemory(),
		onReady
	}: {
		props: AppointmentCancelProps;
		memory?: AppointmentsMemory;
		onReady?: (handle: {
			session: Session;
			reread: (next: AppointmentDetailFacts) => void;
		}) => void;
	} = $props();

	// The screen's read of the appointment, answered again (D-W4-37: what the page read after a refusal).
	let appointment = $state(untrack(() => props.appointment));

	const session = new Session({
		status: () => 'member',
		member: () => ({ firstName: 'Ελένη', hasPatientProfile: true }),
		signOut: async () => undefined
	});
	setSession(session);
	untrack(() => {
		setAppointmentsMemory(memory);
		onReady?.({ session, reread: (next) => (appointment = next) });
	});
</script>

<!-- Tests only: screen 53 under a member's session and the page's memory. -->
<AppointmentCancel {...props} {appointment} />
