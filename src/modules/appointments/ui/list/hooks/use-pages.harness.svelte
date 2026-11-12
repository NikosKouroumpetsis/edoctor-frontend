<script lang="ts">
	import { flushSync, untrack } from 'svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { removePersonalQueries, resetPersonalQueries } from '$shared/query';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import type { AppointmentsAddress } from '$modules/appointments/lib/paths';
	import { setAppointmentsMemory, type AppointmentsMemory } from '$modules/appointments/ui/memory';
	import { useAppointmentsPages } from './use-pages.svelte';

	let {
		start = 'member',
		hasPatientProfile = true,
		address: first,
		invitationId,
		memory,
		onReady
	}: {
		start?: SessionStatus;
		hasPatientProfile?: boolean;
		/** The appointments' own pages: the address the hook follows. */
		address?: AppointmentsAddress;
		/** Screen 54: the invitation the address names (the hook's other way of working). */
		invitationId?: string;
		/** What the site keeps above the page (the root host's memory, D-W4-33). */
		memory?: AppointmentsMemory;
		onReady?: (handle: {
			session: Session;
			go: (next: AppointmentsAddress) => void;
			signIn: () => void;
			/** Another account answers the sign-in: what the site's host does then (`auth/ui/host`), in its order. */
			otherSignsIn: (patient?: boolean) => void;
		}) => void;
	} = $props();

	let address = $state<AppointmentsAddress>(
		untrack(() => first ?? { view: 'list', tab: 'upcoming' })
	);
	let status = $state<SessionStatus>(untrack(() => start));
	let patient = $state(untrack(() => hasPatientProfile));
	const client = useQueryClient();
	const session = new Session({
		status: () => status,
		member: () => (status === 'member' ? { firstName: 'Ελένη', hasPatientProfile: patient } : null),
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
	untrack(() => memory && setAppointmentsMemory(memory));

	const invitation = untrack(() => invitationId);
	const pages =
		invitation === undefined
			? useAppointmentsPages({ page: 'appointments', address: () => address })
			: useAppointmentsPages({ page: 'rating', invitationId: () => invitation });
	untrack(() =>
		onReady?.({
			session,
			go: (next) => (address = next),
			signIn: () => {
				status = 'member';
				session.completeSignIn();
			},
			otherSignsIn: (isPatient = true) => {
				// The read answers a member (a paint of its own), then the host's effects: the account, then the surface.
				flushSync(() => {
					patient = isPatient;
					status = 'member';
				});
				void resetPersonalQueries(client);
				session.accountChanged();
				session.completeSignIn();
			}
		})
	);

	const told = $derived({
		viewer: pages.viewer,
		tab: pages.tab,
		openId: pages.openId,
		step: pages.step,
		paneKey: pages.paneKey,
		paneEmpty: pages.paneEmpty,
		opened: pages.opened?.id ?? null,
		openedNote: pages.opened?.patientNote ?? null,
		visit: pages.visit.appointment?.id ?? null,
		visitLoading: pages.visit.loading,
		visitMissing: pages.visit.missing,
		rows: pages.list.rows.map((row) => row.id),
		listLoading: pages.list.loading,
		doctorIds: pages.doctorIds,
		invitation: pages.invitation?.invitation?.invitationId ?? null,
		done: pages.openId ? pages.doneOf(pages.openId) : null
	});
</script>

<!-- Tests only: what the module's hook tells the two screens, as one line of JSON. -->
<pre data-testid="pages">{JSON.stringify(told)}</pre>
