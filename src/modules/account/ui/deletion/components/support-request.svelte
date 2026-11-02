<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import { m } from '$paraglide/messages.js';
	import type { DeletionSupportProps } from '../types';

	let { messageOptions, supportEmail, headingClass }: DeletionSupportProps = $props();

	const subject = $derived(
		encodeURIComponent(m.account_deletion_support_subject({}, messageOptions))
	);

	const notes = $derived([
		m.account_deletion_support_include({}, messageOptions),
		m.account_deletion_support_verify({}, messageOptions),
		m.account_deletion_support_deadline({}, messageOptions)
	]);
</script>

<!-- 🔴 U-62.1 (the prototype 10, Π3; U-62.2 Ε3): «Χωρίς πρόσβαση στην εφαρμογή» — the address on its own line (18/600),
     the three notes, and «Στείλτε email» as the dark pill (the main action of screens 5/9), a `mailto` with its
     subject. -->
<section aria-labelledby="without-the-app" data-slot="account-deletion-support">
	<h2 id="without-the-app" class={headingClass}>
		{m.account_deletion_support_title({}, messageOptions)}
	</h2>
	<p class="mb-2">{m.account_deletion_support_body({}, messageOptions)}</p>
	<p class="mb-4 text-title-sm wrap-anywhere text-foreground">{supportEmail}</p>
	<ul class="mb-4 list-disc pl-6">
		{#each notes as note (note)}
			<li class="mb-2.5 pl-1 last:mb-0">{note}</li>
		{/each}
	</ul>
	<Button
		href={`mailto:${supportEmail}?subject=${subject}`}
		tone="contrast"
		radius="full"
		label={m.account_deletion_support_action({}, messageOptions)}
		textClass="text-body-md"
		class="mt-2"
	>
		{#snippet leading()}
			<Ionicon name="mail-outline" class="icon-md text-secondary-foreground" />
		{/snippet}
	</Button>
</section>
