<script lang="ts">
	import { untrack } from 'svelte';
	import { getSiteDialogs, type SiteDialogs } from '$shared/state/site-dialogs';

	let { onRead }: { onRead: (dialogs: SiteDialogs) => void } = $props();

	const dialogs = getSiteDialogs();
	untrack(() => onRead(dialogs));
</script>
