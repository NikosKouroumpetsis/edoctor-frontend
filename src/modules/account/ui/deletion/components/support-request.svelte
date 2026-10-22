<script lang="ts">
	import MailIcon from '~icons/lucide/mail';
	import { Button } from '$shared/ui/primitives/button';
	import { m } from '$paraglide/messages.js';
	import type { DeletionSupportProps } from '../types';

	let { messageOptions, supportEmail }: DeletionSupportProps = $props();

	const subject = $derived(
		encodeURIComponent(m.account_deletion_support_subject({}, messageOptions))
	);

	const notes = $derived([
		m.account_deletion_support_include({}, messageOptions),
		m.account_deletion_support_verify({}, messageOptions),
		m.account_deletion_support_deadline({}, messageOptions)
	]);
</script>

<section
	aria-labelledby="account-deletion-support-title"
	class="rounded-xl border border-border/70 bg-card p-card"
>
	<h2
		id="account-deletion-support-title"
		class="text-heading-md text-foreground tablet:text-heading-lg"
	>
		{m.account_deletion_support_title({}, messageOptions)}
	</h2>
	<p class="mt-4 text-body-lg text-foreground">
		{m.account_deletion_support_body({}, messageOptions)}
	</p>
	<p class="mt-2 text-title-lg break-words text-foreground">{supportEmail}</p>
	<ul class="mt-4 flex list-disc flex-col gap-2 pl-5 text-body-md text-muted-foreground">
		{#each notes as note (note)}
			<li>{note}</li>
		{/each}
	</ul>
	<Button
		href={`mailto:${supportEmail}?subject=${subject}`}
		size="lg"
		class="mt-6 w-full tablet:w-auto"
	>
		<MailIcon class="icon-sm" />
		{m.account_deletion_support_action({}, messageOptions)}
	</Button>
</section>
