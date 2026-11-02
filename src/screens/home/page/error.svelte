<script lang="ts">
	import { page } from '$app/state';
	import SiteStatusPage from '$modules/shell/ui/status-page';
	import { useSiteErrorScreen } from '../hooks';

	const screen = useSiteErrorScreen();
</script>

<!-- 🔴 U-61.1 (wave 1.5, screen 9): the site's error page (`routes/+error.svelte`) for a 404 and any other status, in
     the frame (the top bar from 744, the capsule below it, U-61.2 Ε3, and the footer). -->
<main data-slot="site-error" class="bg-card">
	<SiteStatusPage status={page.status} locale={screen.locale} href={screen.href} />
</main>
