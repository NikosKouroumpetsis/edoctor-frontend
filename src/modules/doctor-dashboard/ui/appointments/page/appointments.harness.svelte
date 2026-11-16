<script lang="ts">
	import { untrack } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, type ToastState } from '$shared/ui/molecules/toast';
	import type { DoctorAppointmentsAddress } from '$modules/doctor-dashboard/lib/paths';
	import DoctorAppointments from './index.svelte';
	import type { DoctorAppointmentsLinks } from '../types';

	let {
		toasts,
		client,
		address,
		links,
		session = null,
		locale = 'el',
		paneText = null
	}: {
		toasts: ToastState;
		client: QueryClient;
		address: DoctorAppointmentsAddress;
		links: DoctorAppointmentsLinks;
		session?: Session | null;
		locale?: 'el' | 'en';
		/** When given, the screen's pane: a stand-in for screen 68 with what the list said of its opening. */
		paneText?: string | null;
	} = $props();

	untrack(() => {
		setToasts(toasts);
		if (session) setSession(session);
	});
</script>

<!-- Tests only: «Ραντεβού» under the site frame's toast and the page tree's query client (and, when asked, a pane). -->
<QueryClientProvider {client}>
	{#if paneText !== null}
		<DoctorAppointments {locale} {address} {links}>
			{#snippet pane({ opening })}
				<p data-testid="pane" data-opening={opening || undefined}>{paneText}</p>
			{/snippet}
		</DoctorAppointments>
	{:else}
		<DoctorAppointments {locale} {address} {links} />
	{/if}
</QueryClientProvider>
