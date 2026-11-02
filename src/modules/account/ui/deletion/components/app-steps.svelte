<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { emphasizeNames } from '$modules/account/lib/deletion';
	import type { DeletionSectionProps } from '../types';

	let { messageOptions, headingClass }: DeletionSectionProps = $props();

	// The names on the application's tab, rows and buttons (its i18n, word for word), bold in the steps (U-62.1 Π3).
	const names = $derived([
		m.account_deletion_app_name_profile({}, messageOptions),
		m.account_deletion_app_name_settings({}, messageOptions),
		m.account_deletion_app_name_delete({}, messageOptions),
		m.account_deletion_app_name_send({}, messageOptions),
		m.account_deletion_app_name_confirm({}, messageOptions)
	]);
	const steps = $derived(
		[
			m.account_deletion_app_step_open({}, messageOptions),
			m.account_deletion_app_step_path({}, messageOptions),
			m.account_deletion_app_step_review({}, messageOptions),
			m.account_deletion_app_step_code({}, messageOptions)
		].map((step) => ({ step, runs: emphasizeNames(step, names) }))
	);
</script>

<!-- 🔴 U-62.1 (the prototype 10, Π3): «Από την εφαρμογή» as an H2 of the text, no card — the numbered steps with the
     application's names bold, then what happens after them. -->
<section aria-labelledby="from-the-app" data-slot="account-deletion-app">
	<h2 id="from-the-app" class={headingClass}>
		{m.account_deletion_app_title({}, messageOptions)}
	</h2>
	<ol class="mb-4 list-decimal pl-6">
		{#each steps as { step, runs } (step)}
			<li class="mb-2.5 pl-1 marker:text-foreground/85 last:mb-0">
				{#each runs as run, index (index)}{#if run.strong}<strong class="font-semibold"
							>{run.text}</strong
						>{:else}{run.text}{/if}{/each}
			</li>
		{/each}
	</ol>
	<p>{m.account_deletion_app_result({}, messageOptions)}</p>
</section>
