<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { splitDuration } from '$modules/account/lib/deletion';
	import type { DeletionSupportProps, RetainedRecord } from '../types';

	let { messageOptions, supportEmail, headingClass }: DeletionSupportProps = $props();

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

<!-- 🔴 U-62.1 (the prototype 10, Π3; U-62.2 Ε1): «Τι σβήνεται αμέσως» and «Τι κρατάμε, γιατί και για πόσο» as H2s of
     the text — what is kept as five H3s (a list, not a table), each with its line and «Διάρκεια:» bold before the rest
     of the same words, a hairline above each. -->
<section aria-labelledby="deleted-at-once" data-slot="account-deletion-removed">
	<h2 id="deleted-at-once" class={headingClass}>
		{m.account_deletion_removed_title({}, messageOptions)}
	</h2>
	<p class="mb-4">{m.account_deletion_removed_body({}, messageOptions)}</p>
	<p>{m.account_deletion_removed_doctor({}, messageOptions)}</p>
</section>

<section aria-labelledby="what-we-keep" data-slot="account-deletion-retained">
	<h2 id="what-we-keep" class={headingClass}>
		{m.account_deletion_retained_title({}, messageOptions)}
	</h2>
	<p>{m.account_deletion_retained_intro({}, messageOptions)}</p>
	<ul class="mb-6">
		{#each retained as record (record.id)}
			{@const duration = splitDuration(record.duration)}
			<li class="mt-5 border-t border-border/60 pt-5">
				<h3 class="mb-2 text-title-sm text-foreground">{record.title}</h3>
				<p class="mb-2">{record.body}</p>
				<p class="text-body-md text-foreground/85">
					{#if duration.label}<strong class="font-semibold text-foreground">{duration.label}</strong
						>{/if}{duration.label ? ` ${duration.rest}` : duration.rest}
				</p>
			</li>
		{/each}
	</ul>
	<p class="mb-4">{m.account_deletion_retained_private({}, messageOptions)}</p>
	<p class="wrap-break-word">
		{m.account_deletion_record_copy({ email: supportEmail }, messageOptions)}
	</p>
</section>
