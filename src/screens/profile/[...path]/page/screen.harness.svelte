<script lang="ts">
	import { flushSync, untrack } from 'svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { removePersonalQueries, resetPersonalQueries } from '$shared/query';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import type { ProfileScreenData } from '../types';
	import ProfileScreen from './index.svelte';

	let {
		start = 'member',
		data,
		onReady
	}: {
		start?: SessionStatus;
		data: ProfileScreenData;
		onReady?: (handle: {
			session: Session;
			/** The same person signs in again. */
			signIn: () => void;
			/** Another account answers the sign-in: what the site's host does then (`auth/ui/host`), in its order. */
			otherSignsIn: () => void;
			go: (next: ProfileScreenData) => void;
		}) => void;
	} = $props();

	// The route's `load` answering another address of the same page (SvelteKit keeps the page component).
	let address = $state<ProfileScreenData>(untrack(() => data));
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
	untrack(() =>
		onReady?.({
			session,
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

<!-- Tests only: the profile's screen under a session and a toast host, as the site's root composes it. -->
<ProfileScreen data={address} />
