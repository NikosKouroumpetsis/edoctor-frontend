<script lang="ts">
	import { untrack } from 'svelte';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import type { DoctorNotificationsScreenData } from '../types';
	import DoctorNotificationsScreen from './index.svelte';

	let {
		start = 'member',
		data
	}: {
		start?: SessionStatus;
		data: DoctorNotificationsScreenData;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	setSession(
		new Session({
			status: () => status,
			member: () => (status === 'member' ? { firstName: 'Ελένη', hasPatientProfile: true } : null),
			signOut: async () => {
				status = 'guest';
			}
		})
	);
</script>

<!-- Tests only: the `/doctor/notifications` screen under a session (the doctor's frame lets only a doctor in). -->
<DoctorNotificationsScreen {data} />
