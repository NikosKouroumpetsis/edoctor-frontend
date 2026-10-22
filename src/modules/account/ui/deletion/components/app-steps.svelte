<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { DeletionSectionProps } from '../types';

	let { messageOptions }: DeletionSectionProps = $props();

	const steps = $derived([
		m.account_deletion_app_step_open({}, messageOptions),
		m.account_deletion_app_step_path({}, messageOptions),
		m.account_deletion_app_step_review({}, messageOptions),
		m.account_deletion_app_step_code({}, messageOptions)
	]);
</script>

<section
	aria-labelledby="account-deletion-app-title"
	class="rounded-xl border border-border/70 bg-card p-card"
>
	<h2
		id="account-deletion-app-title"
		class="text-heading-md text-foreground tablet:text-heading-lg"
	>
		{m.account_deletion_app_title({}, messageOptions)}
	</h2>
	<ol class="mt-4 flex list-decimal flex-col gap-3 pl-5 text-body-lg text-foreground">
		{#each steps as step (step)}
			<li>{step}</li>
		{/each}
	</ol>
	<p class="mt-4 text-body-md text-muted-foreground">
		{m.account_deletion_app_result({}, messageOptions)}
	</p>
</section>
