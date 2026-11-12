<script lang="ts">
	import { untrack } from 'svelte';
	import { useQueryClient, type QueryClient } from '@tanstack/svelte-query';
	import { removePersonalQueries } from '$shared/query';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import { setAppointmentsMemory, type AppointmentsMemory } from '$modules/appointments/ui/memory';
	import RatingInvitationScreen from './index.svelte';

	let {
		start = 'member',
		invitationId,
		memory,
		onReady
	}: {
		start?: SessionStatus;
		invitationId: string;
		/** What the site keeps above the page (the root host's memory, D-W4-33). */
		memory?: AppointmentsMemory;
		/** `client`: the page host's cache (what a sign-out or another account empties). */
		onReady?: (handle: { session: Session; client: QueryClient; signIn: () => void }) => void;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	const client = useQueryClient();
	const session = new Session({
		status: () => status,
		member: () => (status === 'member' ? { firstName: 'Ελένη', hasPatientProfile: true } : null),
		signOut: async () => {
			status = 'guest';
			removePersonalQueries(client);
		}
	});
	setSession(session);
	setToasts(new ToastState());
	untrack(() => memory && setAppointmentsMemory(memory));
	untrack(() =>
		onReady?.({
			session,
			client,
			signIn: () => {
				status = 'member';
				session.completeSignIn();
			}
		})
	);
</script>

<!-- Tests only: screen 54 under a session, a toast host and (when given) the site's memory. -->
<RatingInvitationScreen {invitationId} />
