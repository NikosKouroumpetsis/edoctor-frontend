<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { Button } from '$shared/ui/primitives/button';
	import type { DeletionDoneProps } from '../types';

	let { locale, destination, homeHref }: DeletionDoneProps = $props();

	const options = $derived({ locale });
</script>

<!-- The end of «Διαγραφή λογαριασμού» (D-W45-30, the application's `ProfileAccountDeletionCompleted`): shown once the
     browser's session has already closed — «Ο λογαριασμός σας διαγράφηκε», what happened to the data, where the
     confirmation goes (the server's mask, as text) and ONE way on, to the home page, which takes this address's place
     in the history: «back» never shows the form again. -->
<div
	data-testid="deletion-done"
	role="status"
	class="mx-auto flex w-full max-w-form flex-col items-center gap-4 px-gutter-sm pt-section-lg pb-pane-inset-lg text-center"
>
	<h1 data-testid="deletion-done-title" class="text-heading-md font-semibold text-foreground">
		{m.profile_account_deletion_done_title({}, options)}
	</h1>
	<p class="text-body-lg text-muted-foreground">
		{m.profile_account_deletion_done_body({}, options)}
	</p>
	{#if destination}
		<p data-testid="deletion-done-notice" class="text-body-md text-muted-foreground">
			{m.profile_account_deletion_done_notice({ destination }, options)}
		</p>
	{/if}
	<Button
		href={homeHref}
		data-sveltekit-replacestate
		tone="contrast"
		bordered={false}
		label={m.profile_account_deletion_done_home({}, options)}
		textClass="text-body-lg"
		class="mt-2 w-full px-6 tablet:w-auto"
		data-testid="deletion-done-home"
	/>
</div>
