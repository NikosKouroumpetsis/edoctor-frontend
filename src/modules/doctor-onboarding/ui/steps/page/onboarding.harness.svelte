<script lang="ts">
	import { untrack } from 'svelte';
	import { useQueryClient, type QueryClient } from '@tanstack/svelte-query';
	import { Session, setSession, type SessionStatus } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import type { DoctorOnboardingScreen } from '$modules/doctor-onboarding/lib/steps';
	import OnboardingDraftHost, {
		type OnboardingDraft
	} from '$modules/doctor-onboarding/ui/draft-host';
	import Probe from './draft-probe.harness.svelte';
	import Steps from './index.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let {
		start = 'member',
		screen,
		context,
		toasts = new ToastState(),
		onReady
	}: {
		start?: SessionStatus;
		screen: DoctorOnboardingScreen;
		context: DoctorOnboardingContext;
		toasts?: ToastState;
		onReady?: (handle: {
			session: Session;
			client: QueryClient;
			draft: OnboardingDraft;
			setStatus: (status: SessionStatus) => void;
		}) => void;
	} = $props();

	let status = $state<SessionStatus>(untrack(() => start));
	const session = new Session({
		status: () => status,
		member: () => (status === 'member' ? { firstName: 'Μαρία', hasPatientProfile: false } : null),
		signOut: async () => {
			status = 'guest';
		},
		expire: () => {
			status = 'guest';
		}
	});
	setSession(session);
	const client = useQueryClient();
	untrack(() => setToasts(toasts));

	function ready(draft: OnboardingDraft) {
		onReady?.({ session, client, draft, setStatus: (next) => (status = next) });
	}
</script>

<!-- Tests only: the root's session, toasts and sign-up draft (its host, as the root layout composes it), and under them
     the page the route names; a new `screen` is a new page, as a navigation makes one, while the host stays. -->
<OnboardingDraftHost>
	<Probe onDraft={ready} />
	<Steps {screen} {...context} />
</OnboardingDraftHost>
