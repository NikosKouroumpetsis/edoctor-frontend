<script lang="ts">
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import AuthHost from '$modules/auth/ui/host';
	import type { ProfileScreenData } from '../types';
	import ProfileScreen from './index.svelte';

	let { data }: { data: ProfileScreenData } = $props();

	setToasts(new ToastState());
</script>

<!-- Tests only: the profile's screen under the site's REAL sign-in host (`auth/ui/host`, as the root layout composes
     it) — for what only that host does to a page (card w4-w12: a page put back from the browser's cache). -->
<AuthHost>
	<ProfileScreen {data} />
</AuthHost>
