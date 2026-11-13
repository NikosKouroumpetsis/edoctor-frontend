<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setToasts, Toaster, ToastState } from '$shared/ui/molecules/toast';
	import AuthHost from '$modules/auth/ui/host';
	import type { ProfileScreenData } from '../types';
	import ProfileScreen from './index.svelte';

	let { client, data }: { client: QueryClient; data: ProfileScreenData } = $props();

	const toasts = setToasts(new ToastState());
</script>

<!-- Tests only (screen 58): the profile's screen under the site's REAL sign-in host and a client the spec can read —
     the session is the server's own answer, and what the cache keeps can be looked at. -->
<QueryClientProvider {client}>
	<AuthHost>
		<ProfileScreen {data} />
	</AuthHost>
	<Toaster {toasts} />
</QueryClientProvider>
