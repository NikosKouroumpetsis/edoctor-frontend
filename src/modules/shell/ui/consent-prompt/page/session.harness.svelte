<script lang="ts">
	import { setSession, type Session } from '$shared/state/session';
	import { setSiteDialogs, type SiteDialogs } from '$shared/state/site-dialogs';
	import ConsentPrompt from './index.svelte';

	/** Tests only: the card under the page tree's session, as in the frame. */
	let { session, dialogs }: { session: Session; dialogs?: SiteDialogs } = $props();
	// svelte-ignore state_referenced_locally
	setSession(session);
	// svelte-ignore state_referenced_locally
	if (dialogs) setSiteDialogs(dialogs);
</script>

<ConsentPrompt />
