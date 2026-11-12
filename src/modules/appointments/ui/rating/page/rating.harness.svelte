<script lang="ts">
	import { untrack } from 'svelte';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { AppointmentsMemory, setAppointmentsMemory } from '$modules/appointments/ui/memory';
	import AppointmentRating from './index.svelte';
	import type { AppointmentRatingProps } from '../types';

	let {
		props,
		status = 'member',
		memory = new AppointmentsMemory(),
		onReady
	}: {
		props: AppointmentRatingProps;
		status?: SessionStatus;
		memory?: AppointmentsMemory;
		onReady?: (handle: { session: Session }) => void;
	} = $props();

	const session = new Session({
		status: () => status,
		member: () => (status === 'member' ? { firstName: 'Ελένη', hasPatientProfile: true } : null),
		signOut: async () => undefined
	});
	setSession(session);
	untrack(() => {
		setAppointmentsMemory(memory);
		onReady?.({ session });
	});
</script>

<!-- Tests only: screen 54 under a session and the page's memory (the root host's, D-W4-33). -->
<AppointmentRating {...props} />
