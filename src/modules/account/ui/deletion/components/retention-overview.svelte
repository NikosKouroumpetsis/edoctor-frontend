<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { DeletionSupportProps, RetainedRecord } from '../types';

	let { messageOptions, supportEmail }: DeletionSupportProps = $props();

	const retained = $derived<RetainedRecord[]>([
		{
			id: 'patient-record',
			title: m.account_deletion_retained_patient_record_title({}, messageOptions),
			body: m.account_deletion_retained_patient_record_body({}, messageOptions),
			duration: m.account_deletion_retained_patient_record_duration({}, messageOptions)
		},
		{
			id: 'appointment-book',
			title: m.account_deletion_retained_appointment_book_title({}, messageOptions),
			body: m.account_deletion_retained_appointment_book_body({}, messageOptions),
			duration: m.account_deletion_retained_appointment_book_duration({}, messageOptions)
		},
		{
			id: 'tax-records',
			title: m.account_deletion_retained_tax_records_title({}, messageOptions),
			body: m.account_deletion_retained_tax_records_body({}, messageOptions),
			duration: m.account_deletion_retained_tax_records_duration({}, messageOptions)
		},
		{
			id: 'accounting',
			title: m.account_deletion_retained_accounting_title({}, messageOptions),
			body: m.account_deletion_retained_accounting_body({}, messageOptions),
			duration: m.account_deletion_retained_accounting_duration({}, messageOptions)
		},
		{
			id: 'archive',
			title: m.account_deletion_retained_archive_title({}, messageOptions),
			body: m.account_deletion_retained_archive_body({}, messageOptions),
			duration: m.account_deletion_retained_archive_duration({}, messageOptions)
		}
	]);
</script>

<section
	aria-labelledby="account-deletion-removed-title"
	class="rounded-panel border border-border/70 bg-card p-card"
>
	<h2
		id="account-deletion-removed-title"
		class="text-heading-md text-foreground md:text-heading-lg"
	>
		{m.account_deletion_removed_title({}, messageOptions)}
	</h2>
	<p class="mt-4 text-body-lg text-foreground">
		{m.account_deletion_removed_body({}, messageOptions)}
	</p>
	<p class="mt-3 text-body-md text-muted-foreground">
		{m.account_deletion_removed_doctor({}, messageOptions)}
	</p>
</section>

<section
	aria-labelledby="account-deletion-retained-title"
	class="rounded-panel border border-border/70 bg-card p-card"
>
	<h2
		id="account-deletion-retained-title"
		class="text-heading-md text-foreground md:text-heading-lg"
	>
		{m.account_deletion_retained_title({}, messageOptions)}
	</h2>
	<p class="mt-4 text-body-lg text-foreground">
		{m.account_deletion_retained_intro({}, messageOptions)}
	</p>
	<ul class="mt-6 flex flex-col gap-gutter">
		{#each retained as record (record.id)}
			<li class="flex flex-col gap-2 border-t border-border/70 pt-gutter">
				<h3 class="text-title-md text-foreground">{record.title}</h3>
				<p class="text-body-md text-muted-foreground">{record.body}</p>
				<p class="text-body-md font-medium text-foreground">{record.duration}</p>
			</li>
		{/each}
	</ul>
	<p class="mt-6 text-body-md text-muted-foreground">
		{m.account_deletion_retained_private({}, messageOptions)}
	</p>
	<p class="mt-3 text-body-md break-words text-foreground">
		{m.account_deletion_record_copy({ email: supportEmail }, messageOptions)}
	</p>
</section>
