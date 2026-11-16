<script lang="ts">
	import AppointmentCancelLink from '$modules/appointments/ui/cancel-link';
	import { useAppointmentCancelLinkScreen } from '../hooks';
	import type { AppointmentCancelLinkScreenProps } from '../types';

	let { token }: AppointmentCancelLinkScreenProps = $props();

	const screen = useAppointmentCancelLinkScreen(() => token);
</script>

<!-- 🔴 D-W51-72: the address carries a secret — the page tells the browser to send it to nobody (the document's header
     says it too, the route's `load`), and asks not to be indexed. -->
<svelte:head>
	<meta name="referrer" content="no-referrer" />
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- Wave 5.1 · the cancel link's page (D-W51-72, U-198.1): screen 53 for a patient without an account, the module's slice
     owns its read and its one write. -->
<AppointmentCancelLink locale={screen.locale} token={screen.token} />
