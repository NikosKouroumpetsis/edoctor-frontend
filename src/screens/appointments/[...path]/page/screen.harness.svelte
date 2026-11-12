<script lang="ts">
	import { flushSync, untrack } from 'svelte';
	import { removePersonalQueries, resetPersonalQueries } from '$shared/query';
	import { useQueryClient, type QueryClient } from '@tanstack/svelte-query';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import { setAppointmentsMemory, type AppointmentsMemory } from '$modules/appointments/ui/memory';
	import type { AppointmentsScreenData } from '../types';
	import AppointmentsScreen from './index.svelte';

	let {
		start = 'member',
		data,
		memory,
		onReady
	}: {
		start?: SessionStatus;
		data: AppointmentsScreenData;
		/** What the site keeps above the page (the root host's memory, D-W4-33). */
		memory?: AppointmentsMemory;
		onReady?: (handle: {
			session: Session;
			/** The page host's cache (what a sign-out or another account empties). */
			client: QueryClient;
			signIn: () => void;
			/** Another account answers the sign-in: what the site's host does then (`auth/ui/host`), in its order. */
			otherSignsIn: () => void;
			go: (next: AppointmentsScreenData) => void;
		}) => void;
	} = $props();

	// The route's `load` answering another address of the same page (SvelteKit keeps the page component, P-W4 §3.6).
	let address = $state<AppointmentsScreenData>(untrack(() => data));

	let status = $state<SessionStatus>(untrack(() => start));
	const client = useQueryClient();
	const session = new Session({
		status: () => status,
		member: () => (status === 'member' ? { firstName: 'Ελένη', hasPatientProfile: true } : null),
		signOut: async () => {
			status = 'guest';
			removePersonalQueries(client);
		},
		// What the site's host does at a write's `401` (`auth/ui/host`): nobody from this moment, no personal read kept.
		expire: () => {
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
			},
			otherSignsIn: () => {
				// The read answers a member (a paint of its own), then the host's effects: the account, then the surface.
				flushSync(() => (status = 'member'));
				void resetPersonalQueries(client);
				session.accountChanged();
				session.completeSignIn();
			},
			go: (next) => (address = next)
		})
	);
</script>

<!-- Tests only: the appointments' screen under a session, a toast host and (when given) the site's memory. -->
<AppointmentsScreen data={address} />
