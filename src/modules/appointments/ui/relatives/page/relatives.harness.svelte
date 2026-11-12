<script lang="ts">
	import { untrack } from 'svelte';
	import { useQueryClient, type QueryClient } from '@tanstack/svelte-query';
	import { removePersonalQueries } from '$shared/query';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import { appointmentsViewerOf } from '$modules/appointments/lib/list';
	import { useRelativeUpcoming } from '../hooks/use-upcoming.svelte';
	import type { RelativesAddress, RelativesLinks } from '../types';
	import Relatives from './index.svelte';

	let {
		start = 'member',
		address,
		hasPatientProfile = true,
		offline = false,
		doctors = {},
		onReady
	}: {
		start?: SessionStatus;
		address: RelativesAddress;
		hasPatientProfile?: boolean;
		offline?: boolean;
		/** The doctors' names the screen's read would give (D-W4-29). */
		doctors?: Record<string, string>;
		onReady?: (handle: {
			session: Session;
			client: QueryClient;
			go: (next: RelativesAddress) => void;
			signOut: () => void;
		}) => void;
	} = $props();

	const links: RelativesLinks = {
		profile: '/profile',
		list: '/profile/relatives',
		create: '/profile/relatives/new',
		relative: (relativeId) => `/profile/relatives/${relativeId}`
	};

	// The route's `load` answering another address of the same page (SvelteKit keeps the page component).
	let current = $state<RelativesAddress>(untrack(() => address));
	let status = $state<SessionStatus>(untrack(() => start));
	const client = useQueryClient();
	const session = new Session({
		status: () => status,
		member: () =>
			status === 'member'
				? { firstName: 'Ελένη', hasPatientProfile: untrack(() => hasPatientProfile) }
				: null,
		signOut: async () => {
			status = 'guest';
			removePersonalQueries(client);
		}
	});
	setSession(session);
	setToasts(new ToastState());
	const viewer = $derived(appointmentsViewerOf(session));
	const upcoming = useRelativeUpcoming({ enabled: () => viewer === 'member' });
	untrack(() =>
		onReady?.({
			session,
			client,
			go: (next) => (current = next),
			signOut: () => void session.signOut()
		})
	);
</script>

<!-- Tests only: screen 55 under a session and a toast host, the screen's read of the upcoming visits and its doctors. -->
<Relatives
	locale="el"
	address={current}
	{links}
	{viewer}
	{offline}
	toMobilePhone={(dialCode, typed) => {
		const digits = typed.replace(/\D/gu, '');
		return dialCode === '+30' && /^69\d{8}$/u.test(digits) ? `+30${digits}` : null;
	}}
	splitMobilePhone={(stored) =>
		stored.startsWith('+30') ? { dialCode: '+30', national: stored.slice(3) } : null}
	{upcoming}
	doctorNameOf={(doctorId) => doctors[doctorId] ?? null}
	onSignIn={() => session.requireSignIn()}
	onRetrySession={() => session.retryRead()}
/>
