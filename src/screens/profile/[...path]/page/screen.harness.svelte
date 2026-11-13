<script lang="ts">
	import { flushSync, untrack } from 'svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { removePersonalQueries, resetPersonalQueries } from '$shared/query';
	import { ConsentDecision, setConsentDecision } from '$shared/state/consent';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { setSiteDialogs, SiteDialogs } from '$shared/state/site-dialogs';
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
			/** The frame's windows a row may ask for («Ρυθμίσεις», the consent's). */
			dialogs: SiteDialogs;
			/** The frame's toast, to read what a page said. */
			toasts: ToastState;
			/** The server no longer knows the session: the next time the page asks who is there, nobody. */
			serverForgets: () => void;
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
	let forgotten = false;
	const session = new Session({
		status: () => status,
		member: () =>
			status === 'member'
				? {
						firstName: 'Ελένη',
						lastName: 'Παππά',
						maskedLoginEmail: 'e***a@example.gr',
						hasPatientProfile: true
					}
				: null,
		signOut: async () => {
			status = 'guest';
			removePersonalQueries(client);
		},
		// The page asks who is there again (`auth/ui/host`: the read is made anew): a session the server forgot is nobody.
		retry: () => {
			if (!forgotten) return;
			status = 'guest';
			removePersonalQueries(client);
		},
		// What the site's host does once the account is deleted (`auth/ui/host`): nobody, and nothing personal kept.
		deleted: () => {
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
	const toasts = setToasts(new ToastState());
	const dialogs = setSiteDialogs(new SiteDialogs());
	// The frame's ONE tracking decision (`site-frame`): every surface of the consent on the page reads the same.
	setConsentDecision(new ConsentDecision());
	untrack(() =>
		onReady?.({
			session,
			dialogs,
			toasts,
			serverForgets: () => (forgotten = true),
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
